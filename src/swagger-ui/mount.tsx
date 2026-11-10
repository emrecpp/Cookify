
import {StrictMode, useEffect} from "react";
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
import {App} from "./App";
import {apisActions, apisStore, currentDocsUrl, envsFromRecords, findEnv, loadApis} from "./apis";
import {swaggerGuard} from "./detect";
import {discoverSpec, DiscoveredSpec, refetchSpec} from "./discover";
import {parseSpec, ParsedSpec} from "./openapi";
import {actions, apiStore, flushApiState, initApiState, loadPrefs, notify, PREFS_KEY, Prefs, prefsStore, storageGet, storageSet, updatePrefs, withDefaultPrefs} from "./state";
import {createStore, useStore} from "./store";
import cssText from "./styles.css?inline";
import {setViewRoot} from "./view-root";
import {appearanceStyle, bootColors} from "./palettes";

const HIDE_STYLE_ID = "cookify-swagger-hide";
const CACHE_PREFIX = "cookifySpecCache:";
const CACHE_INDEX = "cookifySpecCacheIndex";
const CACHE_LIMIT = 6;
const CACHE_MAX_CHARS = 4_000_000;

interface CachedSpec {
    url: string;
    text: string;
    at: number;
}

/** Read synchronously by the guard at document_start, so pages kept in classic mode are never held back. */
const classicFlagKey = () => "cookify:classic:" + location.pathname;

function rememberClassic(classic: boolean) {
    try {
        if (classic) localStorage.setItem(classicFlagKey(), "1");
        else localStorage.removeItem(classicFlagKey());
    } catch {
        // ignore
    }
}

let bootShown = false;

/**
 * Read by the guard at document_start on the next visit: the skeleton is painted right away and matches the
 * view as it was left (theme and color palette, sidebar width, endpoint tabs open or the welcome screen), so nothing jumps.
 */
function rememberBoot(shown = bootShown) {
    bootShown = shown;
    const key = "cookify:boot:" + location.pathname;
    try {
        if (!shown) {
            localStorage.removeItem(key);
            return;
        }
        const {theme, palette, sideWidth} = prefsStore.get();
        localStorage.setItem(key, JSON.stringify({theme, colors: bootColors(palette, theme), side: sideWidth, tabs: apiStore.get().tabs.length > 0}));
    } catch {
        // ignore
    }
}

const specStore = createStore<{ spec: ParsedSpec | null; specUrl: string }>({spec: null, specUrl: ""});
/** Text of the OpenAPI document on screen, to tell whether a reload brought anything new. */
let specText = "";

/** Header "reload" button: fetch the OpenAPI document again and swap it in when it changed, without a page reload. */
async function reloadSpec(): Promise<void> {
    const {spec: current, specUrl} = specStore.get();
    if (!specUrl) return;
    const found = await refetchSpec(specUrl);
    if (!found) {
        notify("Could not load the API definition", "err");
        return;
    }
    if (found.text === specText) {
        notify("API definition is up to date", "info");
        return;
    }
    const spec = tryParse(found.raw, found.url);
    if (!spec) {
        notify("The API definition could not be parsed", "err");
        return;
    }
    const before = new Set(current?.operations.map((op) => op.key));
    const after = new Set(spec.operations.map((op) => op.key));
    const added = spec.operations.filter((op) => !before.has(op.key)).length;
    const removed = [...before].filter((key) => !after.has(key)).length;
    specText = found.text;
    specStore.set({spec, specUrl: found.url});
    void writeCache(found);
    const parts = [added && `${added} new`, removed && `${removed} removed`].filter(Boolean);
    notify(`API definition reloaded${parts.length ? ` · ${parts.join(", ")} endpoint${added + removed > 1 ? "s" : ""}` : " · endpoints changed"}`, "ok");
}

/**
 * public/swagger-preload.css (injected before first paint) hides Swagger UI unless <html> has
 * `cookify-off`. The inline style below is a fallback for environments without the preload css.
 */
function setClassicVisible(visible: boolean) {
    document.documentElement.classList.toggle("cookify-off", visible);
    // The classic UI was prevented from booting; run its scripts now that it is needed.
    if (visible) void swaggerGuard()?.restore();
    let style = document.getElementById(HIDE_STYLE_ID);
    if (visible) {
        style?.remove();
        return;
    }
    if (!style) {
        style = document.createElement("style");
        style.id = HIDE_STYLE_ID;
        style.textContent = "#swagger-ui, body > .swagger-ui { display: none !important; } html, body { overflow: hidden !important; }";
        (document.head ?? document.documentElement).appendChild(style);
    }
}

/** Drives the preload progress bar (see swagger-preload.css). */
function setProgress(value: number) {
    document.documentElement.style.setProperty("--cookify-progress", String(value));
}

// ---------------------------------------------------------------------------
// Spec cache: the last OpenAPI document per docs page, so repeat visits render instantly.

const cacheKey = () => CACHE_PREFIX + location.origin + location.pathname;

async function readCache(): Promise<CachedSpec | undefined> {
    return storageGet<CachedSpec>(cacheKey());
}

async function writeCache(found: DiscoveredSpec) {
    if (found.text.length > CACHE_MAX_CHARS) return;
    const key = cacheKey();
    const index = ((await storageGet<string[]>(CACHE_INDEX)) ?? []).filter((k) => k !== key);
    const next = [key, ...index];
    await storageSet({[key]: {url: found.url, text: found.text, at: Date.now()} satisfies CachedSpec, [CACHE_INDEX]: next.slice(0, CACHE_LIMIT)});
    const evicted = next.slice(CACHE_LIMIT);
    if (evicted.length) {
        try {
            await chrome.storage.local.remove(evicted);
        } catch {
            // ignore
        }
    }
}

// ---------------------------------------------------------------------------

function Root() {
    const spec = useStore(specStore, (s) => s.spec);
    const specUrl = useStore(specStore, (s) => s.specUrl);
    const enabled = useStore(prefsStore, (s) => s.enabled);
    const classicList = useStore(prefsStore, (s) => s.classic);
    const theme = useStore(prefsStore, (s) => s.theme);
    const palette = useStore(prefsStore, (s) => s.palette);
    const radius = useStore(prefsStore, (s) => s.radius);
    const fontSize = useStore(prefsStore, (s) => s.fontSize);
    const classic = !enabled || classicList.includes(specUrl);

    useEffect(() => {
        setClassicVisible(classic);
        if (enabled && specUrl) {
            rememberClassic(classic);
            rememberBoot(!classic);
        }
    }, [classic, enabled, specUrl, theme, palette]);

    if (!enabled || !spec) return null;
    if (classic) {
        return (
            <div className="cf-root is-floating" data-theme={theme} style={appearanceStyle({palette, radius, fontSize}, theme) as React.CSSProperties}>
                <button
                    className="cf-fab"
                    title="Open the Cookify view"
                    onClick={() => updatePrefs({classic: classicList.filter((u) => u !== specUrl)})}
                >
                    Cookify view
                </button>
            </div>
        );
    }
    return <App spec={spec} specUrl={specUrl} onReload={reloadSpec} onClassic={() => updatePrefs({classic: [...classicList, specUrl]})}/>;
}

function listenForExtensionEvents() {
    try {
        // React to preference changes made in the popup or on another computer (enable/disable, theme).
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes[PREFS_KEY]?.newValue) prefsStore.set(withDefaultPrefs(changes[PREFS_KEY].newValue as Partial<Prefs>));
        });
        // Continue on another computer: fetch what changed there (Google Drive sync, when it is on) when the page
        // opens and when it comes back to the front; save right away and upload when it goes to the back.
        const pull = () => void chrome.runtime.sendMessage({type: "cookify:sync"}).catch(() => undefined);
        let pulledAt = Date.now();
        pull();
        // The page is left (another API or environment opens in this tab): note how it looks for the next visit.
        window.addEventListener("pagehide", () => rememberBoot());
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                rememberBoot();
                void flushApiState().then(() => chrome.runtime.sendMessage({type: "cookify:leaving"})).catch(() => undefined);
            } else if (Date.now() - pulledAt > 15_000) {
                pulledAt = Date.now();
                pull();
            }
        });
        // The popup's "apply to Swagger" button also sets the token in the Cookify view.
        chrome.runtime.onMessage.addListener((message) => {
            if (message?.action === "loginSwagger" && message.params?.bearerToken) {
                actions.setToken(message.params.bearerToken, "Cookify");
                notify("Token applied from Cookify", "ok");
            } else if (message?.action === "logoutSwagger") {
                actions.setToken("");
            }
            return false;
        });
    } catch {
        // ignore
    }
}

function mountRoot() {
    const host = document.createElement("cookify-swagger");
    host.style.all = "initial";
    // Closed: the page's own scripts share this DOM and must not read the view (tokens, responses) or click in it.
    const shadow = host.attachShadow({mode: "closed"});
    setViewRoot(shadow);
    const style = document.createElement("style");
    style.textContent = cssText;
    shadow.appendChild(style);
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
    document.body.appendChild(host);
    // Synchronous: `cookify-ready` removes the skeleton, and a render still pending then is a blank white frame.
    const root = createRoot(mountPoint);
    flushSync(() => root.render(
        <StrictMode>
            <Root/>
        </StrictMode>,
    ));
}

function tryParse(raw: unknown, url: string): ParsedSpec | null {
    try {
        return parseSpec(raw as Record<string, unknown>, url);
    } catch (error) {
        console.warn("[Cookify] Failed to parse OpenAPI document", error);
        return null;
    }
}

let started = false;

/** Called by content-script/src/main.tsx once the page shows Swagger UI (it has claimed the guard already). */
export async function bootstrapSwaggerUi() {
    if (started || window.top !== window) return;
    started = true;

    setProgress(0.2);

    // Network discovery starts right away; prefs + cache are read in parallel.
    const freshPromise = discoverSpec();
    const [prefs, cached] = await Promise.all([loadPrefs(), readCache()]);
    if (!prefs.enabled) {
        rememberClassic(true);
        setClassicVisible(true);
        return;
    }
    setProgress(0.4);

    let initial: { url: string; text: string; spec: ParsedSpec } | null = null;
    if (cached) {
        try {
            const spec = tryParse(JSON.parse(cached.text), cached.url);
            if (spec) initial = {url: cached.url, text: cached.text, spec};
        } catch {
            // corrupted cache entry, fall back to the network
        }
    }

    if (initial) {
        // Stale-while-revalidate: refresh in the background and swap in the new spec if it changed.
        void freshPromise.then((found) => {
            if (!found || found.text === initial!.text) return;
            const spec = tryParse(found.raw, found.url);
            if (!spec) return;
            specText = found.text;
            specStore.set({spec, specUrl: found.url});
            void writeCache(found);
            notify("API definition updated", "info");
        });
    } else {
        const found = await freshPromise;
        if (!found) {
            console.info("[Cookify] Swagger UI detected but no OpenAPI document could be located.");
            rememberClassic(true);
            setClassicVisible(true);
            return;
        }
        setProgress(0.75);
        const spec = tryParse(found.raw, found.url);
        if (!spec) {
            setClassicVisible(true);
            return;
        }
        initial = {url: found.url, text: found.text, spec};
        void writeCache(found);
    }

    setProgress(0.9);
    await loadApis();
    const page = findEnv(apisStore.get().apis, currentDocsUrl());
    const oldEnvs = await initApiState(initial.url, page ? {apiId: page.api.id, envId: page.env.id} : undefined);
    if (page) {
        if (oldEnvs.length) apisActions.addEnvs(page.api.id, envsFromRecords(oldEnvs));
        apisActions.visited(page.api.id, page.env.id, currentDocsUrl());
    }
    listenForExtensionEvents();
    setClassicVisible(prefs.classic.includes(initial.url));
    if (!specText) specText = initial.text;
    specStore.set({spec: initial.spec, specUrl: initial.url});
    mountRoot();
    setProgress(1);

    requestAnimationFrame(() => document.documentElement.classList.add("cookify-ready"));
}
