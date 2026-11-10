import {forwardRef, KeyboardEvent, ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react";
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";
import {json} from "@codemirror/lang-json";
import {bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, unfoldAll} from "@codemirror/language";
import {highlightSelectionMatches} from "@codemirror/search";
import {Compartment, EditorState, Extension, Prec} from "@codemirror/state";
import {EditorView, keymap, lineNumbers, placeholder as placeholderExt} from "@codemirror/view";
import {ChevronDown, ChevronsDownUp, ChevronsUpDown, ChevronUp, Copy, Search, X} from "lucide-react";
import {
    collapseStep,
    copyOnClick,
    editorTheme,
    EnumChoices,
    fieldHintLines,
    FieldHints,
    ValueProblems,
    valueProblems,
    enumPicker,
    EnumMenu,
    expandStep,
    findMatches,
    jsonHighlight,
    jsonPathAt,
    jsonValueAt,
    lineOfPath,
    markedLines,
    Match,
    quotedValues,
    refreshEnums,
    searchMatches,
    setMarkedLines,
    showMatch,
} from "../editor";
import {notify, prefsStore, resetCodeFont, setCodeFont} from "../state";
import {useStore} from "../store";
import {copyText} from "../clipboard";
import {openMenu} from "./Menu";
import type {SchemaLookups} from "../openapi";

export interface JsonCodeHandle {
    /** Folds the deepest open level; returns false when everything is folded. */
    collapseStep(): boolean;
    expandStep(): boolean;
    expandAll(): void;
    openSearch(): void;
}

interface Props {
    value: string;
    language?: "json" | "text";
    readOnly?: boolean;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
    invalid?: boolean;
    lineNumbers?: boolean;
    /** Max editor height in px (scrolls inside); omit to grow with the content. */
    maxHeight?: number;
    minLines?: number;
    /** Minimum editor height in px (wins over minLines). */
    minHeight?: number;
    /** Stretch to fill the remaining height of the parent (response viewer). */
    fill?: boolean;
    placeholder?: string;
    /** JSON paths to highlight (e.g. fields rejected by a 422 response). */
    marks?: (string | number)[][];
    /** Hide Collapse/Expand/Search in the footer (the parent renders them). */
    externalTools?: boolean;
    /** Shown in the error color (the body of a 4xx / 5xx response). */
    error?: boolean;
    /**
     * The schema of the JSON (a request body, a documented response): fields whose type says more than string /
     * number / boolean (uuid, date, enum…) show it below them; in an editor enum values are also framed as
     * dropdowns that suggest their values while typed.
     */
    schema?: SchemaLookups;
}

/** Pasting that leaves the whole document as valid JSON pretty-prints it (one undo step); anything else pastes as is. */
function formatOnPaste(language: () => string): Extension {
    return EditorView.domEventHandlers({
        paste(event, view) {
            const text = event.clipboardData?.getData("text/plain");
            if (language() !== "json" || !text || view.state.selection.ranges.length > 1) return false;
            const {from, to} = view.state.selection.main;
            const doc = view.state.doc;
            const next = doc.sliceString(0, from) + text + doc.sliceString(to);
            let formatted: string;
            try {
                formatted = JSON.stringify(JSON.parse(next), null, 2);
            } catch {
                return false;
            }
            if (formatted === next) return false;
            event.preventDefault();
            view.dispatch({
                changes: {from: 0, to: doc.length, insert: formatted},
                selection: {anchor: from === 0 && to === doc.length ? 0 : Math.min(from, formatted.length)},
                userEvent: "input.paste",
                scrollIntoView: true,
            });
            return true;
        },
    });
}

const valueLabel = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What a typed custom value means: text for a list of strings, otherwise JSON when it parses (5, true, null). */
function customValue(text: string, choices: unknown[]): unknown {
    if (choices.every((c) => typeof c === "string" || c === null) && text !== "null") return text;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/**
 * The list of an enum's values, in the menu of the rest of the app (arrow keys, Enter, Esc), opened on the current
 * value; below them a box for a value outside the list (typing while the list is open goes there).
 */
const enumMenu: EnumMenu = (at, choices, current, pick, from) => {
    const listed = choices.some((c) => sameValue(c, current));
    openMenu({
        x: at.x,
        y: at.y,
        startAtActive: true,
        compact: true,
        items: [
            ...choices.map((choice) => ({label: valueLabel(choice), active: sameValue(choice, current), onSelect: () => pick(choice)})),
            {
                label: "Custom value",
                input: {
                    placeholder: "Custom value…",
                    initial: listed || current === undefined ? "" : valueLabel(current),
                    onSubmit: (text: string) => pick(customValue(text, choices)),
                },
                onSelect: () => undefined,
            },
        ],
    }, from);
};

/** The schema questions the editor asks; stable for its lifetime (each asks the latest `schema` prop). */
interface Lookups {
    choices: EnumChoices;
    hints: FieldHints;
    problems: ValueProblems;
}

/**
 * JSON highlighting and the type hints of the schema's fields; read-only viewers also get the Copy / Path buttons
 * on a clicked line, value double click and 'quoted' values in texts marked, editors the enum picker.
 */
function languageExt(language: string, readOnly: boolean | undefined, {choices, hints, problems}: Lookups): Extension {
    if (language !== "json") return [];
    return [json(), fieldHintLines(hints, readOnly ? null : choices), ...(readOnly ? [copyOnClick(copyText), quotedValues] : [enumPicker(choices, enumMenu), valueProblems(problems, choices)])];
}

export function IconLabel({icon, children}: { icon: ReactNode; children: ReactNode }) {
    return <span className="cf-icon-label">{icon}<span>{children}</span></span>;
}

export const JsonCode = forwardRef<JsonCodeHandle, Props>(function JsonCode(props, ref) {
    const {value, language = "json", readOnly, invalid, maxHeight, minLines = 3, marks, externalTools, fill, error} = props;
    const host = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const callbacks = useRef(props);
    callbacks.current = props;
    const languageConf = useRef(new Compartment());
    // stable for the editor's lifetime; always asks the latest prop
    const choices = useRef<EnumChoices>((p) => callbacks.current.schema?.choices(p) ?? null).current;
    // the type hints follow the setting under the request (on or off for every editor and viewer at once)
    const typeHints = useStore(prefsStore, (s) => s.typeHints);
    const showHints = useRef(typeHints);
    showHints.current = typeHints;
    const hints = useRef<FieldHints>((p) => (showHints.current ? callbacks.current.schema?.hint(p) ?? null : null)).current;
    const problems = useRef<ValueProblems>((p, v) => callbacks.current.schema?.problem(p, v) ?? null).current;
    const lookups = useMemo<Lookups>(() => ({choices, hints, problems}), [choices, hints, problems]);
    const [path, setPath] = useState("");
    const [selected, setSelected] = useState(0);

    // ---- search
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [matches, setMatches] = useState<Match[]>([]);
    const [current, setCurrent] = useState(0);
    const searchInput = useRef<HTMLInputElement>(null);
    const openSearchRef = useRef<() => void>(() => undefined);

    const openSearch = useCallback(() => {
        setSearchOpen(true);
        requestAnimationFrame(() => {
            searchInput.current?.focus();
            searchInput.current?.select();
        });
    }, []);
    openSearchRef.current = openSearch;

    const runSearch = useCallback((text: string, keepIndex = false) => {
        const view = viewRef.current;
        if (!view) return;
        const found = findMatches(view.state, text);
        const index = keepIndex ? Math.min(current, Math.max(0, found.length - 1)) : 0;
        setMatches(found);
        setCurrent(index);
        showMatch(view, found, index);
    }, [current]);

    const step = (delta: number) => {
        const view = viewRef.current;
        if (!view || !matches.length) return;
        const next = (current + delta + matches.length) % matches.length;
        setCurrent(next);
        showMatch(view, matches, next);
    };

    const closeSearch = () => {
        setSearchOpen(false);
        const view = viewRef.current;
        if (view) {
            showMatch(view, [], -1);
            view.focus();
        }
    };

    useImperativeHandle(ref, () => ({
        collapseStep: () => (viewRef.current ? collapseStep(viewRef.current) : false),
        expandStep: () => (viewRef.current ? expandStep(viewRef.current) : false),
        expandAll: () => {
            if (viewRef.current) unfoldAll(viewRef.current);
        },
        openSearch,
    }), [openSearch]);

    useEffect(() => {
        if (!host.current) return;
        const extensions: Extension[] = [
            editorTheme,
            syntaxHighlighting(jsonHighlight),
            bracketMatching(),
            foldGutter({openText: "▾", closedText: "▸"}),
            highlightSelectionMatches(),
            markedLines,
            searchMatches,
            history(),
            languageConf.current.of(languageExt(language, readOnly, lookups)),
            Prec.highest(keymap.of([
                {
                    key: "Mod-Enter", run: () => {
                        callbacks.current.onSubmit?.();
                        return true;
                    },
                },
                {
                    key: "Mod-0", run: () => {
                        resetCodeFont();
                        return true;
                    },
                },
                {
                    key: "Mod-f", run: () => {
                        openSearchRef.current();
                        return true;
                    },
                },
            ])),
            keymap.of([...foldKeymap, ...historyKeymap, ...defaultKeymap, ...(readOnly ? [] : [indentWithTab])]),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && !readOnly) callbacks.current.onChange?.(update.state.doc.toString());
                if (update.selectionSet || update.docChanged) {
                    setSelected(update.state.selection.ranges.reduce((n, r) => n + r.to - r.from, 0));
                    setPath(language === "json" ? jsonPathAt(update.state, update.state.selection.main.head) : "");
                }
            }),
            EditorState.tabSize.of(2),
        ];
        if (!readOnly) extensions.push(formatOnPaste(() => callbacks.current.language ?? "json"));
        if (props.lineNumbers) extensions.push(lineNumbers());
        if (readOnly) extensions.push(EditorState.readOnly.of(true), EditorView.lineWrapping);
        if (props.placeholder) extensions.push(placeholderExt(props.placeholder));
        const view = new EditorView({
            parent: host.current,
            root: host.current.getRootNode() as ShadowRoot | Document,
            state: EditorState.create({doc: value, extensions}),
        });
        viewRef.current = view;
        // Ctrl + wheel zooms the code text instead of the page
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey || !e.deltaY) return;
            e.preventDefault();
            setCodeFont(prefsStore.get().codeFont + (e.deltaY < 0 ? 1 : -1));
        };
        view.dom.addEventListener("wheel", onWheel, {passive: false});
        return () => {
            view.dom.removeEventListener("wheel", onWheel);
            view.destroy();
            viewRef.current = null;
        };
        // the editor is created once; value/language changes are synced below
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const doc = view.state.doc.toString();
        if (doc !== value) view.dispatch({changes: {from: 0, to: doc.length, insert: value}});
        if (searchOpen && query) runSearch(query, true);
        // re-run the search only when the text changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
        viewRef.current?.dispatch({effects: languageConf.current.reconfigure(languageExt(language, readOnly, lookups))});
    }, [language, readOnly, lookups]);

    useEffect(() => {
        viewRef.current?.dispatch({effects: refreshEnums.of(null)});
    }, [props.schema, typeHints]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const lines = (marks ?? []).map((p) => lineOfPath(view.state, p)).filter((n): n is number => n !== null);
        view.dispatch({effects: setMarkedLines.of(lines)});
    }, [marks, value]);

    const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            step(e.shiftKey ? -1 : 1);
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeSearch();
        }
    };

    const style = {
        "--cf-code-max": maxHeight ? `${maxHeight}px` : "none",
        "--cf-code-min": `${props.minHeight ?? minLines * 20 + 8}px`,
    } as React.CSSProperties;

    return (
        <div className={`cf-jc ${invalid ? "is-invalid" : ""} ${maxHeight ? "is-bounded" : ""} ${fill ? "is-fill" : ""} ${readOnly ? "is-readonly" : ""} ${error ? "is-error" : ""}`} style={style}>
            {searchOpen && (
                <div className="cf-jc-search">
                    <Search size={13} className="cf-jc-search-icon"/>
                    <input
                        ref={searchInput}
                        value={query}
                        placeholder="Find (case and accent insensitive)"
                        spellCheck={false}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            runSearch(e.target.value);
                        }}
                        onKeyDown={onSearchKey}
                    />
                    <span className={`cf-jc-count ${query && !matches.length ? "is-none" : ""}`}>
                        {query ? (matches.length ? `${current + 1} / ${matches.length}${matches.length >= 5000 ? "+" : ""}` : "No results") : ""}
                    </span>
                    <button className="cf-icon-btn" title="Previous (Shift+Enter)" disabled={!matches.length} onClick={() => step(-1)}><ChevronUp size={14}/></button>
                    <button className="cf-icon-btn" title="Next (Enter)" disabled={!matches.length} onClick={() => step(1)}><ChevronDown size={14}/></button>
                    <button className="cf-icon-btn is-close" title="Close (Esc)" onClick={closeSearch}><X size={14}/></button>
                </div>
            )}
            <div ref={host} className="cf-jc-host"/>
            <div className="cf-jc-foot">
                {selected > 0 && (
                    <button className="cf-text-btn" title="Copy the selected text (Ctrl+C)" onClick={async () => {
                        const view = viewRef.current;
                        if (!view) return;
                        const text = view.state.selection.ranges.map((r) => view.state.sliceDoc(r.from, r.to)).join("\n");
                        if (await copyText(text)) notify("Selection copied", "ok");
                    }}>
                        <IconLabel icon={<Copy size={12}/>}>Copy selection</IconLabel>
                    </button>
                )}
                {language === "json" && <span className="cf-jc-path" title="Path of the value at the cursor">{path || "(root)"}</span>}
                {language === "json" && path && (
                    <button className="cf-text-btn" onClick={async () => {
                        if (await copyText(path)) notify(`Copied ${path}`, "ok");
                    }}>
                        <IconLabel icon={<Copy size={12}/>}>Copy path</IconLabel>
                    </button>
                )}
                {language === "json" && path && (
                    <button className="cf-text-btn" title="Copy the value at the cursor (strings without quotes)" onClick={async () => {
                        const view = viewRef.current;
                        const value = view && jsonValueAt(view.state, view.state.selection.main.head);
                        if (value === undefined || value === null) return;
                        if (await copyText(value)) notify(`Copied value of ${path}`, "ok");
                    }}>
                        <IconLabel icon={<Copy size={12}/>}>Copy value</IconLabel>
                    </button>
                )}
                <span className="cf-flex"/>
                {!externalTools && (
                    <>
                        {language === "json" && (
                            <>
                                <button className="cf-text-btn" title="Fold the deepest open level (click again to fold more)"
                                        onClick={() => viewRef.current && collapseStep(viewRef.current)}>
                                    <IconLabel icon={<ChevronsDownUp size={12}/>}>Collapse</IconLabel>
                                </button>
                                <button className="cf-text-btn" title="Unfold everything" onClick={() => viewRef.current && unfoldAll(viewRef.current)}>
                                    <IconLabel icon={<ChevronsUpDown size={12}/>}>Expand</IconLabel>
                                </button>
                            </>
                        )}
                        <button className="cf-text-btn" title="Find (Ctrl+F)" onClick={openSearch}>
                            <IconLabel icon={<Search size={12}/>}>Find</IconLabel>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});
