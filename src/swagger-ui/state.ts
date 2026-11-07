import {originOf, stableJson} from "@/lib/values";
import {createStore} from "./store";

// ---------------------------------------------------------------------------
// Types

export interface HeaderRow {
    key: string;
    value: string;
}

export interface Draft {
    params: Record<string, string>;
    contentType?: string;
    body?: string;
    form?: Record<string, string>;
    headers?: HeaderRow[];
}

export interface HistoryEntry {
    key: string;
    status: number;
    ms: number;
    at: number;
}

/** A named, reusable set of inputs for one endpoint. */
export interface RequestTemplate {
    name: string;
    draft: Draft;
    at: number;
}

/** How to get a fresh token again: the login request that produced the current one. */
export interface LoginRecipe {
    opKey: string;
    draft: Draft;
    /** Where the token sits in the login response, e.g. ["access_token"] or ["data", "token"]. */
    tokenPath: string[];
    label?: string;
}

export type EnvKind = "local" | "staging" | "production";

/**
 * What one environment of an API remembers: where requests go (when not the documented server), its
 * token / login and the endpoints the user has seen there. Name, type and swagger address of the
 * environments live in the saved APIs list (apis.ts); these records are keyed by the same ids.
 */
export interface Environment {
    id: string;
    name: string;
    kind: EnvKind;
    baseUrl?: string;
    token: string;
    tokenLabel?: string;
    login?: LoginRecipe;
    seenOps?: Record<string, string>;
}

export const KIND_LABEL: Record<EnvKind, string> = {local: "Development", staging: "Staging", production: "Production"};
/** Badge text in the header environment picker. */
export const KIND_SHORT: Record<EnvKind, string> = {local: "Dev", staging: "Stage", production: "Prod"};

export function guessKind(name: string, url?: string): EnvKind {
    const text = `${name} ${url ?? ""}`.toLowerCase();
    if (/localhost|127\.0\.0\.1|\[::1\]|\.local\b|\.test\b|\blocal\b|\bdev\b/.test(text)) return "local";
    if (/stag|test|qa|uat|sandbox|preview|dev/.test(text)) return "staging";
    return "production";
}

export function newId() {
    return Math.random().toString(36).slice(2, 10);
}

export interface ApiState {
    favorites: string[];
    drafts: Record<string, Draft>;
    history: HistoryEntry[];
    collapsed: string[];
    token: string;
    tokenLabel?: string;
    baseUrl?: string;
    paramMemory: Record<string, string>;
    /** Open endpoint tabs (operation keys), in display order. */
    tabs: string[];
    /** The tab that gets replaced by the next single click (VS Code style preview). */
    preview: string | null;
    active: string | null;
    /** Pinned tabs: kept on the left and skipped by "close others / all". */
    pinnedTabs: string[];
    /** Saved request templates per operation key. */
    templates: Record<string, RequestTemplate[]>;
    /** Login request used to renew the token of the active environment. */
    login?: LoginRecipe;
    /** Renew the token through `login` automatically when it expired or got rejected. */
    autoRelogin: boolean;
    /** Per environment records; the live baseUrl/token/login/seenOps above belong to `activeEnv`. */
    envs: Environment[];
    activeEnv: string | null;
    /** Signature of every operation the user has already seen (detects new / changed endpoints). */
    seenOps: Record<string, string>;
    updatedAt?: string;
    /** When the open tabs / active endpoint last changed: across computers the latest one is restored. */
    viewAt?: number;
    /** The computer that changed them (see `deviceId`). */
    viewBy?: string;
}

export type Theme = "dark" | "light";

export interface Prefs {
    enabled: boolean;
    theme: Theme;
    /** Spec urls the user switched back to the classic Swagger UI. */
    classic: string[];
    /** Sidebar width in px (renamed from sidebarWidth when the layout got more compact). */
    sideWidth: number;
    /** What the endpoint list shows: the path or the operation summary. */
    listLabel: "path" | "summary";
    /** Font size (px) of the code editors / viewers, changed with Ctrl + mouse wheel. */
    codeFont: number;
    /** Share of the endpoint width taken by the Request pane (Response gets the rest). */
    splitRatio: number;
    /** Max height (px) of the open endpoint description; 0 = default (30vh). */
    descHeight: number;
}

export interface SentResponse {
    status: number;
    statusText: string;
    headers: [string, string][];
    ms: number;
    size: number;
    contentType: string;
    bodyText?: string;
    blobUrl?: string;
    error?: string;
    at: number;
    method: string;
    url: string;
}

export interface SavedToken {
    alias: string;
    bearerToken: string;
    project?: string | null;
    order?: number;
}

export interface Session {
    responses: Record<string, SentResponse>;
    loading: Record<string, boolean>;
    files: Record<string, Record<string, File[]>>;
    savedTokens: SavedToken[];
    projects: string[];
    activeProject: string | null;
    /** Whether this page may list the tokens saved in the popup (see TokenAccess). */
    tokenAccess: TokenAccess;
    /** How many saved tokens are held back while tokenAccess is "ask". */
    hiddenTokens: number;
    toast: { id: number; text: string; kind: "ok" | "err" | "info" } | null;
}

// ---------------------------------------------------------------------------
// chrome.storage helpers (the extension context can be invalidated after a reload)

export const PREFS_KEY = "cookifySwaggerPrefs";
/** Popup data (saved tokens, projects); see lib/cloud-data.ts. */
export const POPUP_DATA_KEY = "cookifyData";
/** Copy of the saved tokens the popup kept here before its data moved to chrome.storage (read until then). */
export const TOKENS_KEY = "cookifySavedTokens";
export const API_PREFIX = "cookifySwaggerApi:";
/** Origins where the user allowed the Cookify view to list the popup's saved tokens. Kept on this device only. */
export const TOKEN_SITES_KEY = "cookifyTokenSites";

/**
 * Any page can look like Swagger UI, so the popup's saved tokens are only listed on pages the user trusts:
 * "api" pages belong to an API the user saved, "local" pages run on the user's own computer, "site" pages
 * are on an origin the user allowed, and on every other page ("ask") the tokens stay hidden until the user
 * allows that origin.
 */
export type TokenAccess = "api" | "local" | "site" | "ask";

/** localhost, *.localhost and loopback addresses: the user's own development servers. */
export function isLocalHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    return host === "localhost" || host.endsWith(".localhost") || /^127(\.\d{1,3}){3}$/.test(host) || host === "[::1]";
}

export const CODE_FONT_DEFAULT = 13;
export const CODE_FONT_MIN = 9;
export const CODE_FONT_MAX = 28;

export const DEFAULT_PREFS: Prefs = {enabled: true, theme: "dark", classic: [], sideWidth: 320, listLabel: "path", codeFont: CODE_FONT_DEFAULT, splitRatio: 0.5, descHeight: 0};

const DEFAULT_API: ApiState = {
    favorites: [],
    drafts: {},
    history: [],
    collapsed: [],
    token: "",
    paramMemory: {},
    tabs: [],
    preview: null,
    active: null,
    pinnedTabs: [],
    templates: {},
    autoRelogin: true,
    envs: [],
    activeEnv: null,
    seenOps: {},
};

export async function storageGet<T>(key: string): Promise<T | undefined> {
    try {
        const result = await chrome.storage.local.get(key);
        return result[key] as T | undefined;
    } catch {
        return undefined;
    }
}

export async function storageSet(values: Record<string, unknown>): Promise<void> {
    try {
        await chrome.storage.local.set(values);
    } catch {
        // extension context invalidated, nothing we can do
    }
}

function debounce(fn: () => void, ms: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}

// ---------------------------------------------------------------------------
// Stores

export const apiStore = createStore<ApiState>(DEFAULT_API);
export const prefsStore = createStore<Prefs>(DEFAULT_PREFS);
export const sessionStore = createStore<Session>({
    responses: {},
    loading: {},
    files: {},
    savedTokens: [],
    projects: [],
    activeProject: null,
    tokenAccess: "ask",
    hiddenTokens: 0,
    toast: null,
});

export async function loadPrefs(): Promise<Prefs> {
    const stored = await storageGet<Partial<Prefs>>(PREFS_KEY);
    const prefs = {...DEFAULT_PREFS, ...stored};
    prefsStore.set(prefs);
    return prefs;
}

export function updatePrefs(patch: Partial<Prefs>) {
    prefsStore.set(patch);
    void storageSet({[PREFS_KEY]: prefsStore.get()});
}

const saveCodeFont = debounce(() => void storageSet({[PREFS_KEY]: prefsStore.get()}), 300);

/** Ctrl + wheel / Ctrl + 0 in a code view: one size for every editor, remembered across pages and reloads. */
export function setCodeFont(size: number) {
    const next = Math.round(Math.min(CODE_FONT_MAX, Math.max(CODE_FONT_MIN, size)));
    if (next === prefsStore.get().codeFont) return;
    prefsStore.set({codeFont: next});
    saveCodeFont();
    notify(`Code text ${Math.round((next / CODE_FONT_DEFAULT) * 100)}% · Ctrl+0 resets`, "info");
}

// ---------------------------------------------------------------------------
// API state persistence. A saved API keeps one state for all its environments (favorites, tabs,
// drafts, history are shared); an unsaved Swagger page keeps its own state, keyed by its spec url.

const PROJECT_PREFIX = API_PREFIX + "project:";
/** Stays on the computer, it never syncs. */
const DEVICE_KEY = "cookifyDeviceId";

/** The page's environment within a saved API. */
export interface PageEnv {
    apiId: string;
    envId: string;
}

let apiKey = "";
let subscribed = false;
/** What this page last wrote, to tell its own writes from changes made elsewhere (Google Drive sync). */
let lastWritten = "";
/** The state as last written or received: what differs from it has not reached the storage yet. */
let stored: ApiState = DEFAULT_API;
/** Taking over a change made elsewhere, which must not be written back. */
let receiving = false;
/** The open tabs / active endpoint as last seen, and when they changed. */
let viewSig = "";
let viewAt = 0;
let viewBy: string | undefined;
/** Tells the open tabs of another computer (continued here) from those of another browser tab (left alone). */
let deviceId = "";
/** The latest view of another tab on this computer: this page keeps its own, the cloud gets the latest. */
let siblingView: Partial<ApiState> | undefined;

const viewOf = (s: ApiState) => JSON.stringify([s.tabs, s.preview, s.active, s.pinnedTabs]);

/** Takes `state` as the current view without stamping it as a change. */
function markView(state: ApiState) {
    viewSig = viewOf(state);
    viewAt = state.viewAt ?? 0;
    viewBy = state.viewBy;
}

/** Stamps a change of the open tabs / active endpoint (so another computer can continue from here). */
function trackView(state: ApiState) {
    const sig = viewOf(state);
    if (sig === viewSig) return;
    viewSig = sig;
    viewAt = Date.now();
    viewBy = deviceId;
}
/** The page's own state key before it was saved as an API (removed once the API took it over). */
let legacyKeyOfPage = "";

/**
 * The state key of a page that is not part of a saved API. A document served from another origin is keyed
 * by the page's origin too: another site that loads the same document must not get this page's token.
 */
export function pageStateKey(specUrl: string, pageOrigin = location.origin): string {
    let specOrigin = "";
    try {
        specOrigin = new URL(specUrl).origin;
    } catch {
        // keep the page origin in the key
    }
    return specOrigin === pageOrigin ? API_PREFIX + specUrl : `${API_PREFIX}${pageOrigin} ${specUrl}`;
}

type PopupTokens = { swaggers?: SavedToken[]; projects?: string[]; activeProject?: string | null } | undefined;
let popupTokens: PopupTokens;
let tokenAccess: TokenAccess = "ask";

/** Lists the popup's saved tokens in the view, or only their number while the page has no access. */
function publishTokens() {
    const allowed = tokenAccess !== "ask";
    const tokens = popupTokens?.swaggers ?? [];
    sessionStore.set({
        tokenAccess,
        savedTokens: allowed ? tokens : [],
        hiddenTokens: allowed ? 0 : tokens.length,
        projects: allowed ? popupTokens?.projects ?? [] : [],
        activeProject: allowed ? popupTokens?.activeProject ?? null : null,
    });
}

/** Allows (or stops allowing) this origin to list the popup's saved tokens. */
export async function setTokenSiteAccess(allow: boolean): Promise<void> {
    const origin = location.origin;
    const sites = (await storageGet<string[]>(TOKEN_SITES_KEY)) ?? [];
    await storageSet({[TOKEN_SITES_KEY]: allow ? [...new Set([...sites, origin])] : sites.filter((site) => site !== origin)});
    if (tokenAccess === "api" || tokenAccess === "local") return;
    tokenAccess = allow ? "site" : "ask";
    publishTokens();
}

/** Copies the live server / token / login / seen endpoints into the active environment's record. */
function withLiveEnv(state: ApiState): ApiState {
    if (!state.activeEnv) return state;
    const live = {baseUrl: state.baseUrl, token: state.token, tokenLabel: state.tokenLabel, login: state.login, seenOps: state.seenOps};
    const found = state.envs.some((e) => e.id === state.activeEnv);
    const envs = found
        ? state.envs.map((e) => (e.id === state.activeEnv ? {...e, ...live} : e))
        : [...state.envs, {id: state.activeEnv, name: "", kind: "local" as EnvKind, ...live}];
    return {...state, envs};
}

/** Writes the API state right away (before leaving the page for another environment). */
export async function flushApiState() {
    if (!apiKey) return;
    stored = apiStore.get();
    const value = {...withLiveEnv(stored), viewAt, viewBy, ...((siblingView?.viewAt ?? 0) > viewAt ? siblingView : {})};
    lastWritten = stableJson(value);
    await storageSet({[apiKey]: value});
}

/**
 * The page's state changed elsewhere (another computer through Google Drive sync, or another tab of the same
 * API): take it over, keeping this page's environment, its collapsed groups and the edits not saved yet. The
 * open tabs only follow another computer. It is not written back: two tabs on different environments would
 * answer each other forever.
 */
function receiveApiState(next: Partial<ApiState> | undefined) {
    if (!next || stableJson(next) === lastWritten) return;
    const current = apiStore.get();
    const edits = Object.fromEntries(Object.entries(current).filter(([key, value]) => value !== stored[key as keyof ApiState]));
    const fromHere = !!next.viewBy && next.viewBy === deviceId;
    if (fromHere && (next.viewAt ?? 0) > (siblingView?.viewAt ?? 0)) {
        siblingView = {tabs: next.tabs, preview: next.preview, active: next.active, pinnedTabs: next.pinnedTabs, viewAt: next.viewAt, viewBy: next.viewBy};
    }
    // Tabs opened here after the sync read them are newer than the ones it brings.
    const keepView = fromHere || (next.viewAt ?? 0) < viewAt;
    const merged: ApiState = {
        ...DEFAULT_API, ...next, collapsed: current.collapsed,
        ...(keepView ? {tabs: current.tabs, preview: current.preview, active: current.active, pinnedTabs: current.pinnedTabs, viewAt, viewBy} : {}),
    };
    lastWritten = stableJson(next);
    const state = current.activeEnv ? enterEnv(merged, current.activeEnv) : merged;
    markView(state);
    stored = state;
    receiving = true;
    apiStore.set({...state, ...edits});
    receiving = false;
}

async function removeKeys(keys: string[]) {
    try {
        await chrome.storage.local.remove(keys);
    } catch {
        // extension context invalidated
    }
}

/** Removes the state of APIs that were deleted. */
export function removeApiStates(apiIds: string[]) {
    if (apiIds.length) void removeKeys(apiIds.map((id) => PROJECT_PREFIX + id));
}

const persistApi = debounce(() => void flushApiState(), 400);

function bindStorage(key: string) {
    apiKey = key;
    stored = apiStore.get();
    if (!subscribed) {
        subscribed = true;
        apiStore.subscribe(() => trackView(apiStore.get()));
        apiStore.subscribe(() => {
            if (!receiving) persistApi();
        });
        try {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === "local" && apiKey && changes[apiKey]) receiveApiState(changes[apiKey].newValue as Partial<ApiState> | undefined);
            });
        } catch {
            // extension context invalidated
        }
    }
}

type Live = Pick<ApiState, "baseUrl" | "token" | "tokenLabel" | "login">;

/** Makes `envId` the active environment, loading its record (or `fallback` when it has none yet). */
function enterEnv(state: ApiState, envId: string, fallback: Partial<Live> = {}): ApiState {
    const record = state.envs.find((e) => e.id === envId);
    const source: Partial<Environment> = record ?? fallback;
    return {
        ...state, activeEnv: envId,
        baseUrl: source.baseUrl, token: source.token ?? "", tokenLabel: source.tokenLabel, login: source.login, seenOps: record?.seenOps ?? {},
    };
}

/**
 * Turns the state of an unsaved page (whose environments only switched the server) into the state of a
 * saved API. The environment that points at this page's server becomes the page's environment; the
 * others are returned so they can be added to the API with their own swagger address.
 */
function adoptLegacy(legacy: ApiState, envId: string): { state: ApiState; others: Environment[] } {
    const records = legacy.envs.map((e) => (e.id === legacy.activeEnv ? {...e, baseUrl: legacy.baseUrl, token: legacy.token, tokenLabel: legacy.tokenLabel, login: legacy.login} : e));
    const mine = records.find((e) => originOf(e.baseUrl) === location.origin);
    const others = records.filter((e) => e !== mine && originOf(e.baseUrl));
    const page: Environment = mine
        ? {...mine, id: envId, baseUrl: undefined}
        : records.length
            ? {id: envId, name: "", kind: "local", token: ""}
            : {id: envId, name: "", kind: "local", baseUrl: legacy.baseUrl, token: legacy.token, tokenLabel: legacy.tokenLabel, login: legacy.login};
    page.seenOps = legacy.seenOps;
    return {state: enterEnv({...legacy, envs: [page, ...others]}, envId), others};
}

/**
 * Loads the state of the page. For a saved API the shared state is used (created from the page's own
 * state on its first visit); returns environments found in that old state that are new to the API.
 */
export async function initApiState(specUrl: string, page?: PageEnv): Promise<Environment[]> {
    deviceId = await storageGet<string>(DEVICE_KEY) ?? newId();
    await storageSet({[DEVICE_KEY]: deviceId});
    const legacyKey = pageStateKey(specUrl);
    legacyKeyOfPage = legacyKey;
    let others: Environment[] = [];
    if (!page) {
        const stored = await storageGet<Partial<ApiState>>(legacyKey);
        apiStore.set({...DEFAULT_API, ...stored});
        markView(apiStore.get());
        bindStorage(legacyKey);
    } else {
        const key = PROJECT_PREFIX + page.apiId;
        const stored = await storageGet<Partial<ApiState>>(key);
        if (stored) {
            apiStore.set(enterEnv({...DEFAULT_API, ...stored}, page.envId));
            markView(apiStore.get());
        } else {
            const adopted = adoptLegacy({...DEFAULT_API, ...(await storageGet<Partial<ApiState>>(legacyKey))}, page.envId);
            apiStore.set(adopted.state);
            others = adopted.others;
        }
        bindStorage(key);
        if (!stored) {
            await flushApiState();
            // The API took over the page's own state.
            await removeKeys([legacyKey]);
        }
    }

    // Saved tokens and projects of the popup.
    type PopupData = { swaggers?: SavedToken[]; settings?: { projects?: string[]; activeProject?: string | null } } | undefined;
    type Mirror = PopupTokens;
    const sites = (await storageGet<string[]>(TOKEN_SITES_KEY)) ?? [];
    tokenAccess = page ? "api" : isLocalHost(location.hostname) ? "local" : sites.includes(location.origin) ? "site" : "ask";
    const applyTokens = (value: Mirror) => {
        popupTokens = value;
        publishTokens();
    };
    const fromPopup = (data: PopupData): Mirror => ({swaggers: data?.swaggers, projects: data?.settings?.projects, activeProject: data?.settings?.activeProject});
    const popupData = await storageGet<PopupData>(POPUP_DATA_KEY);
    applyTokens(popupData ? fromPopup(popupData) : await storageGet<Mirror>(TOKENS_KEY));
    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local") return;
            if (changes[POPUP_DATA_KEY]) applyTokens(fromPopup(changes[POPUP_DATA_KEY].newValue as PopupData));
            else if (changes[TOKENS_KEY]?.newValue) applyTokens(changes[TOKENS_KEY].newValue as Mirror);
        });
    } catch {
        // ignore
    }
    return others;
}

/**
 * The page was just saved as (an environment of) an API: switch to that API's shared state. A new API
 * starts from the page's own state; an existing one keeps its state and only takes over this page's
 * token when the environment has none yet.
 */
export async function attachToApi(page: PageEnv, isNew: boolean): Promise<Environment[]> {
    const key = PROJECT_PREFIX + page.apiId;
    const current = apiStore.get();
    let others: Environment[] = [];
    if (isNew) {
        const adopted = adoptLegacy(current, page.envId);
        apiStore.set(adopted.state);
        others = adopted.others;
    } else {
        const stored = await storageGet<Partial<ApiState>>(key);
        apiStore.set(enterEnv({...DEFAULT_API, ...stored}, page.envId, {token: current.token, tokenLabel: current.tokenLabel, login: current.login}));
    }
    bindStorage(key);
    await flushApiState();
    if (legacyKeyOfPage) await removeKeys([legacyKeyOfPage]);
    // Saving the page as an API is the user trusting it.
    tokenAccess = "api";
    publishTokens();
    return others;
}

// ---------------------------------------------------------------------------
// Actions

const touch = (state: ApiState): ApiState => ({...state, updatedAt: new Date().toISOString()});

export const actions = {
    /** Opens an endpoint. A non pinned open replaces the current preview tab. */
    openTab(key: string, pin = false) {
        apiStore.set((s) => {
            let tabs = s.tabs;
            let preview = s.preview;
            if (!tabs.includes(key)) {
                if (!pin && preview && tabs.includes(preview)) {
                    tabs = tabs.map((k) => (k === preview ? key : k));
                } else {
                    const index = s.active ? tabs.indexOf(s.active) : -1;
                    const firstFree = tabs.filter((k) => s.pinnedTabs.includes(k)).length;
                    tabs = [...tabs];
                    tabs.splice(index < 0 ? tabs.length : Math.max(firstFree, index + 1), 0, key);
                }
                preview = pin ? (preview === key ? null : preview) : key;
            } else if (pin && preview === key) {
                preview = null;
            }
            return {...s, tabs, preview, active: key};
        });
    },
    pinTab(key: string) {
        if (apiStore.get().preview === key) apiStore.set({preview: null});
    },
    activateTab(key: string) {
        apiStore.set({active: key});
    },
    closeTab(key: string) {
        apiStore.set((s) => {
            const index = s.tabs.indexOf(key);
            const tabs = s.tabs.filter((k) => k !== key);
            const active = s.active === key ? (tabs[Math.min(index, tabs.length - 1)] ?? null) : s.active;
            return {...s, tabs, active, preview: s.preview === key ? null : s.preview, pinnedTabs: s.pinnedTabs.filter((k) => k !== key)};
        });
    },
    closeOtherTabs(key: string) {
        apiStore.set((s) => {
            const tabs = s.tabs.filter((k) => k === key || s.pinnedTabs.includes(k));
            return {...s, tabs, active: key, preview: s.preview === key ? key : null};
        });
    },
    closeTabsToRight(key: string) {
        apiStore.set((s) => {
            const index = s.tabs.indexOf(key);
            const tabs = s.tabs.filter((k, i) => i <= index || s.pinnedTabs.includes(k));
            return {...s, tabs, active: s.active && tabs.includes(s.active) ? s.active : key, preview: s.preview && tabs.includes(s.preview) ? s.preview : null};
        });
    },
    closeAllTabs() {
        apiStore.set((s) => {
            const tabs = s.tabs.filter((k) => s.pinnedTabs.includes(k));
            return {...s, tabs, active: s.active && tabs.includes(s.active) ? s.active : (tabs[0] ?? null), preview: null};
        });
    },
    /** Pins a tab (moves it after the other pinned tabs and stops it from being a preview tab) or unpins it. */
    togglePinnedTab(key: string) {
        apiStore.set((s) => {
            const pinned = s.pinnedTabs.includes(key);
            const pinnedTabs = pinned ? s.pinnedTabs.filter((k) => k !== key) : [...s.pinnedTabs, key];
            const rest = s.tabs.filter((k) => k !== key);
            const pinnedOpen = rest.filter((k) => pinnedTabs.includes(k));
            const unpinnedOpen = rest.filter((k) => !pinnedTabs.includes(k));
            // pinning puts it last among the pinned tabs, unpinning first among the others: the same place
            const tabs = [...pinnedOpen, key, ...unpinnedOpen];
            return {...s, pinnedTabs, tabs, preview: s.preview === key ? null : s.preview};
        });
    },
    moveTab(from: string, to: string) {
        apiStore.set((s) => {
            const tabs = s.tabs.filter((k) => k !== from);
            const index = tabs.indexOf(to);
            tabs.splice(index < 0 ? tabs.length : index, 0, from);
            return {...s, tabs};
        });
    },
    toggleFavorite(key: string) {
        apiStore.set((s) => touch({
            ...s,
            favorites: s.favorites.includes(key) ? s.favorites.filter((k) => k !== key) : [...s.favorites, key],
        }));
    },
    moveFavorite(from: string, to: string) {
        apiStore.set((s) => {
            const list = s.favorites.filter((k) => k !== from);
            const index = list.indexOf(to);
            list.splice(index < 0 ? list.length : index, 0, from);
            return touch({...s, favorites: list});
        });
    },
    setDraft(key: string, draft: Draft) {
        apiStore.set((s) => ({...s, drafts: {...s.drafts, [key]: draft}, preview: s.preview === key ? null : s.preview}));
    },
    resetDraft(key: string) {
        apiStore.set((s) => {
            const drafts = {...s.drafts};
            delete drafts[key];
            return {...s, drafts};
        });
    },
    rememberParam(name: string, value: string) {
        if (!value) return;
        apiStore.set((s) => s.paramMemory[name] === value ? s : {...s, paramMemory: {...s.paramMemory, [name]: value}});
    },
    toggleCollapsed(id: string) {
        apiStore.set((s) => ({
            ...s,
            collapsed: s.collapsed.includes(id) ? s.collapsed.filter((c) => c !== id) : [...s.collapsed, id],
        }));
    },
    setCollapsed(ids: string[]) {
        apiStore.set({collapsed: ids});
    },
    setToken(token: string, tokenLabel?: string) {
        apiStore.set({token: token.trim(), tokenLabel: token.trim() ? tokenLabel : undefined});
    },
    // ---- templates
    saveTemplate(key: string, name: string, draft: Draft) {
        apiStore.set((s) => {
            const list = (s.templates[key] ?? []).filter((t) => t.name !== name);
            return {...s, templates: {...s.templates, [key]: [...list, {name, draft, at: Date.now()}]}};
        });
    },
    deleteTemplate(key: string, name: string) {
        apiStore.set((s) => ({...s, templates: {...s.templates, [key]: (s.templates[key] ?? []).filter((t) => t.name !== name)}}));
    },
    applyTemplate(key: string, name: string) {
        const template = apiStore.get().templates[key]?.find((t) => t.name === name);
        if (template) apiStore.set((s) => ({...s, drafts: {...s.drafts, [key]: structuredClone(template.draft)}}));
    },

    // ---- login recipe
    setLogin(login: LoginRecipe | undefined) {
        apiStore.set({login});
    },
    setAutoRelogin(autoRelogin: boolean) {
        apiStore.set({autoRelogin});
    },

    // ---- spec changes
    markOpsSeen(signatures: Record<string, string>) {
        apiStore.set({seenOps: signatures});
    },

    setBaseUrl(baseUrl: string) {
        apiStore.set({baseUrl});
    },
    pushHistory(entry: HistoryEntry) {
        apiStore.set((s) => ({...s, history: [entry, ...s.history].slice(0, 150)}));
    },
    clearHistory() {
        apiStore.set({history: []});
    },
    setResponse(key: string, response: SentResponse | undefined) {
        sessionStore.set((s) => {
            const previous = s.responses[key];
            if (previous?.blobUrl) URL.revokeObjectURL(previous.blobUrl);
            const responses = {...s.responses};
            if (response) responses[key] = response;
            else delete responses[key];
            return {...s, responses};
        });
    },
    setLoading(key: string, loading: boolean) {
        sessionStore.set((s) => ({...s, loading: {...s.loading, [key]: loading}}));
    },
    setFiles(key: string, field: string, files: File[]) {
        sessionStore.set((s) => ({...s, files: {...s.files, [key]: {...s.files[key], [field]: files}}}));
    },
};

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function notify(text: string, kind: "ok" | "err" | "info" = "info") {
    clearTimeout(toastTimer);
    sessionStore.set({toast: {id: ++toastId, text, kind}});
    toastTimer = setTimeout(() => sessionStore.set({toast: null}), kind === "err" ? 4000 : 2200);
}
