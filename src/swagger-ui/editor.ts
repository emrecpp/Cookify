// CodeMirror pieces for the JSON editor/viewer: theme, JSON paths, step-wise folding, line marks and
// a search that folds Turkish/accented letters (so "istanbul" finds "İstanbul" and "sisli" finds "Şişli").
import {ensureSyntaxTree, foldedRanges, foldEffect, HighlightStyle, syntaxTree, unfoldEffect} from "@codemirror/language";
import {acceptCompletion, autocompletion, CompletionContext, CompletionResult} from "@codemirror/autocomplete";
import {SearchCursor} from "@codemirror/search";
import {EditorState, Extension, Prec, Range, StateEffect, StateField} from "@codemirror/state";
import {Decoration, DecorationSet, EditorView, hoverTooltip, keymap, showTooltip, Tooltip, ViewPlugin, ViewUpdate, WidgetType} from "@codemirror/view";
import {tags as t} from "@lezer/highlight";
import type {SyntaxNode} from "@lezer/common";
import type {FieldHint} from "./openapi";

export const jsonHighlight = HighlightStyle.define([
    {tag: t.propertyName, color: "var(--j-key)"},
    {tag: t.string, color: "var(--j-str)"},
    {tag: t.number, color: "var(--j-num)"},
    {tag: t.bool, color: "var(--j-bool)"},
    {tag: t.null, color: "var(--j-null)"},
    {tag: [t.brace, t.squareBracket, t.separator, t.punctuation], color: "var(--j-punct)"},
]);

export const editorTheme = EditorView.theme({
    "&": {fontSize: "var(--cf-code-font, 14px)", backgroundColor: "var(--input)", color: "var(--text)"},
    "&.cm-focused": {outline: "none"},
    ".cm-scroller": {fontFamily: "var(--mono)", lineHeight: "calc(var(--cf-code-font, 14px) + 7px)"},
    ".cm-content": {padding: "4px 0", caretColor: "var(--strong)"},
    ".cm-line": {padding: "0 8px 0 4px"},
    ".cm-gutters": {backgroundColor: "var(--input)", color: "var(--faint)", border: "none", borderRight: "1px solid var(--border)"},
    ".cm-lineNumbers .cm-gutterElement": {padding: "0 6px 0 8px", minWidth: "28px", fontSize: "calc(var(--cf-code-font, 14px) - 1px)"},
    ".cm-foldGutter .cm-gutterElement": {width: "14px", textAlign: "center", color: "var(--muted)", cursor: "pointer"},
    ".cm-foldGutter .cm-gutterElement:hover": {color: "var(--strong)"},
    ".cm-activeLine": {backgroundColor: "transparent"},
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {backgroundColor: "color-mix(in srgb, var(--accent) 35%, transparent) !important"},
    ".cm-cursor": {borderLeftColor: "var(--strong)"},
    ".cm-matchingBracket": {backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)", outline: "none"},
    ".cm-selectionMatch": {backgroundColor: "color-mix(in srgb, var(--fav) 22%, transparent)"},
    ".cm-searchMatch": {backgroundColor: "color-mix(in srgb, var(--fav) 30%, transparent)", outline: "1px solid color-mix(in srgb, var(--fav) 60%, transparent)"},
    ".cm-searchMatch-selected": {backgroundColor: "color-mix(in srgb, var(--fav) 70%, transparent)", color: "#111"},
    ".cm-foldPlaceholder": {backgroundColor: "var(--bar)", border: "1px solid var(--border-strong)", color: "var(--muted)", borderRadius: "var(--r)", padding: "0 4px", margin: "0 2px", fontFamily: "var(--mono)"},
    ".cm-placeholder": {color: "var(--faint)"},
    ".cm-error-line": {backgroundColor: "color-mix(in srgb, var(--err) 14%, transparent)"},
    ".cm-chip-line": {backgroundColor: "color-mix(in srgb, var(--text) 5%, transparent)"},
    // Floats over the text above the value, so nothing moves; only the buttons take the mouse, a drag that starts
    // anywhere else around them still selects the text underneath.
    ".cm-tooltip.cm-copy-tip": {
        display: "inline-flex", gap: "3px", padding: "2px", background: "var(--bar)", border: "1px solid var(--border-strong)",
        borderRadius: "calc(var(--r) * 1.5)", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)", userSelect: "none", pointerEvents: "none",
    },
    ".cm-tooltip.cm-copy-tip .cm-tooltip-arrow:before": {borderTopColor: "var(--border-strong)", borderBottomColor: "var(--border-strong)"},
    ".cm-tooltip.cm-copy-tip .cm-tooltip-arrow:after": {borderTopColor: "var(--bar)", borderBottomColor: "var(--bar)"},
    ".cm-copy-tip button": {
        display: "inline-flex", alignItems: "center", gap: "3px", height: "18px", padding: "0 6px", font: "calc(11px * var(--fs))/14px var(--font)",
        color: "var(--muted)", background: "transparent", border: "1px solid transparent", borderRadius: "var(--r)", cursor: "pointer", pointerEvents: "auto",
    },
    ".cm-copy-tip button:hover": {color: "var(--strong)", background: "var(--hover)", borderColor: "var(--border-strong)"},
    ".cm-copy-tip button.is-done": {color: "var(--ok)"},
    // An enum value as one dropdown button: the value, a line, a wide ⌄; its whole border lights up on hover. Inline,
    // so it takes the height of the font, not of the line; the border is a shadow for the same reason.
    ".cm-enum-btn": {
        "--enum-line": "var(--border-strong)",
        display: "inline", padding: "0 0 0 6px", background: "var(--bar)", borderRadius: "var(--r)", cursor: "pointer", whiteSpace: "nowrap",
        boxShadow: "inset 0 0 0 1px var(--enum-line)",
    },
    ".cm-enum-btn:hover": {"--enum-line": "var(--accent)", background: "var(--hover)"},
    ".cm-enum-arrow": {
        display: "inline", marginLeft: "6px", padding: "0 8px", color: "var(--muted)", boxShadow: "inset 1px 0 0 var(--enum-line)",
    },
    ".cm-enum-btn:hover .cm-enum-arrow": {color: "var(--strong)"},
    ".cm-enum-arrow svg": {width: "11px", height: "11px", display: "inline-block", verticalAlign: "-1px"},
    ".cm-enum-str": {color: "var(--j-str)"},
    ".cm-enum-num": {color: "var(--j-num)"},
    ".cm-enum-bool": {color: "var(--j-bool)"},
    ".cm-enum-null": {color: "var(--j-null)"},
    ".cm-enum-btn.is-invalid": {"--enum-line": "var(--err)", background: "color-mix(in srgb, var(--err) 12%, transparent)"},
    ".cm-enum-btn.is-invalid .cm-enum-label": {textDecoration: "underline wavy", textDecorationColor: "var(--err)", textUnderlineOffset: "3px"},
    ".cm-enum-btn.is-invalid .cm-enum-arrow": {color: "var(--err)"},
    // a value that does not fit its schema, and the few words at the end of its line that say why
    ".cm-value-invalid": {textDecoration: "underline wavy", textDecorationColor: "var(--err)", textUnderlineOffset: "3px"},
    ".cm-value-note": {
        marginLeft: "2ch", fontStyle: "italic", fontSize: "calc(var(--cf-code-font, 14px) - 1px)",
        color: "color-mix(in srgb, var(--err) 75%, var(--faint))", userSelect: "none", pointerEvents: "none", whiteSpace: "pre",
    },
    // why a value is red, after the pointer rests on it
    ".cm-tooltip.cm-tooltip-hover:has(.cm-enum-problem)": {
        background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--err) 55%, var(--border-strong))", borderRadius: "var(--r)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
    },
    ".cm-enum-problem": {
        maxWidth: "360px", padding: "5px 9px", fontFamily: "var(--font)", fontSize: "calc(12px * var(--fs))", lineHeight: "1.4",
        color: "var(--text)", whiteSpace: "normal",
    },
    // Suggestions for enum values, in the look of the app's menus
    ".cm-tooltip.cm-tooltip-autocomplete": {
        background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--r)", boxShadow: "0 6px 18px rgba(0, 0, 0, 0.4)", padding: "3px 0",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {fontFamily: "var(--font)", maxHeight: "260px", minWidth: "170px"},
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {display: "flex", alignItems: "center", padding: "0 14px", lineHeight: "28px", fontSize: "calc(13px * var(--fs))", color: "var(--text)"},
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {background: "var(--selected) !important", color: "var(--selected-text) !important"},
    ".cm-tooltip-autocomplete .cm-completionMatchedText": {textDecoration: "none", fontWeight: "inherit"},
    ".cm-tooltip-autocomplete .cm-completionDetail": {marginLeft: "auto", paddingLeft: "16px", fontStyle: "normal", fontSize: "calc(12px * var(--fs))", color: "var(--faint)"},
    ".cm-tooltip-autocomplete li[aria-selected] .cm-completionDetail": {color: "inherit", opacity: "0.75"},
    ".cm-copy-tip svg": {width: "11px", height: "11px", flex: "none"},
    // 'values' quoted inside a text of a response (e.g. the allowed values in a validation message)
    ".cm-quoted": {color: "var(--j-num)", background: "color-mix(in srgb, var(--j-num) 14%, transparent)", borderRadius: "var(--r)"},
    // type of a body field: a line below it on a branch that comes down from the field and turns right, ending in an
    // arrow head, like a tree
    ".cm-field-hint": {
        "--branch": "color-mix(in srgb, var(--t-class) 55%, transparent)",
        display: "flex", alignItems: "flex-start", padding: "0 8px 2px 4px", fontFamily: "var(--mono)", whiteSpace: "pre",
        userSelect: "none", cursor: "default", overflow: "hidden",
    },
    ".cm-hint-indent": {flex: "none", fontSize: "var(--cf-code-font, 14px)", lineHeight: "1"},
    ".cm-hint-branch": {
        position: "relative", flex: "none", width: "13px", marginLeft: "0.4ch", marginTop: "-3px",
        height: "calc((var(--cf-code-font, 14px) - 2px) * 0.95)",
        borderLeft: "1.5px solid var(--branch)", borderBottom: "1.5px solid var(--branch)", borderBottomLeftRadius: "4px",
    },
    ".cm-hint-branch::after": {
        content: '""', position: "absolute", right: "-5px", bottom: "-4.75px",
        borderLeft: "5px solid var(--branch)", borderTop: "4px solid transparent", borderBottom: "4px solid transparent",
    },
    ".cm-hint-body": {
        display: "flex", flexDirection: "column", minWidth: "0", paddingLeft: "9px",
        fontSize: "calc(var(--cf-code-font, 14px) - 2px)", lineHeight: "1.35", color: "var(--faint)",
    },
    ".cm-hint-row": {overflow: "hidden", textOverflow: "ellipsis"},
    ".cm-hint-key": {color: "var(--faint)"},
    ".cm-hint-type": {color: "var(--t-class)"},
    ".cm-hint-values": {color: "color-mix(in srgb, var(--choice) 85%, var(--faint))"},
    // a value of an enum to click (editor only); underlined on hover, which moves nothing
    ".cm-hint-value": {cursor: "pointer", textUnderlineOffset: "2px"},
    ".cm-hint-value:hover": {color: "var(--choice)", textDecoration: "underline"},
    ".cm-hint-value.is-current": {color: "var(--strong)"},
});

function tree(state: EditorState) {
    return ensureSyntaxTree(state, state.doc.length, 300) ?? syntaxTree(state);
}

// ---------------------------------------------------------------------------
// JSON path of the node at a position, e.g. data.items[0].id

const VALUE_TYPES = new Set(["Object", "Array", "String", "Number", "True", "False", "Null"]);

function keyText(state: EditorState, node: SyntaxNode): string {
    const raw = state.sliceDoc(node.from, node.to);
    try {
        return JSON.parse(raw) as string;
    } catch {
        return raw.replace(/^"|"$/g, "");
    }
}

/** Clicks in the indentation or after the trailing comma refer to the value on that line. */
function linePos(state: EditorState, at: number): number {
    const line = state.doc.lineAt(at);
    const start = line.text.length - line.text.trimStart().length;
    const end = line.text.trimEnd().replace(/,$/, "").length;
    return line.from + Math.max(start, Math.min(at - line.from, Math.max(start, end - 1)));
}

/** The value at a position, ready to paste: strings unquoted, objects/arrays pretty-printed. Undefined outside a value. */
/** The JSON value at `at` (for a property, its value). */
function valueNodeAt(state: EditorState, at: number): SyntaxNode | null {
    let node: SyntaxNode | null = tree(state).resolveInner(linePos(state, at), 1);
    while (node && !VALUE_TYPES.has(node.name)) {
        if (node.name === "PropertyName" || node.name === "Property") {
            const prop: SyntaxNode | null = node.name === "Property" ? node : node.parent;
            let value: SyntaxNode | null = prop?.lastChild ?? null;
            while (value && !VALUE_TYPES.has(value.name)) value = value.prevSibling;
            node = value;
            break;
        }
        node = node.parent;
    }
    return node;
}

function valueText(state: EditorState, node: SyntaxNode): string {
    const raw = state.sliceDoc(node.from, node.to);
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "string") return parsed;
        return typeof parsed === "object" && parsed !== null ? JSON.stringify(parsed, null, 2) : raw;
    } catch {
        return raw;
    }
}

export function jsonValueAt(state: EditorState, at: number): string | undefined {
    const node = valueNodeAt(state, at);
    return node ? valueText(state, node) : undefined;
}

/** The keys and indexes leading to `node` from the root, e.g. ["items", 0, "id"]. */
function pathParts(state: EditorState, start: SyntaxNode | null): (string | number)[] {
    const parts: (string | number)[] = [];
    let node = start;
    while (node && node.parent) {
        const parent: SyntaxNode = node.parent;
        if (parent.name === "Property") {
            const name = parent.getChild("PropertyName");
            if (name) parts.unshift(keyText(state, name));
            node = parent.parent;
            continue;
        }
        if (parent.name === "Array" && VALUE_TYPES.has(node.name)) {
            let index = 0;
            for (let child = parent.firstChild; child && child.from < node.from; child = child.nextSibling) {
                if (VALUE_TYPES.has(child.name)) index++;
            }
            parts.unshift(index);
        }
        node = parent;
    }
    return parts;
}

export function jsonPathAt(state: EditorState, at: number): string {
    return pathParts(state, tree(state).resolveInner(linePos(state, at), 1))
        .map((part) => (typeof part === "number" ? `[${part}]` : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`))
        .join("")
        .replace(/^\./, "");
}

/** Line number (1-based) where the value at a JSON path (["user", "email"] or ["items", 0]) starts, if found. */
export function lineOfPath(state: EditorState, path: (string | number)[]): number | null {
    let node: SyntaxNode | null = tree(state).topNode.firstChild;
    for (const part of path) {
        if (!node) return null;
        if (node.name === "Object" && typeof part === "string") {
            let found: SyntaxNode | null = null;
            for (let prop = node.firstChild; prop; prop = prop.nextSibling) {
                const name = prop.name === "Property" ? prop.getChild("PropertyName") : null;
                if (name && keyText(state, name) === part) {
                    found = prop;
                    break;
                }
            }
            if (!found) return null;
            node = found.lastChild && VALUE_TYPES.has(found.lastChild.name) ? found.lastChild : found;
        } else if (node.name === "Array" && typeof part === "number") {
            let index = 0;
            let found: SyntaxNode | null = null;
            for (let child = node.firstChild; child; child = child.nextSibling) {
                if (!VALUE_TYPES.has(child.name)) continue;
                if (index++ === part) {
                    found = child;
                    break;
                }
            }
            if (!found) return null;
            node = found;
        } else {
            break;
        }
    }
    return node ? state.doc.lineAt(node.from).number : null;
}

// ---------------------------------------------------------------------------
// Step-wise collapsing: each call folds the deepest level that is still open.

interface Foldable {
    from: number;
    to: number;
    depth: number;
}

function openFoldables(state: EditorState): Foldable[] {
    const folded = foldedRanges(state);
    const isFolded = (from: number, to: number) => {
        let found = false;
        folded.between(from, to, (a, b) => {
            if (a === from && b === to) found = true;
        });
        return found;
    };
    const result: Foldable[] = [];
    const walk = (node: SyntaxNode, depth: number) => {
        for (let child = node.firstChild; child; child = child.nextSibling) {
            if (child.name === "Object" || child.name === "Array") {
                const from = child.from + 1;
                const to = child.to - 1;
                const multiLine = to > from && state.doc.lineAt(from).number !== state.doc.lineAt(to).number;
                if (multiLine && isFolded(from, to)) continue; // everything inside is hidden already
                if (multiLine) result.push({from, to, depth});
                walk(child, depth + 1);
            } else {
                walk(child, depth);
            }
        }
    };
    walk(tree(state).topNode, 0);
    return result;
}

/** Folds the deepest still-open objects/arrays. Returns false when everything is folded already. */
export function collapseStep(view: EditorView): boolean {
    const open = openFoldables(view.state);
    if (!open.length) return false;
    const deepest = Math.max(...open.map((f) => f.depth));
    view.dispatch({effects: open.filter((f) => f.depth === deepest).map((f) => foldEffect.of({from: f.from, to: f.to}))});
    return true;
}

/** Unfolds the outermost folded level (the reverse of collapseStep). */
export function expandStep(view: EditorView): boolean {
    const folded = foldedRanges(view.state);
    const ranges: { from: number; to: number }[] = [];
    folded.between(0, view.state.doc.length, (from, to) => {
        ranges.push({from, to});
    });
    // outermost = not contained in another folded range (nested folds are kept as they are)
    const outer = ranges.filter((r) => !ranges.some((o) => o !== r && o.from <= r.from && o.to >= r.to));
    if (!outer.length) return false;
    view.dispatch({effects: outer.map((r) => unfoldEffect.of(r))});
    return true;
}

// ---------------------------------------------------------------------------
// Line marks (e.g. lines rejected by a 422 validation error)

export const setMarkedLines = StateEffect.define<number[]>();
export const markedLines = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setMarkedLines)) {
                const lines = [...new Set(effect.value)].filter((n) => n >= 1 && n <= tr.state.doc.lines).sort((a, b) => a - b);
                return Decoration.set(lines.map((n) => Decoration.line({class: "cm-error-line"}).range(tr.state.doc.line(n).from)));
            }
        }
        return value.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});

// ---------------------------------------------------------------------------
// Search (case and accent insensitive, Turkish aware)

const SPECIAL: Record<string, string> = {"ı": "i", "İ": "i", "I": "i"};

/**
 * Lowercases and strips accents. CodeMirror's SearchCursor NFKD-normalizes text before calling this
 * (so "İ" arrives as "I" + U+0307) and accepts characters that normalize to nothing.
 */
export function foldText(text: string): string {
    let out = "";
    for (const ch of text) out += SPECIAL[ch] ?? ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return out;
}

export interface Match {
    from: number;
    to: number;
}

export function findMatches(state: EditorState, query: string, limit = 5000): Match[] {
    if (!query) return [];
    const matches: Match[] = [];
    const cursor = new SearchCursor(state.doc, query, 0, state.doc.length, foldText);
    while (matches.length < limit && !cursor.next().done) matches.push({from: cursor.value.from, to: cursor.value.to});
    return matches;
}

export const setSearchMatches = StateEffect.define<{ matches: Match[]; current: number }>();
export const searchMatches = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setSearchMatches)) {
                const {matches, current} = effect.value;
                return Decoration.set(matches.map((m, i) => Decoration.mark({class: i === current ? "cm-searchMatch cm-searchMatch-selected" : "cm-searchMatch"}).range(m.from, m.to)));
            }
        }
        return value.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});

/** Highlights all matches, unfolds around the current one and scrolls it into view. */
export function showMatch(view: EditorView, matches: Match[], current: number) {
    const effects: StateEffect<unknown>[] = [setSearchMatches.of({matches, current})];
    const match = matches[current];
    if (match) {
        foldedRanges(view.state).between(match.from, match.to, (from, to) => {
            effects.push(unfoldEffect.of({from, to}));
        });
        effects.push(EditorView.scrollIntoView(match.from, {y: "center"}));
    }
    view.dispatch({effects});
}

// ---------------------------------------------------------------------------
// Read-only JSON: clicking a line shows Copy (the value, ready to paste) and Path (e.g. data.items[0].id) at its end;
// double clicking a value selects all of it (the text inside the quotes, or the whole number).

/** What the Copy / Path buttons on a line copy; null for lines that only close an object or array. */
/** What the copy chip on line `lineNo` copies; `from` is where the value starts (the chip goes there). */
export function copyTargetAt(state: EditorState, lineNo: number): { value: string; path: string; from: number } | null {
    if (lineNo < 1 || lineNo > state.doc.lines) return null;
    const line = state.doc.line(lineNo);
    const text = line.text.trim();
    if (!text || /^[\]}],?$/.test(text)) return null;
    const node = valueNodeAt(state, line.from);
    if (!node) return null;
    return {value: valueText(state, node), path: jsonPathAt(state, line.from), from: Math.max(node.from, line.from)};
}

/** The range a double click at `pos` should select: a string's contents or a whole number / literal. */
export function valueRangeAt(state: EditorState, pos: number): { from: number; to: number } | null {
    for (const side of [1, -1] as const) {
        const node = tree(state).resolveInner(pos, side);
        if (node.from > pos || node.to < pos) continue;
        if ((node.name === "String" || node.name === "PropertyName") && node.to - node.from >= 2) return {from: node.from + 1, to: node.to - 1};
        if (["Number", "True", "False", "Null"].includes(node.name)) return {from: node.from, to: node.to};
    }
    return null;
}

const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

type Copier = (text: string) => Promise<boolean>;

/** The buttons shown over a clicked value: copy the value, and its path. */
function copyTipDom(value: string, path: string, copy: Copier): HTMLElement {
    const wrap = document.createElement("div");
    const button = (label: string, title: string, text: string, icon: boolean) => {
        const b = document.createElement("button");
        b.type = "button";
        b.title = title;
        const name = document.createElement("span");
        const paint = (done: boolean) => {
            b.classList.toggle("is-done", done);
            b.innerHTML = icon || done ? (done ? CHECK_ICON : COPY_ICON) : "";
            name.textContent = done ? "Copied" : label;
            b.append(name);
        };
        paint(false);
        b.addEventListener("mousedown", (e) => e.preventDefault());   // keep the cursor and selection where they are
        b.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.isTrusted || !(await copy(text))) return;
            paint(true);
            window.setTimeout(() => paint(false), 1200);
        });
        return b;
    };
    wrap.append(button("Copy", `Copy the value of ${path || "the whole body"}`, value, true));
    if (path) wrap.append(button("Path", `Copy the path ${path}`, path, false));
    return wrap;
}

const setChipLine = StateEffect.define<number | null>();

/**
 * Clicking a line (a plain click, no selection) shows its Copy / Path buttons; they stay until the next click,
 * a selection, a key press or leaving the viewer. Nothing appears while a button is held down, so selecting
 * text is never in the way.
 */
export function copyOnClick(copy: Copier): Extension {
    const field = StateField.define<{ line: number | null; deco: DecorationSet; tip: Tooltip | null }>({
        create: () => ({line: null, deco: Decoration.none, tip: null}),
        update(current, tr) {
            let line = tr.docChanged ? null : current.line;
            for (const effect of tr.effects) if (effect.is(setChipLine)) line = effect.value;
            if (tr.selection && !tr.state.selection.main.empty) line = null;
            if (line === current.line && !tr.docChanged) return current;
            if (line === null || line > tr.state.doc.lines) return {line: null, deco: Decoration.none, tip: null};
            const target = copyTargetAt(tr.state, line);
            const deco = Decoration.set([Decoration.line({class: "cm-chip-line"}).range(tr.state.doc.line(line).from)]);
            // Above where the value starts (its first line, for an object or a long wrapped string); below on the
            // first line, where above would cover the response tabs.
            const tip: Tooltip | null = target && {
                pos: target.from,
                above: line > 1,
                arrow: true,
                create: () => {
                    const dom = copyTipDom(target.value, target.path, copy);
                    dom.className = "cm-copy-tip";
                    return {dom};
                },
            };
            return {line, deco, tip};
        },
        provide: (f) => [EditorView.decorations.from(f, (v) => v.deco), showTooltip.from(f, (v) => v.tip)],
    });
    const show = (view: EditorView, line: number | null) => {
        if (line !== view.state.field(field).line) view.dispatch({effects: setChipLine.of(line)});
    };
    return [
        field,
        EditorView.domEventHandlers({
            mousedown(e, view) {
                if ((e.target as HTMLElement).closest?.(".cm-copy-tip") || e.button !== 0) return false;
                show(view, null);
                const x = e.clientX, y = e.clientY;
                const up = (u: MouseEvent) => {
                    window.removeEventListener("mouseup", up, true);
                    // a click, not a drag: the cursor landed without selecting anything
                    if (Math.abs(u.clientX - x) > 3 || Math.abs(u.clientY - y) > 3 || u.detail > 1) return;
                    const sel = view.state.selection.main;
                    if (sel.empty) show(view, view.state.doc.lineAt(sel.head).number);
                };
                window.addEventListener("mouseup", up, true);
                return false;
            },
            keydown(_e, view) {
                show(view, null);
                return false;
            },
            blur(_e, view) {
                show(view, null);
                return false;
            },
            dblclick(e, view) {
                const pos = view.posAtCoords({x: e.clientX, y: e.clientY});
                const range = pos === null ? null : valueRangeAt(view.state, pos);
                if (!range) return false;
                e.preventDefault();
                view.dispatch({selection: {anchor: range.from, head: range.to}});
                return true;
            },
        }),
    ];
}

// ---------------------------------------------------------------------------
// Enum values in an editable body: a value whose schema lists the allowed values gets a "Choose" button. Typing in
// it suggests the allowed values (Tab or Enter takes the highlighted one); the button or Ctrl+Space lists them all.

/** The values allowed at a JSON path, or null when the schema does not list them. */
export type EnumChoices = (path: (string | number)[]) => unknown[] | null;

const SCALARS = new Set(["String", "Number", "True", "False", "Null"]);
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const choiceLabel = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

function parseScalar(text: string): { ok: boolean; value?: unknown } {
    try {
        return {ok: true, value: JSON.parse(text)};
    } catch {
        return {ok: false};
    }
}

/** A scalar value that is an object property or an array item, with the values its schema allows. */
export function enumTarget(state: EditorState, node: SyntaxNode | null, choices: EnumChoices): { from: number; to: number; choices: unknown[]; current: unknown; valid: boolean } | null {
    if (!node || !SCALARS.has(node.name) || (node.parent?.name !== "Property" && node.parent?.name !== "Array")) return null;
    const options = choices(pathParts(state, node));
    if (!options?.length) return null;
    const current = parseScalar(state.sliceDoc(node.from, node.to));
    return {from: node.from, to: node.to, choices: options, current: current.value, valid: current.ok && options.some((o) => sameValue(o, current.value))};
}

export interface EnumEdit {
    /** The text a picked value replaces. */
    from: number;
    to: number;
    /** Where the typed part starts (after the opening quote); the text from here to the cursor filters the list. */
    typedFrom: number;
    choices: unknown[];
    current: unknown;
}

/**
 * The enum value the cursor is in: a complete one (`"ERR|OR_REPORT"`), or one still being typed after its key, which
 * is not a complete JSON value yet (`"type": "ERR|`).
 */
export function enumEditAt(state: EditorState, pos: number, choices: EnumChoices): EnumEdit | null {
    for (const side of [-1, 1] as const) {
        const node = syntaxTree(state).resolveInner(pos, side);
        if (!SCALARS.has(node.name) || node.from > pos || node.to < pos) continue;
        const target = enumTarget(state, node, choices);
        if (!target) continue;
        const typedFrom = node.name === "String" ? Math.max(node.from, Math.min(pos, node.from + 1)) : node.from;
        return {from: target.from, to: target.to, typedFrom, choices: target.choices, current: target.current};
    }
    const line = state.doc.lineAt(pos);
    const match = /"((?:[^"\\\n]|\\.)*)"\s*:\s*("?)([^",{}[\]\n]*)$/.exec(line.text.slice(0, pos - line.from));
    if (!match) return null;
    const [, rawKey, quote, typed] = match;
    let key: string;
    try {
        key = JSON.parse(`"${rawKey}"`) as string;
    } catch {
        return null;
    }
    let object: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1);
    while (object && object.name !== "Object") object = object.parent;
    const options = choices([...(object ? pathParts(state, object) : []), key]);
    if (!options?.length) return null;
    const typedFrom = pos - typed.length;
    const closing = quote && state.sliceDoc(pos, pos + 1) === '"' ? 1 : 0;
    return {from: typedFrom - quote.length, to: pos + closing, typedFrom, choices: options, current: parseScalar(`${quote}${typed}${quote}`).value};
}

/** Tells the enum picker that the schema changed (another content type, another endpoint). */
export const refreshEnums = StateEffect.define<null>();

/** Puts `choice` in place of the enum value at `target`, the cursor right after it. */
function setEnumValue(view: EditorView, target: { from: number; to: number }, choice: unknown) {
    const text = JSON.stringify(choice);
    view.dispatch({changes: {from: target.from, to: target.to, insert: text}, selection: {anchor: target.from + text.length}, userEvent: "input.complete"});
}

/** Alt+↑ / Alt+↓ on an enum value: the previous / next allowed value, no list needed. Elsewhere the keys do what they did. */
function cycleEnum(choices: EnumChoices, step: 1 | -1) {
    return (view: EditorView) => {
        const target = enumTarget(view.state, valueNodeAt(view.state, view.state.selection.main.head), choices);
        if (!target) return false;
        const at = target.choices.findIndex((c) => sameValue(c, target.current));
        const next = at < 0 ? (step > 0 ? 0 : target.choices.length - 1) : (at + step + target.choices.length) % target.choices.length;
        setEnumValue(view, target, target.choices[next]);
        return true;
    };
}

/** Why a value is not one of the allowed ones, for the tooltip on its red underline. */
export function enumProblem(text: string, choices: unknown[]): string {
    const allowed = choices.map(choiceLabel).join(", ");
    const parsed = parseScalar(text);
    if (!parsed.ok) return `Not a complete value. Allowed values: ${allowed}.`;
    if (parsed.value === null) return `null is not allowed here. Allowed values: ${allowed}.`;
    const value = parsed.value;
    const near = typeof value === "string" ? choices.find((c) => typeof c === "string" && c.toLowerCase() === value.toLowerCase()) : undefined;
    if (near !== undefined) return `${text} is not an allowed value (the case differs). Did you mean ${JSON.stringify(near)}?`;
    const wrongType = !choices.some((c) => c !== null && typeof c === typeof value);
    return wrongType
        ? `${text} is a ${typeof value}, but this field takes one of: ${allowed}.`
        : `${text} is not an allowed value. Allowed values: ${allowed}.`;
}

/** How long the pointer rests on a red value before its reason shows. */
const PROBLEM_HOVER_MS = 2000;

/**
 * Opens the list of an enum's values at a point on screen; `pick` puts one in the field. The list also takes a
 * value that is not in it (typed into it), handed to `pick` as well. `from` is the editor (the list goes next to it).
 */
export type EnumMenu = (at: { x: number; y: number }, choices: unknown[], current: unknown, pick: (value: unknown) => void, from: Element) => void;

const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

/** Highlight class of a JSON literal, so the button keeps the colors of the text it stands for. */
function literalClass(value: unknown): string {
    if (typeof value === "string") return "cm-enum-str";
    if (typeof value === "number") return "cm-enum-num";
    if (typeof value === "boolean") return "cm-enum-bool";
    return "cm-enum-null";
}

/** An enum value as one dropdown button: the value, a line, a ⌄. A click opens the list; no cursor goes in. */
class EnumButton extends WidgetType {
    constructor(readonly text: string, readonly current: unknown, readonly valid: boolean, readonly open: (view: EditorView, button: HTMLElement) => void) {
        super();
    }

    eq(other: EnumButton) {
        return other.text === this.text && other.valid === this.valid;
    }

    toDOM(view: EditorView) {
        const button = document.createElement("span");
        button.className = `cm-enum-btn${this.valid ? "" : " is-invalid"}`;
        button.setAttribute("role", "button");
        button.setAttribute("aria-haspopup", "listbox");
        if (this.valid) button.title = "Choose a value (Ctrl+Space; Alt+↑ / Alt+↓ steps through them)";
        const label = document.createElement("span");
        label.className = `cm-enum-label ${literalClass(this.current)}`;
        label.textContent = this.text;
        const arrow = document.createElement("span");
        arrow.className = "cm-enum-arrow";
        arrow.innerHTML = CHEVRON_ICON;
        button.append(label, arrow);
        button.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();   // no cursor, no selection: a click only opens the list
            e.stopPropagation();
            this.open(view, button);
        });
        return button;
    }

    ignoreEvent() {
        return true;
    }
}

/**
 * Enum values in an editable body, drawn as dropdown buttons: a click (or Ctrl+Space on the line) lists the allowed
 * values, Alt+↑ / Alt+↓ step through them, and a value outside the list is typed into the list itself. The value is
 * one piece, so the cursor steps over it and Backspace / Delete remove it whole. A value that is not allowed is red;
 * resting the pointer on it says why. While a value is still being typed (not a complete JSON value yet), the
 * allowed values are suggested.
 */
export function enumPicker(choices: EnumChoices, menu: EnumMenu): Extension {
    // suggestions while a value is still being typed: `"type": "ERR|`
    const source = (context: CompletionContext): CompletionResult | null => {
        const edit = enumEditAt(context.state, context.pos, choices);
        if (!edit) return null;
        return {
            from: context.explicit ? context.pos : edit.typedFrom,
            options: edit.choices.map((choice) => ({
                label: choiceLabel(choice),
                apply: (view: EditorView) => {
                    const at = enumEditAt(view.state, view.state.selection.main.head, choices);
                    if (at) setEnumValue(view, at, choice);
                },
            })),
            validFor: /^[^",{}[\]\n]*$/,
        };
    };

    /** Lists the values of the enum at `target` under `anchor` (its button), or under the value itself. */
    const show = (view: EditorView, target: NonNullable<ReturnType<typeof enumTarget>>, anchor?: HTMLElement) => {
        const rect = anchor?.getBoundingClientRect();
        const coords = rect ? {left: rect.left, bottom: rect.bottom} : view.coordsAtPos(target.from, 1);
        if (!coords) return;
        const original = view.state.sliceDoc(target.from, target.to);
        menu({x: coords.left, y: coords.bottom + 3}, target.choices, target.current, (value) => {
            if (view.state.sliceDoc(target.from, target.to) !== original) return;   // edited while the list was open
            setEnumValue(view, target, value);
            view.focus();
        }, view.dom);
    };
    const openFromButton = (view: EditorView, button: HTMLElement) => {
        const pos = view.posAtDOM(button);
        const target = enumTarget(view.state, syntaxTree(view.state).resolveInner(pos, 1), choices);
        if (target) show(view, target, button);
    };

    const build = (view: EditorView): DecorationSet => {
        const decorations: Range<Decoration>[] = [];
        const state = view.state;
        for (const {from, to} of view.visibleRanges) {
            syntaxTree(state).iterate({
                from, to,
                enter: (ref) => {
                    if (!SCALARS.has(ref.name)) return;
                    const target = enumTarget(state, ref.node, choices);
                    if (target) {
                        const widget = new EnumButton(state.sliceDoc(target.from, target.to), target.current, target.valid, openFromButton);
                        decorations.push(Decoration.replace({widget}).range(target.from, target.to));
                    }
                    return false;
                },
            });
        }
        return Decoration.set(decorations, true);
    };

    const plugin = ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = build(view);
        }

        update(update: ViewUpdate) {
            const refreshed = update.transactions.some((tr) => tr.effects.some((e) => e.is(refreshEnums)));
            if (refreshed || update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
                this.decorations = build(update.view);
            }
        }
    }, {
        decorations: (v) => v.decorations,
        // the cursor steps over a button and Backspace / Delete remove it whole, never one letter of it
        provide: (p) => EditorView.atomicRanges.of((view) => view.plugin(p)?.decorations ?? Decoration.none),
    });

    // the reason a value is red, after the pointer rests on it a moment
    const problemTip = hoverTooltip((view, pos, side) => {
        const node = syntaxTree(view.state).resolveInner(pos, side);
        const target = enumTarget(view.state, node, choices);
        if (!target || target.valid) return null;
        return {
            pos: target.from,
            end: target.to,
            above: true,
            create: () => {
                const dom = document.createElement("div");
                dom.className = "cm-enum-problem";
                dom.textContent = enumProblem(view.state.sliceDoc(target.from, target.to), target.choices);
                return {dom};
            },
        };
    }, {hoverTime: PROBLEM_HOVER_MS});

    return [
        plugin,
        problemTip,
        autocompletion({override: [source], icons: false, maxRenderedOptions: 300}),
        Prec.high(keymap.of([
            // Tab takes the highlighted suggestion; without a list open it indents as before
            {key: "Tab", run: acceptCompletion},
            {key: "Alt-ArrowUp", run: cycleEnum(choices, -1)},
            {key: "Alt-ArrowDown", run: cycleEnum(choices, 1)},
            {
                // the list of the enum on the cursor's line, from the keyboard
                key: "Ctrl-Space",
                run: (view) => {
                    const target = enumTarget(view.state, valueNodeAt(view.state, view.state.selection.main.head), choices);
                    if (!target) return false;
                    show(view, target);
                    return true;
                },
            },
        ])),
    ];
}

// ---------------------------------------------------------------------------
// Read-only JSON: values quoted inside a text, e.g. the allowed values in "Input should be 'A', 'B' or 'C'", stand out.

/**
 * Ranges (relative to `text`) of the 'quoted' words in it, quotes included. Only a word without spaces counts, set
 * off by spaces or punctuation, so apostrophes ("it's", "users' names") are left alone.
 */
export function quotedRanges(text: string): { from: number; to: number }[] {
    const ranges: { from: number; to: number }[] = [];
    const pattern = /(^|[\s([{,:=])('[^'\s]{1,80}')(?=$|[\s)\]},.:;!?])/g;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        const from = match.index + match[1].length;
        ranges.push({from, to: from + match[2].length});
        pattern.lastIndex = from + match[2].length;   // the closing quote may open nothing: next search starts after it
    }
    return ranges;
}

export const quotedValues: Extension = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) this.decorations = this.build(update.view);
    }

    build(view: EditorView): DecorationSet {
        const marks: Range<Decoration>[] = [];
        const mark = Decoration.mark({class: "cm-quoted"});
        for (const {from, to} of view.visibleRanges) {
            syntaxTree(view.state).iterate({
                from, to,
                enter: (ref) => {
                    if (ref.name !== "String") return;
                    const text = view.state.sliceDoc(ref.from + 1, ref.to - 1);
                    for (const range of quotedRanges(text)) marks.push(mark.range(ref.from + 1 + range.from, ref.from + 1 + range.to));
                },
            });
        }
        return Decoration.set(marks, true);
    }
}, {decorations: (v) => v.decorations});

// ---------------------------------------------------------------------------
// Body editor and response viewer: below a field whose type says more than string / number / boolean (a uuid, a
// date, an enum…), a small line with that type and the allowed values, hung on a branch that comes down from the
// field and turns right, like a tree. In the editor the values of an enum can be clicked to put them in the field:
//     "type": "ERROR_REPORT",
//      └─▸ FeedbackType (ERROR_REPORT | FEATURE_REQUEST | OTHER)

/** The hint for the field at a JSON path, or null when it needs none. */
export type FieldHints = (path: (string | number)[]) => FieldHint | null;

/** Bodies longer than this get no hints: walking them on every key press would slow typing down. */
const HINT_MAX_DOC = 200_000;
/** Values listed on a hint line; the rest is counted. */
const HINT_LISTED = 8;

const hintText = (key: string | null, hint: FieldHint) => `${key === null ? "" : `${key}: `}${hint.type}${hint.values ? ` (${hint.values})` : ""}`;

interface HintItem {
    key: string | null;
    hint: FieldHint;
    /** In an editor, the values of an enum to click and the one the field has now. */
    pick?: { choices: unknown[]; current: unknown };
}

class HintLine extends WidgetType {
    constructor(readonly items: HintItem[], readonly indent: string, readonly choices: EnumChoices | null) {
        super();
    }

    eq(other: HintLine) {
        return other.indent === this.indent && JSON.stringify(other.items) === JSON.stringify(this.items);
    }

    toDOM(view: EditorView) {
        const line = document.createElement("div");
        line.className = "cm-field-hint";
        const indent = document.createElement("span");
        indent.className = "cm-hint-indent";   // in the size of the code, so the branch starts under the key
        indent.textContent = this.indent;
        const branch = document.createElement("span");
        branch.className = "cm-hint-branch";
        const body = document.createElement("span");
        body.className = "cm-hint-body";
        for (const {key, hint, pick} of this.items) {
            const row = document.createElement("span");
            row.className = "cm-hint-row";
            if (key !== null) {
                const name = document.createElement("span");
                name.className = "cm-hint-key";
                name.textContent = `${key}: `;
                row.append(name);
            }
            const type = document.createElement("span");
            type.className = "cm-hint-type";
            type.textContent = hint.type;
            row.append(type);
            if (pick) {
                row.append(this.pickable(view, line, pick));
            } else if (hint.values) {
                const values = document.createElement("span");
                values.className = "cm-hint-values";
                values.textContent = ` (${hint.values})`;
                row.append(values);
            }
            body.append(row);
        }
        line.append(indent, branch, body);
        line.title = this.items.filter((i) => !i.pick).map(({key, hint}) => hintText(key, hint)).join("\n");
        return line;
    }

    /** " (A | B | C)" with each value a link that puts it in the field above. */
    private pickable(view: EditorView, line: HTMLElement, pick: NonNullable<HintItem["pick"]>): HTMLElement {
        const values = document.createElement("span");
        values.className = "cm-hint-values";
        values.append(" (");
        pick.choices.slice(0, HINT_LISTED).forEach((choice, i) => {
            if (i) values.append(" | ");
            const current = sameValue(choice, pick.current);
            const value = document.createElement("span");
            value.className = `cm-hint-value${current ? " is-current" : ""}`;
            value.textContent = choiceLabel(choice);
            value.title = current ? "The current value" : `Use ${JSON.stringify(choice)}`;
            value.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                if (!this.choices) return;
                // the field above this line, found again: the text may have moved since this was drawn
                const at = view.state.doc.lineAt(view.posAtDOM(line));
                const target = enumTarget(view.state, valueNodeAt(view.state, at.from), this.choices);
                if (!target) return;
                setEnumValue(view, target, choice);
                view.focus();
            });
            values.append(value);
        });
        const hidden = pick.choices.length - HINT_LISTED;
        values.append(hidden > 0 ? ` | … ${hidden} more)` : ")");
        return values;
    }

    get estimatedHeight() {
        return 17 * this.items.length;
    }

    ignoreEvent() {
        return true;
    }
}

function buildHints(state: EditorState, hints: FieldHints, choices: EnumChoices | null): DecorationSet {
    if (state.doc.length > HINT_MAX_DOC) return Decoration.none;
    const lines = new Map<number, HintItem[]>();
    tree(state).iterate({
        enter: (ref) => {
            if (ref.name !== "Property") return;
            const name = ref.node.getChild("PropertyName");
            if (!name) return;
            const hint = hints(pathParts(state, name));
            if (!hint) return;
            const item: HintItem = {key: keyText(state, name), hint};
            if (choices) {
                let value: SyntaxNode | null = ref.node.lastChild;
                while (value && !VALUE_TYPES.has(value.name)) value = value.prevSibling;
                const target = enumTarget(state, value, choices);
                if (target) item.pick = {choices: target.choices, current: target.current};
            }
            const line = state.doc.lineAt(name.from).number;
            lines.set(line, [...(lines.get(line) ?? []), item]);
        },
    });
    const decorations: Range<Decoration>[] = [];
    for (const [number, items] of lines) {
        const line = state.doc.line(number);
        const indent = line.text.slice(0, line.text.length - line.text.trimStart().length);
        // one field on the line: its key is right above, so the hint leaves it out (and its values are unambiguous);
        // several: each says whose it is, and their values are only listed
        const shown = items.length === 1 ? [{...items[0], key: null}] : items.map(({key, hint}) => ({key, hint}));
        decorations.push(Decoration.widget({widget: new HintLine(shown, indent, choices), block: true, side: 1}).range(line.to));
    }
    return Decoration.set(decorations, true);
}

/**
 * The hint lines; with `choices` (an editor) the values of enums can be clicked. Block widgets change the height of
 * the document, so they come from a state field, not a view plugin.
 */
export function fieldHintLines(hints: FieldHints, choices: EnumChoices | null = null): Extension {
    return StateField.define<DecorationSet>({
        create: (state) => buildHints(state, hints, choices),
        update(value, tr) {
            const refreshed = tr.effects.some((e) => e.is(refreshEnums));
            if (refreshed || tr.docChanged || syntaxTree(tr.startState) !== syntaxTree(tr.state)) return buildHints(tr.state, hints, choices);
            return value;
        },
        provide: (field) => EditorView.decorations.from(field),
    });
}

// ---------------------------------------------------------------------------
// Editable body: a value that does not fit its schema (a number for a string, null where null is not allowed, a
// malformed uuid…) is underlined in red, and a few words at the end of its line say why, like a comment:
//     "product": 4,        // expected string, got integer
// The note is drawn, not text: it cannot be selected, copied or sent.

/** What is wrong with `value` at a JSON path, or null. */
export type ValueProblems = (path: (string | number)[], value: unknown) => string | null;

class ProblemNote extends WidgetType {
    constructor(readonly text: string) {
        super();
    }

    eq(other: ProblemNote) {
        return other.text === this.text;
    }

    toDOM() {
        const note = document.createElement("span");
        note.className = "cm-value-note";
        note.textContent = `// ${this.text}`;
        return note;
    }
}

/** The value of a node to check: scalars as they are, objects and arrays only by their type. */
function checkedValue(state: EditorState, node: SyntaxNode): { ok: boolean; value?: unknown } {
    if (node.name === "Object") return {ok: true, value: {}};
    if (node.name === "Array") return {ok: true, value: []};
    return parseScalar(state.sliceDoc(node.from, node.to));
}

/** `choices` tells enum fields apart: their box (enumPicker) already turns red, so they only get the note. */
export function valueProblems(problems: ValueProblems, choices: EnumChoices): Extension {
    const build = (view: EditorView): DecorationSet => {
        const state = view.state;
        const marks: Range<Decoration>[] = [];
        const notes = new Map<number, string[]>();
        for (const {from, to} of view.visibleRanges) {
            syntaxTree(state).iterate({
                from, to,
                enter: (ref) => {
                    if (!VALUE_TYPES.has(ref.name)) return;
                    const node = ref.node;
                    if (node.parent?.name !== "Property" && node.parent?.name !== "Array") return;
                    const value = checkedValue(state, node);
                    if (!value.ok) return;
                    const path = pathParts(state, node);
                    const problem = problems(path, value.value);
                    if (!problem) return;
                    if (SCALARS.has(node.name) && !choices(path)) marks.push(Decoration.mark({class: "cm-value-invalid"}).range(node.from, node.to));
                    const line = state.doc.lineAt(node.from).to;
                    notes.set(line, [...(notes.get(line) ?? []), problem]);
                },
            });
        }
        for (const [at, texts] of notes) marks.push(Decoration.widget({widget: new ProblemNote(texts.join("; ")), side: 1}).range(at));
        return Decoration.set(marks, true);
    };

    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = build(view);
        }

        update(update: ViewUpdate) {
            const refreshed = update.transactions.some((tr) => tr.effects.some((e) => e.is(refreshEnums)));
            if (refreshed || update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
                this.decorations = build(update.view);
            }
        }
    }, {decorations: (v) => v.decorations});
}
