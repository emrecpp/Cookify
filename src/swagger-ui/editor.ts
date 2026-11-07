// CodeMirror pieces for the JSON editor/viewer: theme, JSON paths, step-wise folding, line marks and
// a search that folds Turkish/accented letters (so "istanbul" finds "İstanbul" and "sisli" finds "Şişli").
import {ensureSyntaxTree, foldedRanges, foldEffect, HighlightStyle, syntaxTree, unfoldEffect} from "@codemirror/language";
import {SearchCursor} from "@codemirror/search";
import {EditorState, Extension, StateEffect, StateField} from "@codemirror/state";
import {Decoration, DecorationSet, EditorView, showTooltip, Tooltip} from "@codemirror/view";
import {tags as t} from "@lezer/highlight";
import type {SyntaxNode} from "@lezer/common";

export const jsonHighlight = HighlightStyle.define([
    {tag: t.propertyName, color: "var(--j-key)"},
    {tag: t.string, color: "var(--j-str)"},
    {tag: t.number, color: "var(--j-num)"},
    {tag: t.bool, color: "var(--j-bool)"},
    {tag: t.null, color: "var(--j-null)"},
    {tag: [t.brace, t.squareBracket, t.separator, t.punctuation], color: "var(--j-punct)"},
]);

export const editorTheme = EditorView.theme({
    "&": {fontSize: "var(--cf-code-font, 13px)", backgroundColor: "var(--input)", color: "var(--text)"},
    "&.cm-focused": {outline: "none"},
    ".cm-scroller": {fontFamily: "var(--mono)", lineHeight: "calc(var(--cf-code-font, 13px) + 7px)"},
    ".cm-content": {padding: "4px 0", caretColor: "var(--strong)"},
    ".cm-line": {padding: "0 8px 0 4px"},
    ".cm-gutters": {backgroundColor: "var(--input)", color: "var(--faint)", border: "none", borderRight: "1px solid var(--border)"},
    ".cm-lineNumbers .cm-gutterElement": {padding: "0 6px 0 8px", minWidth: "28px", fontSize: "calc(var(--cf-code-font, 13px) - 1px)"},
    ".cm-foldGutter .cm-gutterElement": {width: "14px", textAlign: "center", color: "var(--muted)", cursor: "pointer"},
    ".cm-foldGutter .cm-gutterElement:hover": {color: "var(--strong)"},
    ".cm-activeLine": {backgroundColor: "transparent"},
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {backgroundColor: "color-mix(in srgb, var(--accent) 35%, transparent) !important"},
    ".cm-cursor": {borderLeftColor: "var(--strong)"},
    ".cm-matchingBracket": {backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)", outline: "none"},
    ".cm-selectionMatch": {backgroundColor: "color-mix(in srgb, var(--fav) 22%, transparent)"},
    ".cm-searchMatch": {backgroundColor: "color-mix(in srgb, var(--fav) 30%, transparent)", outline: "1px solid color-mix(in srgb, var(--fav) 60%, transparent)"},
    ".cm-searchMatch-selected": {backgroundColor: "color-mix(in srgb, var(--fav) 70%, transparent)", color: "#111"},
    ".cm-foldPlaceholder": {backgroundColor: "var(--bar)", border: "1px solid var(--border-strong)", color: "var(--muted)", borderRadius: "2px", padding: "0 4px", margin: "0 2px", fontFamily: "var(--mono)"},
    ".cm-placeholder": {color: "var(--faint)"},
    ".cm-error-line": {backgroundColor: "color-mix(in srgb, var(--err) 14%, transparent)"},
    ".cm-chip-line": {backgroundColor: "color-mix(in srgb, var(--text) 5%, transparent)"},
    // Floats over the text above the value, so nothing moves; only the buttons take the mouse, a drag that starts
    // anywhere else around them still selects the text underneath.
    ".cm-tooltip.cm-copy-tip": {
        display: "inline-flex", gap: "3px", padding: "2px", background: "var(--bar)", border: "1px solid var(--border-strong)",
        borderRadius: "3px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)", userSelect: "none", pointerEvents: "none",
    },
    ".cm-tooltip.cm-copy-tip .cm-tooltip-arrow:before": {borderTopColor: "var(--border-strong)", borderBottomColor: "var(--border-strong)"},
    ".cm-tooltip.cm-copy-tip .cm-tooltip-arrow:after": {borderTopColor: "var(--bar)", borderBottomColor: "var(--bar)"},
    ".cm-copy-tip button": {
        display: "inline-flex", alignItems: "center", gap: "3px", height: "18px", padding: "0 6px", font: "11px/14px var(--font)",
        color: "var(--muted)", background: "transparent", border: "1px solid transparent", borderRadius: "2px", cursor: "pointer", pointerEvents: "auto",
    },
    ".cm-copy-tip button:hover": {color: "var(--strong)", background: "var(--hover)", borderColor: "var(--border-strong)"},
    ".cm-copy-tip button.is-done": {color: "var(--ok)"},
    ".cm-copy-tip svg": {width: "11px", height: "11px", flex: "none"},
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

export function jsonPathAt(state: EditorState, at: number): string {
    const parts: string[] = [];
    let node: SyntaxNode | null = tree(state).resolveInner(linePos(state, at), 1);
    while (node && node.parent) {
        const parent: SyntaxNode = node.parent;
        if (parent.name === "Property") {
            const name = parent.getChild("PropertyName");
            if (name) {
                const key = keyText(state, name);
                parts.unshift(/^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`);
            }
            node = parent.parent;
            continue;
        }
        if (parent.name === "Array" && VALUE_TYPES.has(node.name)) {
            let index = 0;
            for (let child = parent.firstChild; child && child.from < node.from; child = child.nextSibling) {
                if (VALUE_TYPES.has(child.name)) index++;
            }
            parts.unshift(`[${index}]`);
        }
        node = parent;
    }
    return parts.join("").replace(/^\./, "");
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
