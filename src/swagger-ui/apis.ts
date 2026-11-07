// Saved APIs (projects) and their environments. An API such as "Shop" has environments such as
// Development (localhost:8000/docs) and Production (api.example.com/docs); each environment is
// a Swagger docs page. Switching environment opens that page. The environments of an API share its
// favorites, tabs and drafts; token and login stay per environment (see initApiState).
// Shared with the Cookify popup through chrome.storage.
import {EnvKind, Environment, flushApiState, guessKind, KIND_LABEL, KIND_SHORT, newId, removeApiStates, storageGet, storageSet} from "./state";
import {originOf} from "@/lib/values";
import {createStore} from "./store";

export const APIS_KEY = "cookifySwaggerApis";

export interface ApiEnv {
    id: string;
    kind: EnvKind;
    name: string;
    /** Swagger docs page of this environment (origin + path). */
    docsUrl: string;
}

export interface SavedApi {
    id: string;
    name: string;
    /** Spec title when saved: suggests this API when another environment of it is opened. */
    title?: string;
    envs: ApiEnv[];
    /** Environment opened last, used when switching to this API. */
    lastEnv?: string;
    addedAt: number;
}

export interface ApisState {
    apis: SavedApi[];
}

export const apisStore = createStore<ApisState>({apis: []});

/** Identity of the current docs page; matches the spec cache key, so a switch renders from cache. */
export const currentDocsUrl = () => location.origin + location.pathname.replace(/\/+$/, "");

export function hostOf(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

/** Default name of a new API: the spec title. */
export function suggestName(title: string, docsUrl: string) {
    return title.trim() || hostOf(docsUrl);
}

/** localhost, *.local / *.test and private network addresses are usually served over plain http. */
function servedOverHttp(host: string) {
    return /^(localhost|127\.|0\.0\.0\.0|\[|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || /\.(local|localhost|test)$/.test(host);
}

/**
 * Turns what the user typed into a Swagger page address. "localhost:8000" or "api.example.com" is
 * enough: the scheme (http for local addresses, https otherwise) and FastAPI's /docs path are added.
 * Returns null for anything that is not a url.
 */
export function normalizeDocsUrl(input: string): string | null {
    let text = input.trim();
    if (!text) return null;
    if (!/^https?:\/\//i.test(text)) text = `${servedOverHttp(text.split(/[/:?#]/)[0].toLowerCase()) ? "http" : "https"}://${text}`;
    try {
        const url = new URL(text);
        const path = url.pathname === "/" ? "/docs" : url.pathname.replace(/\/+$/, "");
        return url.origin + path;
    } catch {
        return null;
    }
}

/** How a Swagger address is shown and edited: without the default /docs path. */
export function shortUrl(docsUrl: string) {
    return docsUrl.replace(/\/docs$/, "");
}

/**
 * The API and environment a docs page belongs to: the environment with this exact address, else the
 * one on the same server (its Swagger page lives at another path than the one saved).
 */
export function findEnv(apis: SavedApi[], docsUrl: string): { api: SavedApi; env: ApiEnv } | null {
    for (const api of apis) {
        const env = api.envs.find((e) => e.docsUrl === docsUrl);
        if (env) return {api, env};
    }
    const origin = originOf(docsUrl);
    if (!origin) return null;
    for (const api of apis) {
        const env = api.envs.find((e) => originOf(e.docsUrl) === origin);
        if (env) return {api, env};
    }
    return null;
}

export function newEnv(kind: EnvKind, docsUrl: string, name?: string): ApiEnv {
    return {id: newId(), kind, name: name?.trim() || KIND_LABEL[kind], docsUrl};
}

/** The environment types of an API, e.g. "Dev · Prod ×2". */
export function envSummary(api: SavedApi) {
    const kinds = [...new Set(api.envs.map((env) => env.kind))];
    return kinds.map((kind) => {
        const count = api.envs.filter((env) => env.kind === kind).length;
        return count > 1 ? `${KIND_SHORT[kind]} ×${count}` : KIND_SHORT[kind];
    }).join(" · ");
}

/** Entries saved before APIs had environments: {docsUrl, name, specUrl, envKind?}. */
interface OldEntry {
    docsUrl: string;
    name: string;
    envKind?: EnvKind;
    addedAt?: number;
}

/** Version of the stored list; 2 = APIs with environments. */
const LIST_VERSION = 2;

/**
 * Reads the stored list. Entries saved before APIs had environments ({docsUrl, name}) become an API
 * with one environment, and entries of that time with the same name (e.g. a localhost and a production
 * address of one API) become one API with several environments.
 */
export function migrate(list: unknown[], version?: number): { apis: SavedApi[]; changed: boolean } {
    if (version === LIST_VERSION) return {apis: list as SavedApi[], changed: false};
    const apis: SavedApi[] = [];
    for (const item of list) {
        const old = item as Partial<SavedApi> & Partial<OldEntry>;
        const api: SavedApi = Array.isArray(old.envs) && old.id
            ? old as SavedApi
            : {id: newId(), name: old.name ?? hostOf(old.docsUrl ?? ""), envs: [newEnv(old.envKind ?? guessKind("", old.docsUrl), old.docsUrl ?? "")], addedAt: old.addedAt ?? Date.now()};
        const same = apis.find((a) => a.name.trim().toLowerCase() === api.name.trim().toLowerCase());
        if (same) same.envs.push(...api.envs.filter((e) => !same.envs.some((x) => x.docsUrl === e.docsUrl)));
        else apis.push({...api, envs: [...api.envs]});
    }
    return {apis, changed: true};
}

function save() {
    void storageSet({[APIS_KEY]: {...apisStore.get(), version: LIST_VERSION}});
}

export async function loadApis() {
    const stored = await storageGet<{ apis?: unknown[]; version?: number }>(APIS_KEY);
    const {apis, changed} = migrate(stored?.apis ?? [], stored?.version);
    apisStore.set({apis});
    if (changed) save();
    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local" || !changes[APIS_KEY]) return;
            const next = changes[APIS_KEY].newValue as { apis?: unknown[]; version?: number } | undefined;
            apisStore.set({apis: migrate(next?.apis ?? [], next?.version).apis});
        });
    } catch {
        // extension context invalidated
    }
}

const updateApi = (id: string, change: (api: SavedApi) => SavedApi) => {
    apisStore.set((s) => ({...s, apis: s.apis.map((a) => (a.id === id ? change(a) : a))}));
    save();
};

export const apisActions = {
    create(name: string, env: ApiEnv, title?: string): SavedApi {
        const api: SavedApi = {id: newId(), name, title, envs: [env], lastEnv: env.id, addedAt: Date.now()};
        apisStore.set((s) => ({...s, apis: [...s.apis, api]}));
        save();
        return api;
    },
    addEnvs(apiId: string, envs: ApiEnv[]) {
        updateApi(apiId, (a) => ({...a, envs: [...a.envs, ...envs.filter((e) => !a.envs.some((x) => x.docsUrl === e.docsUrl))]}));
    },
    setEnvs(apiId: string, envs: ApiEnv[]) {
        updateApi(apiId, (a) => ({...a, envs, lastEnv: envs.some((e) => e.id === a.lastEnv) ? a.lastEnv : envs[0]?.id}));
    },
    /** Marks the environment as opened last and corrects its address to the page actually open. */
    visited(apiId: string, envId: string, docsUrl: string) {
        const api = apisStore.get().apis.find((a) => a.id === apiId);
        const env = api?.envs.find((e) => e.id === envId);
        if (!api || !env || (api.lastEnv === envId && env.docsUrl === docsUrl)) return;
        updateApi(apiId, (a) => ({...a, lastEnv: envId, envs: a.envs.map((e) => (e.id === envId ? {...e, docsUrl} : e))}));
    },
    /** Moves an API up (-1) or down (1) in the list. */
    move(id: string, by: number) {
        const apis = [...apisStore.get().apis];
        const from = apis.findIndex((a) => a.id === id);
        const to = from + by;
        if (from < 0 || to < 0 || to >= apis.length) return;
        apis.splice(to, 0, ...apis.splice(from, 1));
        apisStore.set((s) => ({...s, apis}));
        save();
    },
    /** Replaces the list (manage dialog: rename, reorder, remove). */
    replace(apis: SavedApi[]) {
        const removed = apisStore.get().apis.filter((a) => !apis.some((x) => x.id === a.id)).map((a) => a.id);
        apisStore.set((s) => ({...s, apis}));
        save();
        // A removed API takes its favorites, drafts and tokens with it.
        removeApiStates(removed);
    },
};

/** Opens a docs page in this tab, saving the state first so the other environment sees it. */
export async function openDocs(docsUrl: string) {
    // Saved addresses also arrive through sync and import files: only ever open them as web pages.
    if (docsUrl === currentDocsUrl() || !/^https?:\/\//i.test(docsUrl)) return;
    await flushApiState();
    location.href = docsUrl;
}

/** Switches to another API, at the environment opened last there. */
export function switchApi(api: SavedApi) {
    const env = api.envs.find((e) => e.id === api.lastEnv) ?? api.envs[0];
    if (env) void openDocs(env.docsUrl);
}

/** Environments that only switched the server (before APIs had environments), as API environments. */
export function envsFromRecords(records: Environment[]): ApiEnv[] {
    return records.flatMap((r) => {
        const docsUrl = normalizeDocsUrl(r.baseUrl ?? "");
        return docsUrl ? [{id: r.id, kind: r.kind, name: r.name || KIND_LABEL[r.kind], docsUrl}] : [];
    });
}
