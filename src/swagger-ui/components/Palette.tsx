import {KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import {useSpec} from "../context";
import {buildRequest, defaultDraft} from "../request";
import {acknowledgeSpecChanges, relogin, specDiffStore} from "../session";
import {downloadText, postmanCollection, SNIPPETS} from "../snippets";
import {actions, apiStore, notify, prefsStore, sessionStore, updatePrefs} from "../state";
import {createStore, useStore} from "../store";
import {openAuthDialog} from "./AuthDialog";
import {copyText} from "../clipboard";
import {askText} from "./Dialogs";
import {apisStore, currentDocsUrl, findEnv, hostOf, openDocs, switchApi} from "../apis";
import {openAddApi, openApiManager, openEnvManager, openSaveApi} from "./ApiSwitcher";
import {methodLabel} from "./Sidebar";
import {PALETTES} from "../palettes";

const paletteStore = createStore<{ open: boolean }>({open: false});

export function openPalette() {
    paletteStore.set({open: true});
}

interface Item {
    id: string;
    group: "Tab" | "Command" | "API" | "Environment" | "Endpoint";
    label: string;
    detail?: string;
    method?: string;
    danger?: boolean;
    run: () => void;
}

/** Ctrl+P: endpoints, open tabs, environments and commands in one keyboard driven list. */
export function Palette({onClassic}: { onClassic: () => void }) {
    const open = useStore(paletteStore, (s) => s.open);
    return open ? <PaletteBody onClassic={onClassic}/> : null;
}

function PaletteBody({onClassic}: { onClassic: () => void }) {
    const {spec, baseUrl} = useSpec();
    const [query, setQuery] = useState("");
    const [cursor, setCursor] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const close = () => paletteStore.set({open: false});

    const items = useMemo<Item[]>(() => {
        const state = apiStore.get();
        const opsByKey = new Map(spec.operations.map((op) => [op.key, op]));
        const active = state.active ? opsByKey.get(state.active) : undefined;
        const list: Item[] = [];

        for (const key of state.tabs) {
            const op = opsByKey.get(key);
            if (op && key !== state.active) list.push({id: `tab:${key}`, group: "Tab", label: op.summary || op.path, detail: op.path, method: op.method, run: () => actions.activateTab(key)});
        }

        const cmd = (label: string, run: () => void, detail?: string, danger?: boolean) => list.push({id: `cmd:${label}`, group: "Command", label, detail, danger, run});
        if (active) {
            const built = () => {
                const s = apiStore.get();
                return buildRequest(spec, active, s.drafts[active.key] ?? defaultDraft(spec, active, s.paramMemory), {
                    baseUrl, token: s.token, files: sessionStore.get().files[active.key],
                });
            };
            for (const snippet of SNIPPETS) {
                cmd(`Copy as ${snippet.label}`, () => void copyText(snippet.build(built())).then((ok) => ok && notify(`${snippet.label} copied`, "ok")), active.path);
            }
            cmd("Save request as template…", async () => {
                const name = await askText({title: "Save as template", label: `Name for this set of inputs (${active.method.toUpperCase()} ${active.path})`, confirm: "Save"});
                if (name) {
                    const s = apiStore.get();
                    actions.saveTemplate(active.key, name, structuredClone(s.drafts[active.key] ?? defaultDraft(spec, active, s.paramMemory)));
                    notify(`Template "${name}" saved`, "ok");
                }
            }, active.path);
            for (const template of state.templates[active.key] ?? []) {
                cmd(`Apply template: ${template.name}`, () => actions.applyTemplate(active.key, template.name), active.path);
            }
            cmd(state.favorites.includes(active.key) ? "Remove from favorites" : "Add to favorites", () => actions.toggleFavorite(active.key), active.path);
            cmd("Close tab", () => actions.closeTab(active.key), "Alt+W");
            cmd("Close other tabs", () => actions.closeOtherTabs(active.key));
        }
        if (state.tabs.length) cmd("Close all tabs", () => actions.closeAllTabs(), undefined, true);

        cmd("Switch token…", () => openAuthDialog());
        if (state.login) cmd("Sign in again (re-login)", () => void relogin(spec), "Replays the remembered login request");
        if (state.token) cmd("Log out", () => actions.setToken(""), undefined, true);
        const {apis} = apisStore.get();
        const page = findEnv(apis, currentDocsUrl());
        for (const env of page?.api.envs ?? []) {
            if (env.id !== page?.env.id) list.push({id: `env:${env.id}`, group: "Environment", label: `Switch to ${env.name}`, detail: hostOf(env.docsUrl), run: () => void openDocs(env.docsUrl)});
        }
        cmd("Manage environments…", openEnvManager);
        for (const api of apis) {
            if (api.id !== page?.api.id) list.push({id: `api:${api.id}`, group: "API", label: `Switch to ${api.name}`, detail: api.envs.map((e) => hostOf(e.docsUrl)).join(" · "), run: () => switchApi(api)});
        }
        if (!page) cmd("Save this API…", openSaveApi);
        cmd("Add API…", openAddApi, "APIs and environments table");
        if (apis.length) cmd("Manage APIs…", openApiManager);
        cmd("Export Postman collection (all endpoints)", () => downloadText(`${spec.title || "api"}.postman_collection.json`, postmanCollection(spec)));
        if (state.favorites.length) cmd("Export Postman collection (favorites)", () => downloadText(`${spec.title || "api"}-favorites.postman_collection.json`, postmanCollection(spec, state.favorites)));
        if (specDiffStore.get().diff) cmd("Mark new / changed endpoints as seen", acknowledgeSpecChanges);
        cmd(`Switch to ${prefsStore.get().theme === "dark" ? "light" : "dark"} theme`, () => updatePrefs({theme: prefsStore.get().theme === "dark" ? "light" : "dark"}));
        for (const palette of PALETTES) {
            if (palette.id !== prefsStore.get().palette) cmd(`Color palette: ${palette.label}`, () => updatePrefs({palette: palette.id}));
        }
        cmd("Collapse all groups", () => actions.setCollapsed(spec.groups.map((g) => `tag:${g.tag}`)));
        cmd("Expand all groups", () => actions.setCollapsed([]));
        cmd("Clear recent", () => actions.clearHistory());
        cmd("Open classic Swagger UI", onClassic);

        for (const op of spec.operations) {
            list.push({id: `op:${op.key}`, group: "Endpoint", label: op.path, detail: op.summary, method: op.method, run: () => actions.openTab(op.key, true)});
        }
        return list;
    }, [spec, baseUrl, onClassic]);

    const filtered = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return items.filter((i) => i.group !== "Endpoint").concat(items.filter((i) => i.group === "Endpoint").slice(0, 30));
        const scored = items
            .map((item) => {
                const label = item.label.toLowerCase();
                const hay = `${item.method ?? ""} ${label} ${(item.detail ?? "").toLowerCase()} ${item.group.toLowerCase()}`;
                if (!words.every((w) => hay.includes(w))) return null;
                const score = (label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2) + (item.group === "Endpoint" ? 0.5 : 0);
                return {item, score};
            })
            .filter((x): x is { item: Item; score: number } => !!x)
            .sort((a, b) => a.score - b.score);
        return scored.slice(0, 80).map((x) => x.item);
    }, [items, query]);

    useEffect(() => setCursor(0), [query]);
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({block: "nearest"});
    }, [cursor]);

    const run = (item: Item | undefined) => {
        if (!item) return;
        close();
        item.run();
    };
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") close();
        else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(0, Math.min(filtered.length - 1, c + (e.key === "ArrowDown" ? 1 : -1))));
        } else if (e.key === "Enter") {
            e.preventDefault();
            run(filtered[cursor]);
        }
    };

    let lastGroup = "";
    return (
        <div className="cf-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <div className="cf-modal cf-palette" role="dialog" aria-label="Command palette">
                <input
                    className="cf-palette-input"
                    autoFocus
                    value={query}
                    placeholder="Search endpoints, tabs, APIs, environments and commands…"
                    spellCheck={false}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                />
                <div className="cf-palette-list" ref={listRef}>
                    {filtered.map((item, index) => {
                        const header = item.group !== lastGroup ? item.group : null;
                        lastGroup = item.group;
                        return (
                            <div key={item.id}>
                                {header && <div className="cf-palette-group">{header === "Tab" ? "Open tabs" : `${header}s`}</div>}
                                <button
                                    data-index={index}
                                    className={`cf-palette-item ${index === cursor ? "is-cursor" : ""} ${item.danger ? "is-danger" : ""}`}
                                    onMouseMove={() => setCursor(index)}
                                    onClick={() => run(item)}
                                >
                                    {item.method && <span className={`cf-verb m-${item.method}`}>{methodLabel(item.method)}</span>}
                                    <span className="cf-palette-label">{item.label}</span>
                                    {item.detail && <span className="cf-palette-detail">{item.detail}</span>}
                                </button>
                            </div>
                        );
                    })}
                    {!filtered.length && <div className="cf-empty">Nothing matches.</div>}
                </div>
                <div className="cf-modal-hint">
                    <span><kbd>↑</kbd><kbd>↓</kbd> select</span>
                    <span><kbd>Enter</kbd> run</span>
                    <span><kbd>Esc</kbd> close</span>
                </div>
            </div>
        </div>
    );
}
