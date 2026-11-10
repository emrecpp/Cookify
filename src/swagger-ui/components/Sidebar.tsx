import {ArrowUpToLine, ChevronRight, Play} from "lucide-react";
import {memo, ReactNode, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {HttpMethod, Operation, ParsedSpec} from "../openapi";
import {actions, apiStore, notify, prefsStore, requestSend, sessionStore, updatePrefs} from "../state";
import {useStore} from "../store";
import {buildRequest, defaultDraft} from "../request";
import {acknowledgeSpecChanges, specDiffStore} from "../session";
import {SNIPPETS} from "../snippets";
import {copyText} from "../clipboard";
import {MenuItem, openMenu} from "./Menu";
import {statusClass} from "./ResponseView";

const METHOD_FILTERS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];
const RECENT_LIMIT = 8;

type GroupKind = "fav" | "recent" | "changes" | "tag";

type Row =
    | { type: "group"; id: string; kind: GroupKind; label: string; count: number; collapsed: boolean }
    | { type: "op"; id: string; kind: GroupKind; op: Operation };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function highlight(text: string, pattern: RegExp | null): ReactNode {
    if (!pattern || !text) return text;
    return text.split(pattern).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

export function PathText({path, pattern = null}: { path: string; pattern?: RegExp | null }) {
    return (
        <>
            {path.split(/(\{[^}]+\})/).map((part, i) => (
                part.startsWith("{")
                    ? <span key={i} className="cf-path-param">{highlight(part, pattern)}</span>
                    : <span key={i}>{highlight(part, pattern)}</span>
            ))}
        </>
    );
}

export const methodLabel = (method: string) => (method === "delete" ? "DEL" : method === "options" ? "OPT" : method.toUpperCase());

interface ItemProps {
    op: Operation;
    rowId: string;
    selected: boolean;
    cursor: boolean;
    favorite: boolean;
    draggableFav: boolean;
    showSummary: boolean;
    badge?: "new" | "changed";
    pattern: RegExp | null;
    onOpen: (key: string, pin: boolean) => void;
    onDragStart: (key: string) => void;
    onDropOn: (key: string) => void;
    onMenu: (event: React.MouseEvent, op: Operation, kind: GroupKind) => void;
    kind: GroupKind;
}

const EndpointItem = memo(function EndpointItem(props: ItemProps) {
    const {op, rowId, selected, cursor, favorite, draggableFav, showSummary, badge, pattern, onOpen, onDragStart, onDropOn, onMenu, kind} = props;
    const status = useStore(sessionStore, (s) => s.responses[op.key]?.status);
    const loading = useStore(sessionStore, (s) => !!s.loading[op.key]);
    const label = showSummary && op.summary
        ? <span className="cf-item-name">{highlight(op.summary, pattern)}</span>
        : <span className="cf-item-path"><PathText path={op.path} pattern={pattern}/></span>;
    return (
        <div
            className={`cf-item ${selected ? "is-selected" : ""} ${cursor ? "is-cursor" : ""} ${op.deprecated ? "is-deprecated" : ""}`}
            data-row-id={rowId}
            title={`${op.method.toUpperCase()} ${op.path}${op.summary ? `\n${op.summary}` : ""}${op.secured ? "\nRequires authorization" : ""}`}
            onClick={() => onOpen(op.key, false)}
            onDoubleClick={() => onOpen(op.key, true)}
            onAuxClick={(e) => e.button === 1 && onOpen(op.key, true)}
            onContextMenu={(e) => onMenu(e, op, kind)}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", op.key);
                onDragStart(op.key);
            }}
            onDragOver={(e) => {
                if (!draggableFav) return;
                e.preventDefault();
                e.currentTarget.classList.add("is-drop");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("is-drop")}
            onDrop={(e) => {
                e.currentTarget.classList.remove("is-drop");
                if (!draggableFav) return;
                e.preventDefault();
                onDropOn(op.key);
            }}
        >
            <span className={`cf-verb m-${op.method}`}>{methodLabel(op.method)}</span>
            {label}
            {badge && <span className={`cf-badge is-${badge}`}>{badge}</span>}
            {status !== undefined && <span className={`cf-dot ${statusClass(status)}`} title={`Last response: ${status || "error"}`}/>}
            {selected && (
                <button
                    className="cf-run"
                    title={loading ? "Sending…" : "Send (Ctrl+Enter)"}
                    disabled={loading}
                    onClick={(e) => {
                        e.stopPropagation();
                        requestSend(op.key);
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                >
                    <Play size={11} fill="currentColor"/>
                </button>
            )}
            <button
                className={`cf-star ${favorite ? "is-on" : ""}`}
                title={favorite ? "Remove from favorites" : "Add to favorites"}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.toggleFavorite(op.key);
                }}
            >
                {favorite ? "★" : "☆"}
            </button>
        </div>
    );
});

interface Props {
    spec: ParsedSpec;
    searchRef: RefObject<HTMLInputElement>;
    onOpen: (key: string, pin: boolean) => void;
}

export function Sidebar({spec, searchRef, onOpen}: Props) {
    const favorites = useStore(apiStore, (s) => s.favorites);
    const history = useStore(apiStore, (s) => s.history);
    const collapsed = useStore(apiStore, (s) => s.collapsed);
    const active = useStore(apiStore, (s) => s.active);
    const listLabel = useStore(prefsStore, (s) => s.listLabel);
    const diff = useStore(specDiffStore, (s) => s.diff);

    const [query, setQuery] = useState("");
    const [methods, setMethods] = useState<HttpMethod[]>([]);
    const [favOnly, setFavOnly] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const dragKey = useRef<string | null>(null);

    const opsByKey = useMemo(() => new Map(spec.operations.map((op) => [op.key, op])), [spec]);
    const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
    const tokens = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
    const pattern = useMemo(() => (tokens.length ? new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi") : null), [tokens]);
    const textSearch = tokens.length > 0;

    const matches = useCallback((op: Operation) => (
        (!methods.length || methods.includes(op.method))
        && (!favOnly || favoriteSet.has(op.key))
        && tokens.every((t) => op.searchText.includes(t))
    ), [methods, favOnly, favoriteSet, tokens]);

    const {rows, matchCount} = useMemo(() => {
        const out: Row[] = [];
        const matched = new Set<string>();
        const pushGroup = (kind: GroupKind, id: string, label: string, ops: Operation[], showEmpty = false) => {
            const visible = ops.filter(matches);
            if (!visible.length && !showEmpty) return;
            const isCollapsed = !textSearch && collapsed.includes(id);
            out.push({type: "group", id, kind, label, count: visible.length, collapsed: isCollapsed});
            visible.forEach((op) => matched.add(op.key));
            if (!isCollapsed) visible.forEach((op) => out.push({type: "op", id: `${id}|${op.key}`, kind, op}));
        };
        const favoriteOps = favorites.map((k) => opsByKey.get(k)).filter((o): o is Operation => !!o);
        if (favOnly) {
            pushGroup("fav", "fav", "Favorites", favoriteOps, true);
        } else {
            if (!textSearch) {
                pushGroup("fav", "fav", "Favorites", favoriteOps, !methods.length);
                const recent: Operation[] = [];
                for (const entry of history) {
                    const op = opsByKey.get(entry.key);
                    if (op && !recent.includes(op)) recent.push(op);
                    if (recent.length >= RECENT_LIMIT) break;
                }
                pushGroup("recent", "recent", "Recent", recent);
                if (diff) {
                    const changedOps = spec.operations.filter((op) => diff.added.has(op.key) || diff.changed.has(op.key));
                    pushGroup("changes", "changes", "New & changed", changedOps);
                }
            }
            spec.groups.forEach((g) => pushGroup("tag", `tag:${g.tag}`, g.tag, g.operations));
        }
        return {rows: out, matchCount: matched.size};
    }, [spec, favorites, opsByKey, history, collapsed, matches, textSearch, favOnly, methods.length, diff]);

    const opRowIds = useMemo(() => rows.filter((r) => r.type === "op").map((r) => r.id), [rows]);
    // A sticky header is pushed away only by the end of its parent: without a block per group the next header slides over it.
    const groups = useMemo(() => {
        const out: Row[][] = [];
        for (const row of rows) {
            if (row.type === "group" || !out.length) out.push([row]);
            else out[out.length - 1].push(row);
        }
        return out;
    }, [rows]);
    const cursorId = cursor && opRowIds.includes(cursor) ? cursor : (textSearch ? opRowIds[0] ?? null : null);
    const keyOfRow = (id: string) => id.slice(id.indexOf("|") + 1);

    // on page load, reveal the active endpoint in its tag group
    const revealed = useRef(false);
    useLayoutEffect(() => {
        if (revealed.current || !rows.length) return;
        revealed.current = true;
        const row = active && rows.find((r) => r.type === "op" && r.kind === "tag" && r.op.key === active);
        const list = listRef.current;
        if (!row || !list) return;
        const el = list.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(row.id)}"]`);
        if (!el) return;
        const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
        list.scrollTop = Math.max(0, top - list.clientHeight / 2);
    }, [rows, active]);

    // "Back to top" shows while scrolling away from the top and hides 3 s after scrolling stops (kept while hovered)
    const [showTop, setShowTop] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout>>();
    const topHovered = useRef(false);
    const scheduleHide = () => {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            if (!topHovered.current) setShowTop(false);
        }, 3000);
    };
    useEffect(() => () => clearTimeout(hideTimer.current), []);
    const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop > 240) {
            setShowTop(true);
            scheduleHide();
        } else {
            clearTimeout(hideTimer.current);
            setShowTop(false);
        }
    };

    const scrollToRow = (id: string) => {
        listRef.current?.querySelector(`[data-row-id="${CSS.escape(id)}"]`)?.scrollIntoView({block: "nearest"});
    };

    const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!opRowIds.length) return;
            const index = cursorId ? opRowIds.indexOf(cursorId) : -1;
            const next = opRowIds[Math.max(0, Math.min(opRowIds.length - 1, index + (e.key === "ArrowDown" ? 1 : -1)))];
            setCursor(next);
            scrollToRow(next);
            onOpen(keyOfRow(next), false);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (cursorId) onOpen(keyOfRow(cursorId), true);
        } else if (e.key === "Escape") {
            if (query) setQuery("");
            else searchRef.current?.blur();
        }
    };

    const tagIds = useMemo(() => spec.groups.map((g) => `tag:${g.tag}`), [spec]);
    const allCollapsed = tagIds.every((id) => collapsed.includes(id));

    const copy = (text: string, what: string) => void copyText(text).then((ok) => ok && notify(`${what} copied`, "ok"));

    const onItemMenu = useCallback((e: React.MouseEvent, op: Operation, kind: GroupKind) => {
        e.preventDefault();
        const state = apiStore.get();
        const baseUrl = (state.baseUrl || spec.servers[0]).replace(/\/+$/, "");
        const built = () => buildRequest(spec, op, state.drafts[op.key] ?? defaultDraft(spec, op, state.paramMemory), {
            baseUrl, token: state.token, files: sessionStore.get().files[op.key],
        });
        const isFav = state.favorites.includes(op.key);
        const favIndex = state.favorites.indexOf(op.key);
        const items: MenuItem[] = [
            {label: "Open in new tab", hint: "double click", onSelect: () => onOpen(op.key, true)},
            {label: state.pinnedTabs.includes(op.key) ? "Unpin tab" : "Open and pin tab", onSelect: () => {
                onOpen(op.key, true);
                actions.togglePinnedTab(op.key);
            }},
            {label: isFav ? "Remove from favorites" : "Add to favorites", separator: true, onSelect: () => actions.toggleFavorite(op.key)},
        ];
        if (kind === "fav" && isFav) {
            items.push(
                {label: "Move up", disabled: favIndex <= 0, onSelect: () => actions.moveFavorite(op.key, state.favorites[favIndex - 1])},
                {label: "Move down", disabled: favIndex >= state.favorites.length - 1, onSelect: () => actions.moveFavorite(state.favorites[favIndex + 1], op.key)},
            );
        }
        items.push(
            {label: "Copy path", separator: true, onSelect: () => copy(op.path, "Path")},
            {label: "Copy URL", onSelect: () => copy(built().url, "URL")},
            ...SNIPPETS.map((snippet) => ({label: `Copy as ${snippet.label}`, onSelect: () => copy(snippet.build(built()), snippet.label)})),
        );
        openMenu({x: e.clientX, y: e.clientY, items}, e.currentTarget);
    }, [spec, onOpen]);

    const onGroupMenu = (e: React.MouseEvent, row: Extract<Row, { type: "group" }>) => {
        e.preventDefault();
        const items: MenuItem[] = [];
        if (row.kind === "tag") {
            const group = spec.groups.find((g) => `tag:${g.tag}` === row.id);
            items.push(
                {label: row.collapsed ? "Expand group" : "Collapse group", onSelect: () => actions.toggleCollapsed(row.id)},
                {label: "Collapse other groups", onSelect: () => actions.setCollapsed(tagIds.filter((id) => id !== row.id))},
                {label: "Expand all groups", onSelect: () => actions.setCollapsed([])},
                {label: "Collapse all groups", onSelect: () => actions.setCollapsed(tagIds)},
            );
            if (group) {
                items.push({
                    label: `Open all ${group.operations.length} in tabs`,
                    separator: true,
                    disabled: group.operations.length > 20,
                    onSelect: () => group.operations.forEach((op) => actions.openTab(op.key, true)),
                });
            }
        } else {
            items.push({label: row.collapsed ? "Expand" : "Collapse", onSelect: () => actions.toggleCollapsed(row.id)});
            if (row.kind === "recent") items.push({label: "Clear recent", danger: true, separator: true, onSelect: () => actions.clearHistory()});
            if (row.kind === "changes") items.push({label: "Mark all as seen", separator: true, onSelect: acknowledgeSpecChanges});
        }
        openMenu({x: e.clientX, y: e.clientY, items}, e.currentTarget);
    };

    const onDragStart = useCallback((key: string) => {
        dragKey.current = key;
    }, []);
    const onDropOn = useCallback((target: string) => {
        const from = dragKey.current;
        dragKey.current = null;
        if (from && from !== target) actions.moveFavorite(from, target);
    }, []);

    return (
        <aside className="cf-sidebar">
            <div className="cf-side-top">
                <div className="cf-search">
                    <input
                        ref={searchRef}
                        value={query}
                        placeholder="Search endpoints (Ctrl+K)"
                        spellCheck={false}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onSearchKey}
                    />
                    {query && <button className="cf-search-clear" onClick={() => setQuery("")} title="Clear search">×</button>}
                </div>
                <div className="cf-filter-row">
                    <div className={`cf-filters ${methods.length || favOnly ? "has-active" : ""}`}>
                        {METHOD_FILTERS.map((m) => (
                            <button
                                key={m}
                                className={`cf-filter m-${m} ${methods.includes(m) ? "is-on" : ""}`}
                                onClick={() => setMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])}
                            >
                                {methodLabel(m)}
                            </button>
                        ))}
                        <button className={`cf-filter is-fav ${favOnly ? "is-on" : ""}`} onClick={() => setFavOnly(!favOnly)} title="Only favorites">★</button>
                    </div>
                    <span className="cf-flex"/>
                    <span className="cf-count">{matchCount === spec.operations.length ? matchCount : `${matchCount}/${spec.operations.length}`}</span>
                </div>
            </div>

            <div className="cf-side-bar">
                <div className="cf-seg">
                    <button className={listLabel === "path" ? "is-on" : ""} onClick={() => updatePrefs({listLabel: "path"})}>Path</button>
                    <button className={listLabel === "summary" ? "is-on" : ""} onClick={() => updatePrefs({listLabel: "summary"})}>Name</button>
                </div>
                <span className="cf-flex"/>
                <button className="cf-text-btn" onClick={() => actions.setCollapsed(allCollapsed ? [] : tagIds)}>
                    {allCollapsed ? "Expand all" : "Collapse all"}
                </button>
            </div>

            {diff && (
                <div className="cf-side-notice" title={diff.removed.length ? `Removed:\n${diff.removed.map((k) => k.replace(" ", " ")).join("\n")}` : undefined}>
                    <span>API changed:</span>
                    {diff.added.size > 0 && <span className="cf-badge is-new">{diff.added.size} new</span>}
                    {diff.changed.size > 0 && <span className="cf-badge is-changed">{diff.changed.size} changed</span>}
                    {diff.removed.length > 0 && <span className="cf-badge is-removed">{diff.removed.length} removed</span>}
                    <span className="cf-flex"/>
                    <button className="cf-text-btn" onClick={acknowledgeSpecChanges}>Mark seen</button>
                </div>
            )}

            {showTop && (
                <button className="cf-side-gotop" title="Scroll to the top of the list"
                        onMouseEnter={() => (topHovered.current = true)}
                        onMouseLeave={() => {
                            topHovered.current = false;
                            scheduleHide();
                        }}
                        onClick={() => {
                            topHovered.current = false;
                            listRef.current?.scrollTo({top: 0});
                        }}>
                    <ArrowUpToLine size={13}/> Back to top
                </button>
            )}
            <div className="cf-side-list" ref={listRef} onScroll={onListScroll}>
                {groups.map((group) => (
                    <div key={group[0].id} className="cf-group-block">
                        {group.map((row) => {
                            if (row.type === "group") {
                                return (
                                    <div
                                        key={row.id}
                                        className={`cf-group is-${row.kind}`}
                                        onClick={() => !textSearch && actions.toggleCollapsed(row.id)}
                                        onContextMenu={(e) => onGroupMenu(e, row)}
                                        onDragOver={(e) => row.kind === "fav" && e.preventDefault()}
                                        onDrop={(e) => {
                                            if (row.kind !== "fav") return;
                                            e.preventDefault();
                                            const key = dragKey.current ?? e.dataTransfer.getData("text/plain");
                                            dragKey.current = null;
                                            if (key && !favoriteSet.has(key)) actions.toggleFavorite(key);
                                        }}
                                    >
                                        <ChevronRight size={12} className={`cf-chevron ${row.collapsed ? "" : "is-open"}`}/>
                                        <span className="cf-group-label">{highlight(row.label, pattern)}</span>
                                        <span className="cf-group-count">{row.count}</span>
                                        {row.kind === "fav" && row.count === 0 && <span className="cf-group-hint">click ☆ or drag here</span>}
                                        {row.kind === "recent" && (
                                            <button className="cf-text-btn is-danger cf-push" onClick={(e) => {
                                                e.stopPropagation();
                                                actions.clearHistory();
                                            }}>
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <EndpointItem
                                    key={row.id}
                                    op={row.op}
                                    rowId={row.id}
                                    selected={active === row.op.key && row.kind === "tag"}
                                    cursor={cursorId === row.id}
                                    favorite={favoriteSet.has(row.op.key)}
                                    draggableFav={row.kind === "fav"}
                                    showSummary={listLabel === "summary"}
                                    badge={diff?.added.has(row.op.key) ? "new" : diff?.changed.has(row.op.key) ? "changed" : undefined}
                                    pattern={pattern}
                                    onOpen={onOpen}
                                    onDragStart={onDragStart}
                                    onDropOn={onDropOn}
                                    onMenu={onItemMenu}
                                    kind={row.kind}
                                />
                            );
                        })}
                    </div>
                ))}
                {!matchCount && (textSearch || methods.length > 0 || favOnly) && <div className="cf-empty">No endpoints match.</div>}
            </div>
        </aside>
    );
}
