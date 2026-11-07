import {useRef} from "react";
import {Pin} from "lucide-react";
import {Operation} from "../openapi";
import {actions, apiStore, notify, sessionStore} from "../state";
import {useStore} from "../store";
import {copyText} from "../clipboard";
import {openMenu} from "./Menu";
import {statusClass} from "./ResponseView";
import {methodLabel} from "./Sidebar";

function tabLabel(op: Operation) {
    if (op.summary) return op.summary;
    const parts = op.path.split("/").filter(Boolean);
    return "/" + parts.slice(-2).join("/");
}

function Tab({op, active, preview, pinned, onDragStart, onDropOn}: {
    op: Operation;
    active: boolean;
    preview: boolean;
    pinned: boolean;
    onDragStart: (key: string) => void;
    onDropOn: (key: string) => void;
}) {
    const loading = useStore(sessionStore, (s) => !!s.loading[op.key]);
    const status = useStore(sessionStore, (s) => s.responses[op.key]?.status);
    return (
        <div
            className={`cf-tab ${active ? "is-active" : ""} ${preview ? "is-preview" : ""} ${pinned ? "is-pinned" : ""}`}
            title={`${op.method.toUpperCase()} ${op.path}${preview ? "\nPreview tab: double click to keep it open" : ""}`}
            onClick={() => actions.activateTab(op.key)}
            onDoubleClick={() => actions.pinTab(op.key)}
            onContextMenu={(e) => {
                e.preventDefault();
                const {tabs, favorites} = apiStore.get();
                const index = tabs.indexOf(op.key);
                const isFav = favorites.includes(op.key);
                openMenu({
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                        ...(preview ? [{label: "Keep open", onSelect: () => actions.pinTab(op.key)}] : []),
                        {label: pinned ? "Unpin tab" : "Pin tab", onSelect: () => actions.togglePinnedTab(op.key)},
                        {label: "Close", hint: "Alt+W", separator: true, onSelect: () => actions.closeTab(op.key)},
                        {label: "Close other tabs", disabled: tabs.length < 2, onSelect: () => actions.closeOtherTabs(op.key)},
                        {label: "Close tabs to the right", disabled: index === tabs.length - 1, onSelect: () => actions.closeTabsToRight(op.key)},
                        {label: "Close all tabs", danger: true, onSelect: () => actions.closeAllTabs()},
                        {label: isFav ? "Remove from favorites" : "Add to favorites", separator: true, onSelect: () => actions.toggleFavorite(op.key)},
                        {label: "Copy path", onSelect: () => void copyText(op.path).then((ok) => ok && notify("Path copied", "ok"))},
                    ],
                }, e.currentTarget);
            }}
            onAuxClick={(e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    actions.closeTab(op.key);
                }
            }}
            onMouseDown={(e) => e.button === 1 && e.preventDefault()}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                onDragStart(op.key);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("is-drop");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("is-drop")}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("is-drop");
                onDropOn(op.key);
            }}
        >
            <span className={`cf-verb m-${op.method}`}>{methodLabel(op.method)}</span>
            {pinned && <Pin size={11} className="cf-tab-pin"/>}
            <span className="cf-tab-label">{tabLabel(op)}</span>
            {loading ? <span className="cf-dot is-info"/> : status !== undefined && <span className={`cf-dot ${statusClass(status)}`}/>}
            {!pinned && <button
                className="cf-tab-close"
                title="Close (middle click, Alt+W)"
                onClick={(e) => {
                    e.stopPropagation();
                    actions.closeTab(op.key);
                }}
            >
                ×
            </button>}
        </div>
    );
}

export function TabBar({opsByKey}: { opsByKey: Map<string, Operation> }) {
    const tabs = useStore(apiStore, (s) => s.tabs);
    const active = useStore(apiStore, (s) => s.active);
    const preview = useStore(apiStore, (s) => s.preview);
    const pinnedTabs = useStore(apiStore, (s) => s.pinnedTabs);
    const dragKey = useRef<string | null>(null);
    const visible = tabs.map((k) => opsByKey.get(k)).filter((o): o is Operation => !!o);

    return (
        <div className="cf-tabbar">
            <div className="cf-tabs-scroll" onWheel={(e) => {
                if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
            }}>
                {visible.map((op) => (
                    <Tab
                        key={op.key}
                        op={op}
                        active={op.key === active}
                        preview={op.key === preview}
                        pinned={pinnedTabs.includes(op.key)}
                        onDragStart={(key) => {
                            dragKey.current = key;
                        }}
                        onDropOn={(key) => {
                            if (dragKey.current && dragKey.current !== key) actions.moveTab(dragKey.current, key);
                            dragKey.current = null;
                        }}
                    />
                ))}
            </div>
            {visible.length > 1 && (
                <button className="cf-text-btn is-danger" onClick={() => actions.closeAllTabs()}>Close all</button>
            )}
        </div>
    );
}
