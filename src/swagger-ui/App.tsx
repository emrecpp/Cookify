import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {RefreshCw} from "lucide-react";
import {AuthDialog} from "./components/AuthDialog";
import {AuthMenu} from "./components/AuthMenu";
import {ApiDialogsHost, ApiSwitcher, EnvSwitcher, usePage} from "./components/ApiSwitcher";
import {DialogHost} from "./components/Dialogs";
import {MenuHost} from "./components/Menu";
import {openPalette, Palette} from "./components/Palette";
import {detectSpecChanges} from "./session";
import {EndpointView} from "./components/EndpointView";
import {Sidebar} from "./components/Sidebar";
import {clamp, trackDrag} from "./components/Splitter";
import {TabBar} from "./components/TabBar";
import {SpecContext} from "./context";
import {ParsedSpec} from "./openapi";
import {actions, apiStore, prefsStore, sessionStore, updatePrefs} from "./state";
import {useStore} from "./store";
import {listenEverywhere} from "./view-root";

interface Props {
    spec: ParsedSpec;
    specUrl: string;
    onClassic: () => void;
    /** Fetch the OpenAPI document again (new / changed endpoints) without reloading the page. */
    onReload: () => Promise<void>;
}

const SHORTCUTS: [string, string][] = [
    ["Ctrl+P", "Command palette: endpoints, tabs, environments, commands"],
    ["Ctrl+K", "Search endpoints"],
    ["↑ / ↓", "Browse search results"],
    ["Enter", "Open in a new tab"],
    ["Ctrl+Enter", "Send request"],
    ["Alt+1…9", "Switch tab"],
    ["Alt+W", "Close tab"],
    ["Ctrl+F", "Search inside a response or body (when focused)"],
];

/** Sidebar width: follows the drag, and is saved when the drag ends. */
function useResizer(initial: number) {
    const [width, setWidth] = useState(initial);
    useEffect(() => setWidth(initial), [initial]);
    const onMouseDown = (e: React.MouseEvent) => {
        const startWidth = width;
        let latest = startWidth;
        trackDrag(e, "col-resize", (dx) => {
            latest = clamp(startWidth + dx, 220, 640);
            setWidth(latest);
        }, () => updatePrefs({sideWidth: latest}));
    };
    return {width, onMouseDown};
}

export function App({spec, specUrl, onClassic, onReload}: Props) {
    const [reloading, setReloading] = useState(false);
    const reload = async () => {
        if (reloading) return;
        setReloading(true);
        try {
            await onReload();
        } finally {
            setReloading(false);
        }
    };
    const theme = useStore(prefsStore, (s) => s.theme);
    const codeFont = useStore(prefsStore, (s) => s.codeFont);
    const sidebarWidth = useStore(prefsStore, (s) => s.sideWidth);
    const storedBaseUrl = useStore(apiStore, (s) => s.baseUrl);
    const tabs = useStore(apiStore, (s) => s.tabs);
    const active = useStore(apiStore, (s) => s.active);
    const toast = useStore(sessionStore, (s) => s.toast);
    const envKind = usePage()?.env.kind;
    const searchRef = useRef<HTMLInputElement>(null);
    const resizer = useResizer(sidebarWidth);

    const baseUrl = storedBaseUrl || spec.servers[0];
    const opsByKey = useMemo(() => new Map(spec.operations.map((op) => [op.key, op])), [spec]);
    const activeOp = active ? opsByKey.get(active) : undefined;
    const hasTabs = useMemo(() => tabs.some((k) => opsByKey.has(k)), [tabs, opsByKey]);

    const openEndpoint = useCallback((key: string, pin: boolean) => actions.openTab(key, pin), []);

    // new / changed / removed endpoints compared with the last visit (runs again when the spec is revalidated)
    useEffect(() => detectSpecChanges(spec), [spec]);

    // Global shortcuts.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.composedPath()[0] as HTMLElement | undefined;
            const typing = !!target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
            const mod = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();
            const searchFocused = target === searchRef.current;
            const inEditor = e.composedPath().some((node) => node instanceof HTMLElement && (node.classList.contains("cm-editor") || node.classList.contains("cf-jc")));
            if (mod && key === "p" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                openPalette();
                return;
            }
            if ((mod && key === "k") || (mod && key === "f" && !searchFocused && !inEditor) || (key === "/" && !typing)) {
                e.preventDefault();
                e.stopPropagation();
                searchRef.current?.focus();
                searchRef.current?.select();
                return;
            }
            if (e.altKey && !mod) {
                const state = apiStore.get();
                if (key === "w" && state.active) {
                    e.preventDefault();
                    actions.closeTab(state.active);
                } else if (/^[1-9]$/.test(e.key)) {
                    const tab = state.tabs[Number(e.key) - 1];
                    if (tab) {
                        e.preventDefault();
                        actions.activateTab(tab);
                    }
                }
            }
        };
        return listenEverywhere("keydown", onKey);
    }, []);

    const contextValue = useMemo(() => ({spec, specUrl, baseUrl}), [spec, specUrl, baseUrl]);

    return (
        <SpecContext.Provider value={contextValue}>
            <div className="cf-root" data-theme={theme} style={{"--cf-code-font": `${codeFont}px`} as React.CSSProperties}>
                <header className={`cf-header ${envKind === "production" ? "is-prod" : ""}`}>
                    <span className="cf-logo" title="Cookify">C</span>
                    <ApiSwitcher/>
                    <span className="cf-meta is-version" title={spec.version ? `API version ${spec.version}` : undefined}>{spec.version ? `v${spec.version}` : ""}</span>
                    <a className="cf-meta is-link is-spec" href={/^https?:\/\//i.test(specUrl) ? specUrl : undefined} target="_blank" rel="noreferrer" title="Open the OpenAPI document">
                        {spec.raw.openapi ? `OpenAPI ${spec.raw.openapi}` : `Swagger ${spec.raw.swagger}`}
                    </a>
                    <button className="cf-icon-btn cf-reload" disabled={reloading}
                            title={reloading ? "Reloading the API definition…" : "Reload the API definition (new or changed endpoints) without reloading the page"}
                            onClick={() => void reload()}>
                        <RefreshCw size={14}/>
                    </button>
                    <span className="cf-header-sep"/>
                    <EnvSwitcher/>
                    <datalist id="cf-servers">
                        {spec.servers.map((s) => <option key={s} value={s}/>)}
                    </datalist>
                    <span className="cf-flex"/>
                    <button className="cf-btn cf-palette-btn" onClick={openPalette} title="Command palette">Commands <kbd>Ctrl+P</kbd></button>
                    <AuthMenu/>
                    <button className="cf-btn cf-theme-btn" onClick={() => updatePrefs({theme: theme === "dark" ? "light" : "dark"})}>
                        {theme === "dark" ? "Light" : "Dark"}
                    </button>
                    <button className="cf-btn" onClick={onClassic} title="Show the original Swagger UI">Classic view</button>
                </header>

                <div className="cf-body">
                    <div className="cf-side-wrap" style={{width: resizer.width}}>
                        <Sidebar spec={spec} searchRef={searchRef} onOpen={openEndpoint}/>
                    </div>
                    <div className="cf-resizer" onMouseDown={resizer.onMouseDown} title="Drag to resize"/>
                    <main className="cf-main">
                        {hasTabs && <TabBar opsByKey={opsByKey}/>}
                        {activeOp ? (
                            <EndpointView key={activeOp.key} op={activeOp}/>
                        ) : (
                            <div className="cf-welcome">
                                <div className="cf-welcome-title">{spec.title}</div>
                                <div className="cf-welcome-sub">{spec.operations.length} endpoints in {spec.groups.length} groups. Select one on the left to open it in a tab.</div>
                                <table className="cf-shortcuts">
                                    <tbody>
                                        {SHORTCUTS.map(([keys, label]) => (
                                            <tr key={keys}><td><kbd>{keys}</kbd></td><td>{label}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                                <a className="cf-welcome-credit" href="https://github.com/emrecpp/Cookify" target="_blank" rel="noreferrer" title="Cookify on GitHub">Cookify by emrecpp</a>
                            </div>
                        )}
                    </main>
                </div>

                <AuthDialog/>
                <Palette onClassic={onClassic}/>
                <DialogHost/>
                <ApiDialogsHost/>
                <MenuHost/>
                {toast && <div key={toast.id} className={`cf-toast is-${toast.kind}`}>{toast.text}</div>}
            </div>
        </SpecContext.Provider>
    );
}
