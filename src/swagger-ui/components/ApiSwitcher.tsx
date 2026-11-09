import {ArrowDown, ArrowUp, ChevronDown, ChevronUp} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {ApiEnv, apisActions, apisStore, currentDocsUrl, envsFromRecords, findEnv, hostOf, newEnv, normalizeDocsUrl, openDocs, renameForKind, SavedApi, shortUrl, suggestName, switchApi} from "../apis";
import {useSpec} from "../context";
import {actions, apiStore, attachToApi, EnvKind, KIND_LABEL, KIND_SHORT, newId, notify} from "../state";
import {createStore, useStore} from "../store";
import {askText} from "./Dialogs";
import {MenuItem, MenuLink, openMenu, updateMenu} from "./Menu";

// ---------------------------------------------------------------------------
// Dialog state

/** "tree" is the one table of APIs and environments; `add` opens it with a new API / environment row. */
type Dialog = { kind: "save" } | { kind: "tree"; apiId?: string; add?: "api" | "env" };
const dialogStore = createStore<{ dialog: Dialog | null }>({dialog: null});
const show = (dialog: Dialog) => dialogStore.set({dialog});
const closeDialog = () => dialogStore.set({dialog: null});

export const openSaveApi = () => show({kind: "save"});
export const openAddApi = () => show({kind: "tree", add: "api"});
export const openApiManager = () => show({kind: "tree"});
/** Environments of the API on screen; an unsaved page is offered to be saved first. */
export function openEnvManager() {
    const page = findEnv(apisStore.get().apis, currentDocsUrl());
    show(page ? {kind: "tree", apiId: page.api.id} : {kind: "save"});
}

/** The saved API and environment of this page (null while the page is not saved). */
export function usePage() {
    const apis = useStore(apisStore, (s) => s.apis);
    return useMemo(() => findEnv(apis, currentDocsUrl()), [apis]);
}

const KINDS = Object.keys(KIND_LABEL) as EnvKind[];

/** Name of a new environment: its type, plus the host when the API already has one of that type. */
function envName(api: SavedApi | undefined, kind: EnvKind, docsUrl: string) {
    return api?.envs.some((e) => e.kind === kind) ? `${KIND_LABEL[kind]} (${hostOf(docsUrl)})` : KIND_LABEL[kind];
}

/**
 * The environments of an API as links in the API menu ("Dev · Prod"): one click opens that environment.
 * Types that occur more than once are numbered (Prod 1, Prod 2).
 */
function envLinks(api: SavedApi, currentEnvId?: string): MenuLink[] {
    return api.envs.map((env) => {
        const same = api.envs.filter((e) => e.kind === env.kind);
        const label = same.length > 1 ? `${KIND_SHORT[env.kind]} ${same.indexOf(env) + 1}` : KIND_SHORT[env.kind];
        return {label, title: `${api.name} · ${env.name} (${hostOf(env.docsUrl)})`, active: env.id === currentEnvId, onClick: () => void openDocs(env.docsUrl)};
    });
}

/** First environment type the API does not have yet (Development for a new API). */
function nextKind(api?: SavedApi): EnvKind {
    return KINDS.find((k) => !api?.envs.some((e) => e.kind === k)) ?? "local";
}

/** "Not now" on the first-visit question: asked again in a new browser session. */
const LATER_KEY = "cookify:api-save-later";

function askedLater() {
    try {
        return sessionStorage.getItem(LATER_KEY) === currentDocsUrl();
    } catch {
        return false;
    }
}

/** Saves this page as an environment of a new or an existing API and switches to that API's state. */
async function savePage(target: { name: string; title: string } | { apiId: string }, kind: EnvKind) {
    const here = currentDocsUrl();
    if ("apiId" in target) {
        const api = apisStore.get().apis.find((a) => a.id === target.apiId);
        if (!api) return;
        const env = newEnv(kind, here, envName(api, kind, here));
        apisActions.addEnvs(api.id, [env]);
        await attachToApi({apiId: api.id, envId: env.id}, false);
        apisActions.visited(api.id, env.id, here);
        notify(`Added to ${api.name} as ${env.name}`, "ok");
    } else {
        const env = newEnv(kind, here);
        const api = apisActions.create(target.name, env, target.title);
        const others = await attachToApi({apiId: api.id, envId: env.id}, true);
        if (others.length) apisActions.addEnvs(api.id, envsFromRecords(others));
        notify(`"${api.name}" saved with ${env.name}`, "ok");
    }
}

async function changeServer(current: string) {
    const url = await askText({title: "Server URL", label: "Requests of this environment go to this address instead of the documented server", initial: current, confirm: "Use"});
    if (url) actions.setBaseUrl(url.replace(/\/+$/, ""));
}

// ---------------------------------------------------------------------------
// Header fields

/** Header "API" field: the API on screen; its menu switches to, adds and manages saved APIs. */
export function ApiSwitcher() {
    const {spec} = useSpec();
    const page = usePage();
    const menuItems = (): MenuItem[] => {
        const apis = apisStore.get().apis;
        const move = (id: string, by: number) => {
            apisActions.move(id, by);
            updateMenu(menuItems());
        };
        return [
            ...apis.map((api, index) => ({
                prefix: `${index + 1})`,
                label: api.name,
                active: api.id === page?.api.id,
                links: envLinks(api, page?.env.id),
                onSelect: () => switchApi(api),
                side: apis.length > 1 ? [
                    {icon: <ArrowUp size={13}/>, title: "Move up", disabled: index === 0, onClick: () => move(api.id, -1)},
                    {icon: <ArrowDown size={13}/>, title: "Move down", disabled: index === apis.length - 1, onClick: () => move(api.id, 1)},
                ] : undefined,
            })),
            ...(!page ? [{label: "Save this API…", separator: apis.length > 0, onSelect: openSaveApi}] : []),
            {label: "Add API…", separator: !!page && apis.length > 0, onSelect: openAddApi},
            ...(apis.length ? [{label: "Manage APIs…", onSelect: openApiManager}] : []),
        ];
    };
    return (
        <span className="cf-field">
            <span className="cf-base-label">API</span>
            <button
                className="cf-api-switch"
                title={`${page?.api.name ?? spec.title}
Switch between your APIs, or add a new one`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    openMenu({x: rect.left, y: rect.bottom + 2, items: menuItems()}, e.currentTarget);
                }}
            >
                <span className="cf-title-text">{page?.api.name ?? spec.title}</span>
                <span className="cf-env-caret">▾</span>
            </button>
        </span>
    );
}

/**
 * Header "Environment" field: the environments of the API on screen. Each one is a Swagger page of its
 * own (localhost:8000/docs, api.example.com/docs …); choosing one opens that page.
 */
export function EnvSwitcher() {
    const {spec, baseUrl} = useSpec();
    const storedBaseUrl = useStore(apiStore, (s) => s.baseUrl);
    const page = usePage();
    const overridden = !!storedBaseUrl && storedBaseUrl !== spec.servers[0];
    const serverItems = [
        {label: "Change server URL…", separator: true, onSelect: () => void changeServer(baseUrl)},
        ...(overridden ? [{label: "Use the documented server", hint: hostOf(spec.servers[0]), onSelect: () => actions.setBaseUrl("")}] : []),
    ];
    const env = page?.env;
    return (
        <span className="cf-field">
            <span className="cf-base-label">Environment</span>
            <button
                className={`cf-env ${env ? `is-${env.kind}` : "is-none"}`}
                title={`Requests go to ${baseUrl}`}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    openMenu({
                        x: rect.left,
                        y: rect.bottom + 2,
                        items: page
                            ? [
                                ...page.api.envs.map((item) => ({
                                    label: `${item.id === env?.id ? "● " : "   "}${item.name}`,
                                    hint: hostOf(item.docsUrl),
                                    onSelect: () => void openDocs(item.docsUrl),
                                })),
                                {label: "Add environment…", separator: true, onSelect: () => show({kind: "tree", apiId: page.api.id, add: "env"})},
                                {label: "Manage environments…", onSelect: () => show({kind: "tree", apiId: page.api.id})},
                                ...serverItems,
                            ]
                            : [{label: "Save this API to set up environments…", onSelect: openSaveApi}, ...serverItems],
                    }, e.currentTarget);
                }}
            >
                {env && <span className="cf-env-kind">{KIND_SHORT[env.kind]}</span>}
                {env && env.name !== KIND_LABEL[env.kind] && <span className="cf-env-name">{env.name}</span>}
                <span className="cf-env-server">{hostOf(baseUrl)}</span>
                <span className="cf-env-caret">▾</span>
            </button>
        </span>
    );
}

// ---------------------------------------------------------------------------
// Dialog pieces

function KindPicker({value, onChange}: { value: EnvKind; onChange: (kind: EnvKind) => void }) {
    return (
        <span className="cf-seg is-env" role="radiogroup" aria-label="Environment">
            {KINDS.map((kind) => (
                <button key={kind} role="radio" aria-checked={value === kind} className={`${value === kind ? "is-on" : ""} is-${kind}`} onClick={() => onChange(kind)}>
                    {KIND_LABEL[kind]}
                </button>
            ))}
        </span>
    );
}

function Modal({title, onClose, wide, children, actions: buttons}: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode; actions: React.ReactNode }) {
    return (
        <div className="cf-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`cf-modal ${wide ? "is-wide" : "is-small"}`} role="dialog" aria-label={title} onKeyDown={(e) => e.key === "Escape" && onClose()}>
                <div className="cf-modal-head">
                    <span className="cf-modal-title">{title}</span>
                    <span className="cf-flex"/>
                    <button className="cf-modal-close" onClick={onClose} title="Close (Esc)">×</button>
                </div>
                <div className="cf-modal-body">{children}</div>
                <div className="cf-modal-actions">{buttons}</div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// First visit / "Save this API…"

function SaveApiDialog() {
    const {spec} = useSpec();
    const here = currentDocsUrl();
    const apis = useStore(apisStore, (s) => s.apis);
    const sameTitle = apis.find((a) => a.title && a.title === spec.title);
    const [mode, setMode] = useState<"new" | "existing">(sameTitle ? "existing" : "new");
    const [name, setName] = useState(() => suggestName(spec.title, here));
    const [apiId, setApiId] = useState(sameTitle?.id ?? apis[0]?.id ?? "");
    const target = apis.find((a) => a.id === apiId);
    const [kind, setKind] = useState<EnvKind>(() => (sameTitle ? nextKind(sameTitle) : "local"));
    const [busy, setBusy] = useState(false);

    const later = () => {
        try {
            sessionStorage.setItem(LATER_KEY, here);
        } catch {
            // ignore
        }
        closeDialog();
    };
    const save = async () => {
        if (busy) return;
        setBusy(true);
        await savePage(mode === "existing" && target ? {apiId: target.id} : {name: name.trim() || suggestName(spec.title, here), title: spec.title}, kind);
        closeDialog();
    };
    return (
        <Modal title="Save this API?" onClose={later} actions={<>
            <button className="cf-btn" onClick={later} title="Ask again in a new browser session">Not now</button>
            <button className="cf-btn is-primary" disabled={busy || (mode === "existing" && !target)} onClick={() => void save()}>Save</button>
        </>}>
            <div className="cf-form">
                <span className="cf-modal-label">Swagger</span>
                <span className="cf-form-static" title={here}>{here}</span>
                {apis.length > 0 && (
                    <>
                        <span className="cf-modal-label">Save as</span>
                        <span className="cf-seg" role="radiogroup">
                            <button className={mode === "new" ? "is-on" : ""} onClick={() => setMode("new")}>New API</button>
                            <button className={mode === "existing" ? "is-on" : ""} onClick={() => {
                                setMode("existing");
                                setKind(nextKind(target));
                            }}>Environment of an API</button>
                        </span>
                    </>
                )}
                {mode === "new" || !apis.length ? (
                    <>
                        <label className="cf-modal-label" htmlFor="cf-api-name">Name</label>
                        <input id="cf-api-name" className="cf-input" autoFocus value={name} spellCheck={false}
                               onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void save()}/>
                    </>
                ) : (
                    <>
                        <label className="cf-modal-label" htmlFor="cf-api-pick">API</label>
                        <select id="cf-api-pick" className="cf-select-inline" value={apiId} onChange={(e) => {
                            setApiId(e.target.value);
                            setKind(nextKind(apis.find((a) => a.id === e.target.value)));
                        }}>
                            {apis.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.envs.map((env) => env.name).join(", ")})</option>)}
                        </select>
                    </>
                )}
                <span className="cf-modal-label">Environment</span>
                <KindPicker value={kind} onChange={setKind}/>
                <span className="cf-form-note">
                    {mode === "existing" && target
                        ? <>This page becomes the <b>{envName(target, kind, here)}</b> environment of {target.name}; favorites and tabs are shared with its other environments.</>
                        : <>Other environments (e.g. production at another address) can be added later from the Environment menu.</>}
                </span>
            </div>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// APIs and their environments in one table. Each API row has its environments (Development, Staging,
// Production …) indented below it; APIs and environments are added and edited right here.

type EditEnv = ApiEnv & { input: string };
type EditApi = Omit<SavedApi, "envs"> & { envs: EditEnv[]; isNew?: boolean };

function ApiTree({onlyApiId, add}: { onlyApiId?: string; add?: "api" | "env" }) {
    const {spec} = useSpec();
    const page = usePage();
    const here = currentDocsUrl();
    // A new row starts with this page's address while the page is not saved (or typed in) yet.
    const freshInput = (list: EditApi[]) => (page || findEnv(list.map(toSaved), here) ? "" : shortUrl(here));
    const [initial] = useState(() => {
        const list: EditApi[] = apisStore.get().apis.map((a) => ({...a, envs: a.envs.map((e) => ({...e, input: shortUrl(e.docsUrl)}))}));
        if (add === "api") {
            const input = freshInput(list);
            const row = blankApi(input ? spec.title : "", input);
            return {rows: [...list, row], focus: row.id};
        }
        const target = list.find((a) => a.id === onlyApiId);
        if (add === "env" && target) {
            const env = blankEnv(target, freshInput(list));
            return {rows: list.map((a) => (a === target ? {...a, envs: [...a.envs, env]} : a)), focus: env.id};
        }
        return {rows: list, focus: ""};
    });
    const [rows, setRows] = useState<EditApi[]>(initial.rows);
    const [focusId, setFocusId] = useState(initial.focus);
    const [error, setError] = useState("");
    const shown = onlyApiId ? rows.filter((r) => r.id === onlyApiId) : rows;
    const title = onlyApiId ? `${shown[0]?.name ?? "API"} · environments` : "APIs and environments";

    const patchApi = (id: string, change: (api: EditApi) => EditApi) => {
        setError("");
        setRows((list) => list.map((a) => (a.id === id ? change(a) : a)));
    };
    const patchEnv = (apiId: string, envId: string, change: Partial<EditEnv>) =>
        patchApi(apiId, (a) => ({...a, envs: a.envs.map((e) => (e.id === envId ? {...e, ...change} : e))}));
    const move = (index: number, by: number) => setRows((list) => {
        const next = [...list];
        const [row] = next.splice(index, 1);
        next.splice(index + by, 0, row);
        return next;
    });
    const addApi = () => {
        const input = freshInput(rows);
        const row = blankApi(input ? spec.title : "", input);
        setRows((list) => [...list, row]);
        setFocusId(row.id);
    };
    const addEnv = (api: EditApi) => {
        const env = blankEnv(api, freshInput(rows));
        patchApi(api.id, (a) => ({...a, envs: [...a.envs, env]}));
        setFocusId(env.id);
    };

    const save = async () => {
        const seen = new Map<string, string>();
        const apis: SavedApi[] = [];
        for (const row of rows) {
            const envs: ApiEnv[] = [];
            for (const env of row.envs) {
                const label = `${row.name || "API"} · ${env.name || KIND_LABEL[env.kind]}`;
                const docsUrl = normalizeDocsUrl(env.input);
                if (!docsUrl) {
                    if (!env.input.trim() && row.envs.length > 1) continue; // an empty extra row is dropped
                    setFocusId(env.id);
                    return setError(`${label}: enter its Swagger URL`);
                }
                if (seen.has(docsUrl)) return setError(`${shortUrl(docsUrl)} is used by ${seen.get(docsUrl)} and ${label}`);
                seen.set(docsUrl, label);
                envs.push({id: env.id, kind: env.kind, name: env.name.trim() || KIND_LABEL[env.kind], docsUrl});
            }
            if (!envs.length) continue;
            apis.push({
                id: row.id, name: row.name.trim() || hostOf(envs[0].docsUrl), title: row.title ?? (envs.some((e) => e.docsUrl === here) ? spec.title : undefined),
                envs, lastEnv: envs.some((e) => e.id === row.lastEnv) ? row.lastEnv : envs[0].id, addedAt: row.addedAt,
            });
        }
        apisActions.replace(apis);
        closeDialog();
        // This page was just added: switch it to its API's shared state.
        const target = !page && findEnv(apis, here);
        if (target) {
            const isNew = !!rows.find((r) => r.id === target.api.id)?.isNew;
            const others = await attachToApi({apiId: target.api.id, envId: target.env.id}, isNew);
            if (others.length) apisActions.addEnvs(target.api.id, envsFromRecords(others));
            notify(`This page is now ${target.api.name} · ${target.env.name}`, "ok");
        }
    };

    return (
        <Modal title={title} wide onClose={closeDialog} actions={<>
            {error && <span className="cf-form-error cf-flex">{error}</span>}
            <button className="cf-btn" onClick={closeDialog}>Cancel</button>
            <button className="cf-btn is-primary" onClick={() => void save()}>Save</button>
        </>}>
            <div className="cf-tree">
                <div className="cf-tree-row is-head"><span>Name</span><span>Type</span><span>Swagger URL</span><span/></div>
                {shown.map((api) => {
                    const index = rows.indexOf(api);
                    const isPageApi = api.id === page?.api.id;
                    return (
                        <div key={api.id} className="cf-tree-api">
                            <div className="cf-tree-row is-api">
                                <span className="cf-tree-named">
                                    {!onlyApiId && <span className="cf-menu-prefix">{index + 1})</span>}
                                    <input className="cf-input cf-tree-name" value={api.name} placeholder="API name, e.g. Shop" aria-label="API name" autoFocus={focusId === api.id}
                                           onChange={(e) => patchApi(api.id, (a) => ({...a, name: e.target.value}))}/>
                                </span>
                                <span className="cf-tree-muted">API</span>
                                <span className="cf-tree-muted">{api.envs.length} environment{api.envs.length === 1 ? "" : "s"}{isPageApi && " · this page"}</span>
                                <span className="cf-tree-actions">
                                    {!onlyApiId && (
                                        <>
                                            <button className="cf-icon-btn" disabled={index === 0} title="Move up" onClick={() => move(index, -1)}><ChevronUp size={14}/></button>
                                            <button className="cf-icon-btn" disabled={index === rows.length - 1} title="Move down" onClick={() => move(index, 1)}><ChevronDown size={14}/></button>
                                            <button className="cf-text-btn is-danger" disabled={isPageApi} title={isPageApi ? "This page belongs to this API" : "Remove the API and its environments"}
                                                    onClick={() => setRows((list) => list.filter((a) => a.id !== api.id))}>Remove</button>
                                        </>
                                    )}
                                </span>
                            </div>
                            {api.envs.map((env) => {
                                const isPage = env.id === page?.env.id;
                                const resolved = normalizeDocsUrl(env.input);
                                return (
                                    <div key={env.id} className="cf-tree-row is-env">
                                        <span className="cf-tree-indent">
                                            <input className="cf-input" value={env.name} placeholder={KIND_LABEL[env.kind]} aria-label="Environment name" autoFocus={focusId === env.id}
                                                   onChange={(e) => patchEnv(api.id, env.id, {name: e.target.value})}/>
                                        </span>
                                        <select className={`cf-select-inline is-env-${env.kind}`} value={env.kind} aria-label="Type"
                                                onChange={(e) => {
                                                    const kind = e.target.value as EnvKind;
                                                    patchEnv(api.id, env.id, {kind, name: renameForKind(env.name, env.kind, kind)});
                                                }}>
                                            {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                                        </select>
                                        <input className="cf-input is-mono" value={env.input} spellCheck={false} aria-label="Swagger URL"
                                               placeholder={env.kind === "local" ? "localhost:8000" : "api.example.com"}
                                               title={resolved ? `Swagger page: ${resolved}` : "The address is enough; http/https and /docs are added"}
                                               onChange={(e) => patchEnv(api.id, env.id, {input: e.target.value})}/>
                                        <span className="cf-tree-actions">
                                            {isPage && <span className="cf-tree-muted">this page</span>}
                                            <button className="cf-text-btn is-danger" disabled={isPage || api.envs.length === 1}
                                                    title={isPage ? "This page is this environment" : api.envs.length === 1 ? "An API needs one environment; remove the API instead" : "Remove"}
                                                    onClick={() => patchApi(api.id, (a) => ({...a, envs: a.envs.filter((e) => e.id !== env.id)}))}>Remove</button>
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="cf-tree-row is-add">
                                <span className="cf-tree-indent"><button className="cf-text-btn" onClick={() => addEnv(api)}>+ Add environment</button></span>
                            </div>
                        </div>
                    );
                })}
                {!shown.length && <div className="cf-empty">No saved APIs yet.</div>}
                {!onlyApiId && <div className="cf-tree-row is-add-api"><button className="cf-text-btn" onClick={addApi}>+ Add API</button></div>}
            </div>
            <div className="cf-form-note is-block">Swagger URL: the address is enough (localhost:8000, api.example.com); http/https and /docs are added.</div>
        </Modal>
    );
}

const toSaved = (a: EditApi): SavedApi => ({...a, envs: a.envs.map((e) => ({...e, docsUrl: normalizeDocsUrl(e.input) ?? ""}))});

function blankApi(name: string, input: string): EditApi {
    return {id: newId(), name, envs: [{...newEnv("local", ""), input}], addedAt: Date.now(), isNew: true};
}

function blankEnv(api: EditApi, input: string): EditEnv {
    return {...newEnv(nextKind(toSaved(api)), ""), input};
}

// ---------------------------------------------------------------------------

/** Renders the dialogs; on the first visit of an unsaved Swagger page it asks to save it. */
export function ApiDialogsHost() {
    const dialog = useStore(dialogStore, (s) => s.dialog);
    useEffect(() => {
        if (!findEnv(apisStore.get().apis, currentDocsUrl()) && !askedLater()) openSaveApi();
    }, []);
    if (!dialog) return null;
    return dialog.kind === "save" ? <SaveApiDialog/> : <ApiTree onlyApiId={dialog.apiId} add={dialog.add}/>;
}
