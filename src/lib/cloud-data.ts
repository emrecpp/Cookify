// Everything Cookify keeps in Google Drive and in export files, read from / written to chrome.storage.local,
// and how two copies of it are merged. Runs in the popup and in the background service worker.
//
// Synced: the popup data (cookies, saved tokens, projects, settings) and what is useful to continue on another
// computer in the Swagger view: saved APIs and environments, tokens and logins per environment, favorites,
// request inputs (drafts, templates, remembered parameters), the last requests, the open endpoint tabs and
// preferences. Left on the computer: the spec cache, the "seen endpoints" signatures (rebuilt on the first
// visit), collapsed sidebar groups and the longer request history.
import {mergeSnapshots, normalizeSnapshot, syncSnapshotsEqual} from "@/lib/sync";
import {isObject, stableJson} from "@/lib/values";
import {APIS_KEY} from "@/swagger-ui/apis";
import {API_PREFIX, POPUP_DATA_KEY, PREFS_KEY} from "@/swagger-ui/state";
import {CookieData, Settings, SwaggerData, SwaggerUiData, SyncSnapshot} from "@/types/types";

/** Popup data (cookies, saved Swagger tokens, settings). Lived in the popup's localStorage before. */
export const DATA_KEY = POPUP_DATA_KEY;
/** Google Drive sync configuration and status. */
export const SYNC_KEY = "cookifySync";
/** The snapshot of the last completed sync (the common ancestor of the next three-way merge). */
export const SYNC_BASE_KEY = "cookifySyncBaseline";

export interface PopupData {
    cookies?: CookieData[];
    swaggers?: SwaggerData[];
    settings?: Partial<Settings>;
}

type State = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Value helpers

const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);

/** Three-way pick of one value; `undefined` means absent. Changed on both sides: `local` (or `cloud`) wins. */
function pick<T>(local: T | undefined, cloud: T | undefined, base: T | undefined, preferCloud: boolean): T | undefined {
    if (same(local, cloud)) return local;
    if (same(local, base)) return cloud;
    if (same(cloud, base)) return local;
    return preferCloud ? cloud : local;
}

/** Items added on either side are kept, items removed on either side are dropped. */
function mergeList<T>(local: T[] = [], cloud: T[] = [], base: T[] = [], idOf: (item: T) => string): T[] {
    const ids = (items: T[]) => new Set(items.map(idOf));
    const inLocal = ids(local), inCloud = ids(cloud), inBase = ids(base);
    const keep = (item: T) => {
        const id = idOf(item);
        return !(inBase.has(id) && (!inLocal.has(id) || !inCloud.has(id)));
    };
    return [...local.filter(keep), ...cloud.filter((item) => !inLocal.has(idOf(item)) && keep(item))];
}

/** Items with an id, each merged on its own; the order follows the side that changed it. */
function mergeById<T>(local: T[] = [], cloud: T[] = [], base: T[] = [], idOf: (item: T) => string, preferCloud: boolean): T[] {
    const map = (items: T[]) => new Map(items.map((item) => [idOf(item), item]));
    const L = map(local), C = map(cloud), B = map(base);
    const order = same(local.map(idOf), base.map(idOf)) ? [...C.keys(), ...L.keys()] : [...L.keys(), ...C.keys()];
    const result: T[] = [];
    for (const id of new Set(order)) {
        const item = pick(L.get(id), C.get(id), B.get(id), preferCloud);
        if (item !== undefined) result.push(item);
    }
    return result;
}

function mergeRecord(local: State = {}, cloud: State = {}, base: State = {}, preferCloud: boolean): State {
    const result: State = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
        const value = pick(local[key], cloud[key], base[key], preferCloud);
        if (value !== undefined) result[key] = value;
    }
    return result;
}

// ---------------------------------------------------------------------------
// Swagger view API states

/** Kept on this computer only: rebuilt there, or only meaningful there. */
const LOCAL_FIELDS = ["collapsed", "seenOps", "updatedAt"];
/** The active environment's copy of its server / token / login (its record in `envs` syncs). */
const LIVE_FIELDS = ["baseUrl", "token", "tokenLabel", "login"];
/** Where the user is: open endpoint tabs and the active one. The side that changed it last wins. */
const VIEW_FIELDS = ["tabs", "preview", "active", "pinnedTabs", "viewAt", "viewBy"];
/** Request history entries in the cloud copy; the computer keeps its own longer list. */
export const CLOUD_HISTORY = 10;
const HISTORY_LIMIT = 150;

type HistoryItem = { key: string; at: number };

const omit = (state: State, keys: string[]) => Object.fromEntries(Object.entries(state).filter(([key]) => !keys.includes(key)));

function isEmptyDraft(draft: unknown): boolean {
    if (!isObject(draft)) return true;
    const filled = (value: unknown) => (typeof value === "string" ? value.trim() !== "" : value !== undefined && value !== null);
    const anyFilled = (record: unknown) => isObject(record) && Object.values(record).some(filled);
    const headers = Array.isArray(draft.headers) && draft.headers.some((h) => isObject(h) && filled(h.key));
    return !anyFilled(draft.params) && !anyFilled(draft.form) && !filled(draft.body) && !headers;
}

/** An API state as it goes to the cloud and into export files: only what helps on another computer. */
export function cloudState(state: State): State {
    const out = omit(state, [...LOCAL_FIELDS, ...(state.activeEnv ? LIVE_FIELDS : [])]);
    if (Array.isArray(out.envs)) out.envs = (out.envs as State[]).map((env) => omit(env, ["seenOps"]));
    if (Array.isArray(out.history)) out.history = (out.history as unknown[]).slice(0, CLOUD_HISTORY);
    if (isObject(out.drafts)) out.drafts = Object.fromEntries(Object.entries(out.drafts).filter(([, draft]) => !isEmptyDraft(draft)));
    return out;
}

/** The part of an API state that is merged field by field (the view is taken as a whole). */
export function stateContent(state: State): State {
    return omit(cloudState(state), [...VIEW_FIELDS, "activeEnv"]);
}

const hasValue = (value: unknown) => (Array.isArray(value) ? value.length > 0 : isObject(value) ? Object.keys(value).length > 0 : value !== undefined && value !== null && value !== "");

/** A page that was only looked at: nothing saved, nothing open (not worth a place in the cloud copy). */
export function isTrivialState(state: State): boolean {
    const content = stateContent(state);
    const keys = ["favorites", "history", "drafts", "templates", "paramMemory", "envs", "token", "login", "baseUrl"];
    return !keys.some((key) => hasValue(content[key])) && !hasValue(state.tabs);
}

const viewOf = (state: State) => Object.fromEntries(VIEW_FIELDS.filter((key) => key !== "viewAt" && key !== "viewBy").map((key) => [key, state[key]]));

/** New requests from both sides; requests removed here since the last sync (cleared history) stay removed. */
function mergeHistory(local: HistoryItem[] = [], cloud: HistoryItem[] = [], base: HistoryItem[] = []): HistoryItem[] {
    const id = (h: HistoryItem) => `${h.key}|${h.at}`;
    const inLocal = new Set(local.map(id));
    const inBase = new Set(base.map(id));
    return [...local, ...cloud.filter((h) => !inLocal.has(id(h)) && !inBase.has(id(h)))]
        .sort((x, y) => y.at - x.at)
        .slice(0, HISTORY_LIMIT);
}

function mergeState(local: State, cloud: State, base: State | undefined, preferCloud: boolean): State {
    const l = stateContent(local), c = stateContent(cloud), b = base ? stateContent(base) : {};
    const result: State = {};
    for (const key of new Set([...Object.keys(l), ...Object.keys(c)])) {
        let value: unknown;
        switch (key) {
            case "favorites":
                value = mergeList(l[key] as string[], c[key] as string[], b[key] as string[], String);
                break;
            case "history":
                value = mergeHistory(local.history as HistoryItem[], cloud.history as HistoryItem[], base?.history as HistoryItem[]);
                break;
            case "envs": {
                const seen = new Map(((local.envs ?? []) as State[]).map((env) => [env.id, env.seenOps]));
                value = mergeById(l[key] as State[], c[key] as State[], b[key] as State[], (e) => String(e.id), preferCloud)
                    .map((env) => (seen.get(env.id) ? {...env, seenOps: seen.get(env.id)} : env));
                break;
            }
            case "drafts":
            case "paramMemory":
            case "templates":
                value = mergeRecord(l[key] as State, c[key] as State, b[key] as State, preferCloud);
                break;
            default:
                value = pick(l[key], c[key], b[key], preferCloud);
        }
        if (value !== undefined) result[key] = value;
    }
    // Continue where you left off: the open tabs of the side that changed them last.
    const view = Number(cloud.viewAt ?? 0) > Number(local.viewAt ?? 0) ? cloud : local;
    for (const key of VIEW_FIELDS) if (view[key] !== undefined) result[key] = view[key];
    // This computer's own fields.
    for (const key of [...LOCAL_FIELDS, "activeEnv", ...(local.activeEnv ? LIVE_FIELDS : [])]) {
        if (local[key] !== undefined) result[key] = local[key];
    }
    return withEnvLive(result);
}

/** Refreshes the copy of the active environment's server / token / login from its (merged) record. */
function withEnvLive(state: State): State {
    if (!state.activeEnv || !Array.isArray(state.envs)) return state;
    const record = (state.envs as State[]).find((e) => e.id === state.activeEnv);
    if (!record) return state;
    return {...state, baseUrl: record.baseUrl, token: record.token ?? "", tokenLabel: record.tokenLabel, login: record.login, seenOps: record.seenOps ?? state.seenOps};
}

function mergeStates(local: SwaggerUiData["states"], cloud: SwaggerUiData["states"], base: SwaggerUiData["states"] = {}, preferCloud: boolean) {
    const result: SwaggerUiData["states"] = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
        const l = local[key], c = cloud[key], b = base[key];
        if (l && c) result[key] = mergeState(l, c, b, preferCloud);
        // One side only: removed on the other side (when unchanged since the last sync), or new.
        else if (l) {
            if (!b || isTrivialState(l) || !same(stateContent(l), stateContent(b))) result[key] = l;
        } else if (c) {
            if (!b || !same(stateContent(c), stateContent(b))) result[key] = c;
        }
    }
    return result;
}

type ApisValue = NonNullable<SwaggerUiData["apis"]>;

function mergeApis(local?: ApisValue, cloud?: ApisValue, base?: ApisValue, preferCloud = false): ApisValue | undefined {
    if (!local || !cloud) return local ?? cloud;
    return {
        apis: mergeById(local.apis as State[], cloud.apis as State[], base?.apis as State[], (a) => String(a.id), preferCloud),
        version: Math.max(local.version ?? 0, cloud.version ?? 0) || undefined,
    };
}

/** Merges the Swagger view data; `local` keeps its own open tabs and active environment. */
export function mergeSwaggerUi(local: SwaggerUiData | undefined, cloud: SwaggerUiData | undefined, base?: SwaggerUiData, preferCloud = false): SwaggerUiData | undefined {
    if (!cloud) return local;
    if (!local) return cloud;
    const prefs = local.prefs && cloud.prefs ? mergeRecord(local.prefs, cloud.prefs, base?.prefs, preferCloud) : local.prefs ?? cloud.prefs;
    return {prefs, apis: mergeApis(local.apis, cloud.apis, base?.apis, preferCloud), states: mergeStates(local.states, cloud.states, base?.states, preferCloud)};
}

const uiContent = (ui?: SwaggerUiData) => ui && {
    prefs: ui.prefs,
    apis: ui.apis,
    states: Object.fromEntries(Object.entries(ui.states)
        .filter(([, state]) => !isTrivialState(state))
        .map(([key, state]) => [key, {content: stateContent(state), view: viewOf(state)}])),
};

/** Equal for syncing: fields kept on the computer (and the longer history) are ignored. */
export function contentEqual(a: SyncSnapshot, b: SyncSnapshot): boolean {
    return syncSnapshotsEqual(a, b) && same(uiContent(a.swaggerUi), uiContent(b.swaggerUi));
}

/** Changes that can wait for the next upload: request inputs, recent requests, preferences, the open endpoints. */
const MINOR_FIELDS = ["drafts", "history", "paramMemory"];

const importantContent = ({cookies, swaggers, settings, swaggerUi}: SyncSnapshot) => ({
    cookies, swaggers,
    applyOnClick: settings?.applyOnClick,
    projects: settings?.projects,
    apis: swaggerUi?.apis,
    states: swaggerUi && Object.fromEntries(Object.entries(swaggerUi.states)
        .filter(([, state]) => !isTrivialState(state))
        .map(([key, state]) => [key, omit(stateContent(state), MINOR_FIELDS)])),
});

export type ChangeLevel = "none" | "minor" | "important";

/** How much the difference between two snapshots matters: it decides how soon it goes to the cloud. */
export function changeLevel(a: SyncSnapshot, b: SyncSnapshot): ChangeLevel {
    if (contentEqual(a, b)) return "none";
    return same(importantContent(a), importantContent(b)) ? "minor" : "important";
}

/** The snapshot as it goes to the cloud and into export files. */
export function toCloud(snapshot: SyncSnapshot): SyncSnapshot {
    const ui = snapshot.swaggerUi;
    if (!ui) return snapshot;
    const states = Object.entries(ui.states).filter(([, state]) => !isTrivialState(state));
    return {...snapshot, swaggerUi: {...ui, states: Object.fromEntries(states.map(([key, state]) => [key, cloudState(state)]))}};
}

/** Merges two full snapshots: the popup part may have conflicts (asked to the user), the Swagger part has none. */
export function mergeAll(local: SyncSnapshot, cloud: SyncSnapshot, base?: SyncSnapshot) {
    const popup = mergeSnapshots(local, cloud, base);
    return {popup, swaggerUi: mergeSwaggerUi(local.swaggerUi, cloud.swaggerUi, base?.swaggerUi)};
}

export function isEmpty(snapshot: SyncSnapshot): boolean {
    const ui = snapshot.swaggerUi;
    return !snapshot.cookies.length && !snapshot.swaggers.length && !snapshot.settings.projects.length
        && !snapshot.settings.activeProject && !snapshot.settings.applyOnClick
        && !ui?.apis?.apis.length && !Object.keys(ui?.states ?? {}).length;
}

// ---------------------------------------------------------------------------
// chrome.storage.local <-> snapshot

export function fromStorage(all: Record<string, unknown>): SyncSnapshot {
    const data = (all[DATA_KEY] ?? {}) as PopupData;
    const popup = normalizeSnapshot({cookies: data.cookies, swaggers: data.swaggers, settings: data.settings as Settings});
    const states: SwaggerUiData["states"] = {};
    for (const [key, value] of Object.entries(all)) {
        if (key.startsWith(API_PREFIX) && isObject(value)) states[key.slice(API_PREFIX.length)] = value;
    }
    return {
        ...popup,
        swaggerUi: {
            prefs: isObject(all[PREFS_KEY]) ? all[PREFS_KEY] as State : undefined,
            apis: isObject(all[APIS_KEY]) ? all[APIS_KEY] as ApisValue : undefined,
            states,
        },
    };
}

/** The stored keys that go to Google Drive and into export files. */
export const isSyncedKey = (key: string) => key === DATA_KEY || key === PREFS_KEY || key === APIS_KEY || key.startsWith(API_PREFIX);

/**
 * The synced data as stored, plus the snapshot of the last sync. Only those keys are read: the spec cache next to
 * them holds megabytes, and this runs a few seconds after every change.
 */
export async function readLocal(): Promise<{ all: Record<string, unknown>; snapshot: SyncSnapshot }> {
    const storage = chrome.storage.local;
    const all = typeof storage.getKeys === "function"
        ? await storage.get((await storage.getKeys()).filter((key) => isSyncedKey(key) || key === SYNC_BASE_KEY))
        : await storage.get(null); // before Chrome 130
    return {all, snapshot: fromStorage(all)};
}

/**
 * Writes `next` into chrome.storage.local, touching only the keys that changed (`all` is what is stored now).
 * API states that are not in `next` are removed.
 */
export async function writeLocal(next: SyncSnapshot, all: Record<string, unknown>): Promise<void> {
    const set: Record<string, unknown> = {};
    const remove: string[] = [];
    const data: PopupData = {cookies: next.cookies, swaggers: next.swaggers, settings: next.settings};
    const current = (all[DATA_KEY] ?? {}) as PopupData;
    if (!same({cookies: current.cookies, swaggers: current.swaggers, settings: current.settings}, data)) set[DATA_KEY] = {...current, ...data};

    const ui = next.swaggerUi;
    if (ui) {
        if (ui.prefs && !same(all[PREFS_KEY], ui.prefs)) set[PREFS_KEY] = ui.prefs;
        if (ui.apis && !same(all[APIS_KEY], ui.apis)) set[APIS_KEY] = ui.apis;
        for (const key of Object.keys(all)) {
            if (key.startsWith(API_PREFIX) && !(key.slice(API_PREFIX.length) in ui.states)) remove.push(key);
        }
        for (const [key, state] of Object.entries(ui.states)) {
            if (!same(all[API_PREFIX + key], state)) set[API_PREFIX + key] = state;
        }
    }
    if (Object.keys(set).length) await chrome.storage.local.set(set);
    if (remove.length) await chrome.storage.local.remove(remove);
}
