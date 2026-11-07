import {ChevronRight, Lock, LockOpen} from "lucide-react";
import {KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState} from "react";
import {useSpec} from "../context";
import {
    FormField,
    formFields,
    isFormType,
    isJsonType,
    Operation,
    Parameter,
    primaryType,
    ResponseInfo,
    sampleFromSchema,
    unwrapNullable,
} from "../openapi";
import {authProblem, buildRequest, cancelRequest, defaultDraft, exampleBody, removedFields, sendRequest, stringifyValue, tokenInfo, ValidationIssue, validationIssues} from "../request";
import {relogin} from "../session";
import {SNIPPETS} from "../snippets";
import {actions, apiStore, Draft, notify, prefsStore, sessionStore, updatePrefs} from "../state";
import {clamp, trackDrag} from "./Splitter";
import {useStore} from "../store";
import {copyText} from "../clipboard";
import {askText} from "./Dialogs";
import {JsonCode} from "./JsonCode";
import {Markdown} from "./Markdown";
import {ResponseView, statusClass} from "./ResponseView";
import {SchemaView} from "./SchemaView";
import {WaitingResponse} from "./SnakeLoader";
import {methodLabel} from "./Sidebar";
import {openAuthDialog} from "./AuthDialog";
import {openDropdown} from "./Menu";
import {TypeHint} from "./TypeInfo";
import {numberError, ValueInput} from "./ValueInput";

const SECTIONS: { in: Parameter["in"]; label: string }[] = [
    {in: "path", label: "Path parameters"},
    {in: "query", label: "Query parameters"},
    {in: "header", label: "Header parameters"},
    {in: "cookie", label: "Cookie parameters"},
];

function placeholderFor(schema: Record<string, unknown> | undefined, example?: unknown) {
    if (schema?.default !== undefined && schema.default !== null && schema.default !== "") return `${stringifyValue(schema.default)} (default)`;
    if (example !== undefined && example !== null) return stringifyValue(example);
    if (schema?.example !== undefined) return stringifyValue(schema.example);
    return primaryType(schema) === "array" ? "a, b, c" : "";
}

/** A grid-style property table: Parameter (name, type, description) | Value. */
function FieldTable({children}: { children: ReactNode }) {
    return (
        <div className="cf-grid is-fields">
            <div className="cf-grid-head"><span>Parameter</span><span>Value</span></div>
            {children}
        </div>
    );
}

/** "select one" / "select many" for enum inputs, so choices read differently from free text. */
function choiceHint(specRaw: Record<string, unknown>, schema: Record<string, unknown> | undefined): string | null {
    const resolved = unwrapNullable(specRaw, schema);
    if (!resolved) return null;
    if (Array.isArray(resolved.enum)) return `enum · select one of ${resolved.enum.length}`;
    if (primaryType(resolved) === "array") {
        const items = unwrapNullable(specRaw, resolved.items);
        if (Array.isArray(items?.enum)) return `enum · select any of ${items!.enum.length}`;
    }
    if (primaryType(resolved) === "boolean") return "true / false";
    return null;
}

function FieldRow({name, type, hint, required, description, error, children}: {
    name: string; type: ReactNode; hint?: string | null; required: boolean; description?: string; error?: string; children: ReactNode;
}) {
    return (
        <div className={`cf-grid-row ${error ? "has-error" : ""}`}>
            <span className="cf-grid-label">
                <span className="cf-grid-name" title={name}>
                    {name}{required && <span className="cf-req" title="required">*</span>}
                </span>
                <span className="cf-grid-type">{type}{hint && <span className="cf-grid-hint">{hint}</span>}</span>
                {description && <span className="cf-grid-desc">{description}</span>}
            </span>
            <span className="cf-grid-value">
                {children}
                {error && <span className="cf-field-error">{error}</span>}
            </span>
        </div>
    );
}

function Section({title, meta, right, children}: { title: string; meta?: ReactNode; right?: ReactNode; children: ReactNode }) {
    return (
        <section className="cf-section">
            <header className="cf-section-head">
                <span className="cf-section-title">{title}</span>
                {meta}
                <span className="cf-flex"/>
                {right}
            </header>
            {children}
        </section>
    );
}

function FormEditor({opKey, fields, draft, onChange, showErrors, errors}: {
    opKey: string;
    fields: FormField[];
    draft: Draft;
    onChange: (name: string, value: string) => void;
    showErrors: boolean;
    errors: Map<string, string>;
}) {
    const {spec} = useSpec();
    const files = useStore(sessionStore, (s) => s.files[opKey]);
    return (
        <FieldTable>
            {fields.map((field) => {
                const value = draft.form?.[field.name] ?? "";
                const selected = files?.[field.name] ?? [];
                const invalid = (showErrors && field.required && (field.isFile ? !selected.length : !value.trim())) || errors.has(`body:${field.name}`);
                return (
                    <FieldRow key={field.name} name={field.name} type={<TypeHint spec={spec.raw} schema={field.schema} description={field.description}/>}
                              hint={field.isFile ? "file" : choiceHint(spec.raw, field.schema)} required={field.required} description={field.description}
                              error={errors.get(`body:${field.name}`)}>
                        {field.isFile ? (
                            <label className={`cf-file ${invalid ? "is-invalid" : ""}`}>
                                <input type="file" multiple={field.multiple}
                                       onChange={(e) => actions.setFiles(opKey, field.name, [...(e.target.files ?? [])])}/>
                                <span>{selected.length ? selected.map((f) => f.name).join(", ") : field.multiple ? "Choose files…" : "Choose file…"}</span>
                            </label>
                        ) : (
                            <ValueInput value={value} schema={field.schema} invalid={invalid}
                                        placeholder={placeholderFor(field.schema)} onChange={(v) => onChange(field.name, v)}/>
                        )}
                    </FieldRow>
                );
            })}
        </FieldTable>
    );
}

/** Selects the whole text of an element, like an input does on double click / Ctrl+A. */
function selectAll(el: HTMLElement) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
}

function UrlPreview({baseUrl, op, draft, url}: { baseUrl: string; op: Operation; draft: Draft; url: string }) {
    const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    return (
        <>
            <span className="cf-url-base">{baseUrl.replace(/\/+$/, "")}</span>
            {op.path.split(/(\{[^}]+\})/).map((part, i) => {
                if (!part.startsWith("{")) return <span key={i}>{part}</span>;
                const value = draft.params[`path:${part.slice(1, -1)}`]?.trim();
                return value
                    ? <span key={i} className="cf-url-value">{value}</span>
                    : <span key={i} className="cf-url-missing">{part}</span>;
            })}
            {query && <span className="cf-url-query">{query}</span>}
        </>
    );
}

function ResponseDoc({response}: { response: ResponseInfo }) {
    const {spec} = useSpec();
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"example" | "schema">("example");
    const code = Number(response.status);
    const tone = Number.isNaN(code) ? "is-info" : statusClass(code);
    const example = useMemo(() => {
        if (!open || !response.schema) return "";
        const value = response.example !== undefined ? response.example : sampleFromSchema(spec.raw, response.schema);
        return JSON.stringify(value, null, 2);
    }, [open, response, spec.raw]);
    return (
        <div className={`cf-doc ${open ? "is-open" : ""}`}>
            <button className="cf-doc-head" onClick={() => setOpen(!open)} disabled={!response.schema}>
                {response.schema ? <ChevronRight size={12} className={`cf-chevron ${open ? "is-open" : ""}`}/> : <span className="cf-chevron-space"/>}
                <span className={`cf-status ${tone}`}>{response.status}</span>
                <span className={`cf-doc-desc ${tone}`}>{response.description}</span>
                {response.schema && <TypeHint spec={spec.raw} schema={response.schema} className="cf-doc-type"/>}
            </button>
            {open && response.schema && (
                <div className="cf-doc-body">
                    <div className="cf-seg">
                        <button className={mode === "example" ? "is-on" : ""} onClick={() => setMode("example")}>Example</button>
                        <button className={mode === "schema" ? "is-on" : ""} onClick={() => setMode("schema")}>Schema</button>
                    </div>
                    {mode === "example" ? <JsonCode value={example} readOnly fill/> : <SchemaView spec={spec.raw} schema={response.schema}/>}
                </div>
            )}
        </div>
    );
}

function SendButton({loading, onSend, onCancel, large}: { loading: boolean; onSend: () => void; onCancel: () => void; large?: boolean }) {
    return loading
        ? <button className={`cf-btn cf-send is-danger ${large ? "is-lg" : ""}`} onClick={onCancel}>Cancel</button>
        : <button className={`cf-btn cf-send is-primary ${large ? "is-lg" : ""}`} onClick={onSend} title="Send (Ctrl+Enter)">Send</button>;
}

const PARAM_LOCATIONS = new Set(["query", "path", "header", "cookie"]);

/** JSON path inside the request body an issue points at; APIs that drop the leading "body" are handled too. */
function bodyPath(issue: ValidationIssue, hasBody: boolean): (string | number)[] | null {
    const [where] = issue.loc;
    if (where === "body") return issue.loc.slice(1);
    if (hasBody && !PARAM_LOCATIONS.has(String(where))) return issue.loc;
    return null;
}

/** "application/json" with the subtype softly highlighted. */
function ContentType({value}: { value?: string }) {
    if (!value) return null;
    const [type, rest = ""] = value.split("/");
    const [sub, ...params] = rest.split(";");
    return (
        <span className="cf-ctype">
            <span className="cf-ctype-type">{type}/</span>
            <span className={`cf-ctype-sub ${/json/i.test(sub) ? "is-json" : /xml|html/i.test(sub) ? "is-xml" : /form/i.test(sub) ? "is-form" : ""}`}>{sub}</span>
            {params.length > 0 && <span className="cf-ctype-type">;{params.join(";")}</span>}
        </span>
    );
}

export function EndpointView({op}: { op: Operation }) {
    const {spec, baseUrl} = useSpec();
    const token = useStore(apiStore, (s) => s.token);
    const splitRatio = useStore(prefsStore, (s) => s.splitRatio);
    const descHeight = useStore(prefsStore, (s) => s.descHeight);
    const bodyRef = useRef<HTMLDivElement>(null);
    const infoRef = useRef<HTMLDivElement>(null);
    const favorite = useStore(apiStore, (s) => s.favorites.includes(op.key));
    const storedDraft = useStore(apiStore, (s) => s.drafts[op.key]);
    const files = useStore(sessionStore, (s) => s.files[op.key]);
    const response = useStore(sessionStore, (s) => s.responses[op.key]);
    const loading = useStore(sessionStore, (s) => !!s.loading[op.key]);

    const draft = useMemo(() => storedDraft ?? defaultDraft(spec, op, apiStore.get().paramMemory), [storedDraft, spec, op]);
    const [showSchema, setShowSchema] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const requestPanel = useRef<HTMLDivElement>(null);
    const sent = useRef(false);
    const [descOpen, setDescOpen] = useState(true);
    const [responseTab, setResponseTab] = useState<"response" | "docs">(response ? "response" : "docs");

    useEffect(() => {
        setResponseTab(response || loading ? "response" : "docs");
    }, [response, loading]);

    const tokenLabel = useStore(apiStore, (s) => s.tokenLabel);
    const tokenExpired = !!token && tokenInfo(token).state === "expired";
    const tokenWho = token ? tokenInfo(token, tokenLabel).name : "";
    const templates = useStore(apiStore, (s) => s.templates[op.key]);

    // 422 validation errors mapped back to the inputs that caused them
    const issues = useMemo(() => (response ? validationIssues(response.status, response.bodyText) : []), [response]);
    const fieldErrors = useMemo(() => {
        const map = new Map<string, string>();
        for (const issue of issues) {
            const [where, name] = issue.loc;
            if (typeof where === "string" && name !== undefined && issue.loc.length === 2) map.set(`${where}:${name}`, issue.msg);
        }
        return map;
    }, [issues]);
    const bodyMarks = useMemo(
        () => issues.map((i) => bodyPath(i, !!op.requestBody)).filter((p): p is (string | number)[] => !!p && p.length > 0),
        [issues, op.requestBody],
    );
    const update = (patch: Partial<Draft>) => actions.setDraft(op.key, {...draft, ...patch});
    const built = useMemo(() => buildRequest(spec, op, draft, {baseUrl, token, files}), [spec, op, draft, baseUrl, token, files]);

    const contentType = draft.contentType;
    const media = contentType ? op.requestBody?.content[contentType] : undefined;
    const isForm = isFormType(contentType);
    const removed = useMemo(() => (isJsonType(contentType) ? removedFields(draft.body ?? "", exampleBody(spec, op, contentType)) : []), [draft.body, contentType, spec, op]);
    const fields = useMemo(() => (isForm ? formFields(spec.raw, media?.schema) : []), [isForm, media, spec.raw]);

    /** Puts the cursor in the first input marked invalid, once the render that marks it is on screen. */
    const focusInvalid = () => requestAnimationFrame(() => {
        const field = requestPanel.current?.querySelector<HTMLElement>(".is-invalid");
        const input = field?.matches("input, select") ? field : field?.querySelector<HTMLElement>("input, select, button, .cm-content");
        input?.focus();
        field?.scrollIntoView({block: "nearest"});
    });

    // Rejected by the server (422): same as an input rejected here, but only right after sending.
    useEffect(() => {
        if (!sent.current || loading || !response) return;
        sent.current = false;
        if (fieldErrors.size) focusInvalid();
    }, [response, loading, fieldErrors]);

    const send = async (tokenOverride?: string, attempt = 0) => {
        if (loading && attempt === 0) return;
        actions.pinTab(op.key);
        let request = tokenOverride !== undefined ? buildRequest(spec, op, draft, {baseUrl, token: tokenOverride, files}) : built;
        if (request.missing.length) {
            setShowErrors(true);
            notify(`Required: ${request.missing.join(", ")}`, "err");
            focusInvalid();
            return;
        }
        if (request.jsonError) {
            notify(`Request body is not valid JSON: ${request.jsonError}`, "err");
            focusInvalid();
            return;
        }
        const badNumber = op.parameters
            .map((p) => ({p, error: numberError(unwrapNullable(spec.raw, p.schema), draft.params[`${p.in}:${p.name}`] ?? "")}))
            .find((x) => x.error);
        if (badNumber) {
            setShowErrors(true);
            notify(`${badNumber.p.name}: ${badNumber.error}`, "err");
            focusInvalid();
            return;
        }
        sent.current = true;
        actions.setLoading(op.key, true);
        const state = apiStore.get();
        const canRelogin = op.secured && !!state.login && state.autoRelogin && state.login.opKey !== op.key;
        // expired (or missing) token and a remembered login: sign in again first
        const current = tokenOverride ?? state.token;
        if (canRelogin && attempt === 0 && (!current || tokenInfo(current).state === "expired")) {
            const fresh = await relogin(spec);
            if (fresh) request = buildRequest(spec, op, draft, {baseUrl, token: fresh, files});
        }
        const result = await sendRequest(op.key, request);
        actions.setLoading(op.key, false);
        actions.setResponse(op.key, result);
        actions.pushHistory({key: op.key, status: result.status, ms: result.ms, at: result.at});
        const problem = authProblem(result.status, result.bodyText);
        if (!problem || attempt > 0) return;
        // rejected: renew through the remembered login once; otherwise the response shows a token quick pick
        if (canRelogin) {
            const fresh = await relogin(spec);
            if (fresh) return send(fresh, 1);
        }
        setResponseTab("response");
    };

    const saveTemplate = async (initial?: string) => {
        const name = await askText({title: "Save as template", label: `Name for this set of inputs (${op.method.toUpperCase()} ${op.path})`, initial, confirm: "Save"});
        if (!name) return;
        actions.saveTemplate(op.key, name, structuredClone(draft));
        notify(`Template "${name}" saved`, "ok");
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void send();
        }
    };

    const formatBody = () => {
        try {
            update({body: JSON.stringify(JSON.parse(draft.body ?? ""), null, 2)});
        } catch (error) {
            notify(`Invalid JSON: ${(error as Error).message}`, "err");
        }
    };

    const headers = draft.headers ?? [];
    const description = op.description && op.description !== op.summary ? op.description.trim() : "";
    const longDescription = description.length > 160 || description.includes("\n");
    const hasInputs = op.parameters.length > 0 || !!op.requestBody;

    // Request | Response splitter
    const splitColumns = (ratio: number) => ({"--cf-left": `${ratio}fr`, "--cf-right": `${1 - ratio}fr`});
    const dragSplit = (e: React.MouseEvent) => {
        const el = bodyRef.current;
        if (!el) return;
        const width = el.clientWidth;
        let ratio = splitRatio;
        trackDrag(e, "col-resize", (dx) => {
            ratio = clamp(splitRatio + dx / width, 0.2, 0.8);
            Object.entries(splitColumns(ratio)).forEach(([k, v]) => el.style.setProperty(k, v));
        }, () => updatePrefs({splitRatio: Math.round(ratio * 1000) / 1000}));
    };

    // description | panes splitter: sets the max height of the open description
    const dragDesc = (e: React.MouseEvent) => {
        const info = infoRef.current;
        const desc = info?.querySelector<HTMLElement>(".cf-info-desc");
        if (!info || !desc) return;
        const start = desc.getBoundingClientRect().height;
        let height = start;
        trackDrag(e, "row-resize", (_dx, dy) => {
            height = clamp(start + dy, 40, window.innerHeight * 0.7);
            info.style.setProperty("--cf-desc-max", `${height}px`);
        }, () => updatePrefs({descHeight: Math.round(height)}));
    };

    return (
        <div className="cf-ep" onKeyDown={onKeyDown}>
            <div className="cf-toolbar">
                <span className={`cf-method m-${op.method}`}>{methodLabel(op.method)}</span>
                <div className="cf-url" title={built.url} tabIndex={0}
                     onMouseDown={(e) => {
                         // the second press of a double click selects the whole URL instead of one word
                         if (e.detail !== 2) return;
                         e.preventDefault();
                         selectAll(e.currentTarget);
                     }}
                     onKeyDown={(e) => {
                         if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                             e.preventDefault();
                             selectAll(e.currentTarget);
                         }
                     }}>
                    <UrlPreview baseUrl={baseUrl} op={op} draft={draft} url={built.url}/>
                </div>
                <SendButton loading={loading} onSend={() => void send()} onCancel={() => cancelRequest(op.key)} large/>
                <button className="cf-btn cf-more" title="More actions" onClick={(e) => openDropdown([
                    {label: "Copy URL", onSelect: () => void copyText(built.url).then((ok) => ok && notify("URL copied", "ok"))},
                    {label: "Copy path", onSelect: () => void copyText(op.path).then((ok) => ok && notify("Path copied", "ok"))},
                    ...SNIPPETS.map((snippet, i) => ({
                        label: `Copy as ${snippet.label}`,
                        separator: i === 0,
                        onSelect: () => void copyText(snippet.build(built)).then((ok) => ok && notify(`${snippet.label} copied`, "ok")),
                    })),
                    {label: "Save as template…", separator: true, onSelect: () => void saveTemplate()},
                    {label: favorite ? "Remove from favorites" : "Add to favorites", separator: true, onSelect: () => actions.toggleFavorite(op.key)},
                    {label: "Reset request", danger: true, separator: true, onSelect: () => actions.resetDraft(op.key)},
                ], e.currentTarget)}>⋯</button>
            </div>

            <div className="cf-info" ref={infoRef} style={descHeight ? {"--cf-desc-max": `${descHeight}px`} as React.CSSProperties : undefined}>
                <div className="cf-info-line">
                    <span className="cf-info-title">{op.summary || op.path}</span>
                    {op.deprecated && <span className="cf-flag is-warn">deprecated</span>}
                    <span className="cf-flex"/>
                    {op.secured && (
                        <button
                            className={`cf-flag cf-auth-flag ${!token ? "is-warn" : tokenExpired ? "is-err" : "is-ok"}`}
                            title={token ? `Sent with the token of ${tokenWho}${tokenLabel && tokenLabel !== tokenWho ? ` (${tokenLabel})` : ""}. Click to switch.` : "Click to choose a token"}
                            onClick={() => openAuthDialog()}
                        >
                            {token ? <Lock size={12} strokeWidth={2.25}/> : <LockOpen size={12} strokeWidth={2.25}/>}
                            {!token ? "requires token" : tokenExpired ? <>token expired · <b>{tokenWho}</b></> : <>authorized as <b>{tokenWho}</b></>}
                        </button>
                    )}
                    <button className={`cf-text-btn ${favorite ? "is-fav" : ""}`} onClick={() => actions.toggleFavorite(op.key)}>
                        {favorite ? "★ Favorite" : "☆ Add to favorites"}
                    </button>
                </div>
                {description && (
                    <div className={`cf-info-desc cf-md ${descOpen ? "is-open" : ""} ${longDescription ? "is-long" : ""}`} onClick={(e) => {
                        // ignore clicks that select text or hit the scrollbar
                        const el = e.currentTarget;
                        if (!longDescription || (e.target as HTMLElement).closest("a") || String(window.getSelection() ?? "") || e.nativeEvent.offsetX > el.clientWidth) return;
                        setDescOpen(!descOpen);
                    }}>
                        <Markdown source={description}/>
                    </div>
                )}
                {description && descOpen && (
                    <div className="cf-splitter is-row" title="Drag to resize the description · double click to reset"
                         onMouseDown={dragDesc}
                         onDoubleClick={() => {
                             infoRef.current?.style.removeProperty("--cf-desc-max");
                             updatePrefs({descHeight: 0});
                         }}/>
                )}
            </div>

            <div className="cf-ep-body" ref={bodyRef} style={splitColumns(splitRatio) as React.CSSProperties}>
                <div className="cf-panel">
                    <div className="cf-panel-head">
                        <span className="cf-panel-title">Request</span>
                        <span className="cf-flex"/>
                        <button className="cf-text-btn" title="Saved sets of inputs for this endpoint" onClick={(e) => openDropdown([
                            ...(templates ?? []).map((t) => ({label: t.name, hint: "apply", onSelect: () => actions.applyTemplate(op.key, t.name)})),
                            {label: "Save current inputs as template…", separator: !!templates?.length, onSelect: () => void saveTemplate()},
                            ...(templates ?? []).map((t, i) => ({
                                label: `Delete "${t.name}"`, danger: true, separator: i === 0,
                                onSelect: () => actions.deleteTemplate(op.key, t.name),
                            })),
                        ], e.currentTarget)}>
                            Templates{templates?.length ? ` (${templates.length})` : ""} ▾
                        </button>
                        <button className="cf-text-btn" onClick={() => {
                            actions.resetDraft(op.key);
                            setShowErrors(false);
                        }}>Reset</button>
                    </div>
                    <div className="cf-panel-scroll" ref={requestPanel}>
                        {!hasInputs && <div className="cf-placeholder is-row">This endpoint takes no parameters.</div>}

                        {SECTIONS.map(({in: location, label}) => {
                            const params = op.parameters.filter((p) => p.in === location);
                            if (!params.length) return null;
                            return (
                                <Section key={location} title={label}>
                                    <FieldTable>
                                        {[...params].sort((a, b) => Number(b.required) - Number(a.required)).map((param) => {
                                            const id = `${param.in}:${param.name}`;
                                            const value = draft.params[id] ?? "";
                                            const schema = unwrapNullable(spec.raw, param.schema);
                                            return (
                                                <FieldRow key={id} name={param.name} type={<TypeHint spec={spec.raw} schema={param.schema} description={param.description}/>}
                                                          hint={choiceHint(spec.raw, param.schema)} required={param.required} description={param.description}
                                                          error={fieldErrors.get(id)}>
                                                    <ValueInput
                                                        value={value}
                                                        schema={schema}
                                                        invalid={(showErrors && param.required && !value.trim()) || fieldErrors.has(id)}
                                                        placeholder={placeholderFor(schema, param.example)}
                                                        onEnter={() => void send()}
                                                        onChange={(v) => {
                                                            update({params: {...draft.params, [id]: v}});
                                                            if (param.in === "path" || param.in === "header") actions.rememberParam(param.name, v);
                                                        }}
                                                    />
                                                </FieldRow>
                                            );
                                        })}
                                    </FieldTable>
                                </Section>
                            );
                        })}

                        {op.requestBody && (
                            <Section
                                title={op.requestBody.required ? "Request body *" : "Request body"}
                                meta={op.requestBody.contentTypes.length > 1 ? (
                                    <select className="cf-select-inline" value={contentType}
                                            onChange={(e) => update({contentType: e.target.value, body: exampleBody(spec, op, e.target.value)})}>
                                        {op.requestBody.contentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                ) : (
                                    <ContentType value={contentType}/>
                                )}
                                right={
                                    <>
                                        {!isForm && <button className="cf-text-btn" onClick={() => update({body: exampleBody(spec, op, contentType)})}>Example</button>}
                                        {!isForm && isJsonType(contentType) && <button className="cf-text-btn" onClick={formatBody}>Format</button>}
                                        {media?.schema && (
                                            <button className={`cf-text-btn ${showSchema ? "is-active" : ""}`} onClick={() => setShowSchema(!showSchema)}>Schema</button>
                                        )}
                                    </>
                                }
                            >
                                {isForm ? (
                                    <FormEditor opKey={op.key} fields={fields} draft={draft} showErrors={showErrors} errors={fieldErrors}
                                                onChange={(name, value) => update({form: {...draft.form, [name]: value}})}/>
                                ) : (
                                    <JsonCode value={draft.body ?? ""} language={isJsonType(contentType) ? "json" : "text"} invalid={!!built.jsonError || (showErrors && built.missing.includes("body"))}
                                              marks={bodyMarks} maxHeight={520} minHeight={160}
                                              onChange={(body) => update({body})} onSubmit={() => void send()}/>
                                )}
                                {built.jsonError && <div className="cf-inline-error">{built.jsonError}</div>}
                                {showSchema && media?.schema && <SchemaView spec={spec.raw} schema={media.schema}/>}
                            </Section>
                        )}

                        {hasInputs && (
                            <div className="cf-send-row">
                                {removed.length > 0 && (
                                    <span className="cf-body-note" title={`Removed: ${removed.join(", ")}`}>
                                        {removed.length} {removed.length === 1 ? "field" : "fields"} removed
                                        <button className="cf-text-btn" onClick={() => update({body: exampleBody(spec, op, contentType)})}>Reset to default</button>
                                    </span>
                                )}
                                <span className="cf-send-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
                                <SendButton loading={loading} onSend={() => void send()} onCancel={() => cancelRequest(op.key)}/>
                            </div>
                        )}

                        <Section
                            title="Custom headers"
                            right={<button className="cf-text-btn" onClick={() => update({headers: [...headers, {key: "", value: ""}]})}>Add header</button>}
                        >
                            {headers.length ? (
                                <div className="cf-grid">
                                    <div className="cf-grid-head is-headers"><span>Header</span><span>Value</span><span/></div>
                                    {headers.map((row, index) => (
                                        <div key={index} className="cf-grid-row is-headers">
                                            <input className="cf-input" placeholder="Name" value={row.key} spellCheck={false}
                                                   onChange={(e) => update({headers: headers.map((r, i) => i === index ? {...r, key: e.target.value} : r)})}/>
                                            <input className="cf-input" placeholder="Value" value={row.value} spellCheck={false}
                                                   onChange={(e) => update({headers: headers.map((r, i) => i === index ? {...r, value: e.target.value} : r)})}/>
                                            <button className="cf-text-btn is-danger" onClick={() => update({headers: headers.filter((_, i) => i !== index)})}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="cf-placeholder">None{token && op.secured ? ". The Authorization header is added automatically." : "."}</div>
                            )}
                        </Section>
                    </div>
                </div>

                <div className="cf-splitter is-col" title="Drag to resize Request / Response · double click to reset"
                     onMouseDown={dragSplit}
                     onDoubleClick={() => updatePrefs({splitRatio: 0.5})}/>
                <div className="cf-panel">
                    <div className="cf-panel-head is-tabs">
                        <button className={`cf-panel-tab ${responseTab === "response" ? "is-active" : ""}`} onClick={() => setResponseTab("response")}>Response</button>
                        <button className={`cf-panel-tab ${responseTab === "docs" ? "is-active" : ""}`} onClick={() => setResponseTab("docs")}>
                            Documented ({op.responses.length})
                        </button>
                    </div>
                    <div className={`cf-panel-scroll ${responseTab === "response" && (response || loading) ? "is-fixed" : ""}`}>
                        {responseTab === "response" && (
                            response ? <ResponseView opKey={op.key} response={response} loading={loading} onRetry={(t) => void send(t, 1)}/>
                                : loading ? <WaitingResponse/>
                                    : <div className="cf-placeholder is-row">No response yet. Press Send or Ctrl+Enter.</div>
                        )}
                        {responseTab === "docs" && (
                            op.responses.length
                                ? <div className="cf-docs">{op.responses.map((r) => <ResponseDoc key={r.status} response={r}/>)}</div>
                                : <div className="cf-placeholder is-row">No documented responses.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
