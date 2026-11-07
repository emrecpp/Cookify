import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const KEY = "cookifySwaggerApi:project:r";
type Listener = (changes: Record<string, { newValue: unknown }>, area: string) => void;

/** chrome.storage.local as the tabs of one browser share it: onChanged reaches every tab, for real changes only. */
function fakeStorage(initial: Record<string, unknown>) {
    const data = {...initial};
    const listeners: Listener[] = [];
    const writes = {count: 0};
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
    const local = {
        get: async (key: string) => (key in data ? {[key]: clone(data[key])} : {}),
        set: async (values: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(values)) {
                if (JSON.stringify(data[key]) === JSON.stringify(value)) continue;
                data[key] = clone(value);
                writes.count++;
                const changes = {[key]: {newValue: clone(value)}};
                listeners.forEach((listener) => setTimeout(() => listener(changes, "local"), 1));
            }
        },
        remove: async () => undefined,
    };
    vi.stubGlobal("chrome", {storage: {local, onChanged: {addListener: (listener: Listener) => listeners.push(listener)}}});
    vi.stubGlobal("location", {origin: "http://x", host: "x", hostname: "x"});
    return {data, writes, local};
}

/** A Swagger tab: its own copy of the module, like a content script. */
async function openPage(envId: string) {
    vi.resetModules();
    const state = await import("./state");
    await state.initApiState("http://x/openapi.json", {apiId: "r", envId});
    return state;
}

const saved = {
    activeEnv: "dev", token: "dev-token", collapsed: ["tag:Auth"], favorites: [], tabs: [], history: [], drafts: {},
    envs: [{id: "dev", name: "Dev", kind: "local", token: "dev-token"}, {id: "prod", name: "Prod", kind: "remote", token: "prod-token"}],
};

describe("tabs of one API on different environments", () => {
    beforeEach(() => void vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("don't answer each other's writes", async () => {
        const storage = fakeStorage({[KEY]: saved, cookifyDeviceId: "pc-a"});
        const dev = await openPage("dev");
        const prod = await openPage("prod");
        dev.actions.toggleFavorite("GET /a");
        await vi.advanceTimersByTimeAsync(10_000);
        expect(storage.writes.count).toBe(1);
        expect(prod.apiStore.get()).toMatchObject({favorites: ["GET /a"], activeEnv: "prod", token: "prod-token"});
    });

    it("keep their collapsed groups", async () => {
        fakeStorage({[KEY]: saved});
        const dev = await openPage("dev");
        const prod = await openPage("prod");
        dev.actions.setCollapsed([]);
        prod.actions.toggleFavorite("GET /a");
        await vi.advanceTimersByTimeAsync(5_000);
        expect(dev.apiStore.get().collapsed).toEqual([]);
        expect(prod.apiStore.get().collapsed).toEqual(["tag:Auth"]);
    });

    it("keep their own open endpoints, and the latest ones go to the cloud", async () => {
        const storage = fakeStorage({[KEY]: saved});
        const dev = await openPage("dev");
        const prod = await openPage("prod");
        dev.actions.openTab("GET /a");
        await vi.advanceTimersByTimeAsync(1_000);
        expect(prod.apiStore.get().tabs).toEqual([]);
        prod.actions.toggleFavorite("GET /f");
        await vi.advanceTimersByTimeAsync(1_000);
        expect(storage.data[KEY]).toMatchObject({tabs: ["GET /a"], active: "GET /a", favorites: ["GET /f"]});
        expect(prod.apiStore.get().tabs).toEqual([]);
        expect(dev.apiStore.get()).toMatchObject({tabs: ["GET /a"], favorites: ["GET /f"]});
    });

    it("follow the open endpoints of another computer", async () => {
        const storage = fakeStorage({[KEY]: saved});
        const dev = await openPage("dev");
        const prod = await openPage("prod");
        dev.actions.openTab("GET /a");
        await vi.advanceTimersByTimeAsync(1_000);
        await storage.local.set({[KEY]: {...saved, tabs: ["GET /z"], active: "GET /z", viewAt: Date.now() + 1_000, viewBy: "pc-b"}});
        await vi.advanceTimersByTimeAsync(5);
        expect(dev.apiStore.get()).toMatchObject({tabs: ["GET /z"], active: "GET /z"});
        expect(prod.apiStore.get()).toMatchObject({tabs: ["GET /z"], active: "GET /z"});
    });

    it("keep what was edited but not saved yet when a change comes in", async () => {
        const storage = fakeStorage({[KEY]: saved});
        const dev = await openPage("dev");
        dev.actions.setCollapsed([]);
        dev.actions.setBaseUrl("http://edited");
        await storage.local.set({[KEY]: {...saved, favorites: ["from-sync"]}});
        await vi.advanceTimersByTimeAsync(5);
        expect(dev.apiStore.get()).toMatchObject({favorites: ["from-sync"], baseUrl: "http://edited", collapsed: []});
        await vi.advanceTimersByTimeAsync(1_000);
        expect(storage.data[KEY]).toMatchObject({favorites: ["from-sync"], baseUrl: "http://edited", collapsed: []});
    });
});

describe("pages that look like Swagger UI", () => {
    afterEach(() => vi.unstubAllGlobals());

    const popup = {cookifyData: {swaggers: [{alias: "admin", bearerToken: "secret"}], settings: {projects: ["Shop"], activeProject: "Shop"}}};

    async function open(origin: string, data: Record<string, unknown>, page?: { apiId: string; envId: string }) {
        const storage = fakeStorage(data);
        vi.stubGlobal("location", {origin, host: new URL(origin).host, hostname: new URL(origin).hostname});
        vi.resetModules();
        const state = await import("./state");
        await state.initApiState("http://x/openapi.json", page);
        return {state, storage};
    }

    it("keep another origin's document state apart", async () => {
        const {pageStateKey} = await import("./state");
        expect(pageStateKey("http://x/openapi.json", "http://x")).toBe("cookifySwaggerApi:http://x/openapi.json");
        expect(pageStateKey("http://x/openapi.json", "https://evil.example")).toBe("cookifySwaggerApi:https://evil.example http://x/openapi.json");
    });

    it("don't get the token another origin used with the same document", async () => {
        const {state} = await open("https://evil.example", {...popup, "cookifySwaggerApi:http://x/openapi.json": {token: "page-token"}});
        expect(state.apiStore.get().token).toBe("");
    });

    it("hide saved tokens until the site is allowed", async () => {
        const {state, storage} = await open("https://unknown.example", popup);
        expect(state.sessionStore.get()).toMatchObject({tokenAccess: "ask", savedTokens: [], projects: [], hiddenTokens: 1});
        await state.setTokenSiteAccess(true);
        expect(state.sessionStore.get()).toMatchObject({tokenAccess: "site", hiddenTokens: 0, projects: ["Shop"]});
        expect(state.sessionStore.get().savedTokens).toHaveLength(1);
        expect(storage.data.cookifyTokenSites).toEqual(["https://unknown.example"]);
        await state.setTokenSiteAccess(false);
        expect(state.sessionStore.get()).toMatchObject({tokenAccess: "ask", savedTokens: [], hiddenTokens: 1});
        expect(storage.data.cookifyTokenSites).toEqual([]);
    });

    it("treat the user's own computer as trusted", async () => {
        const {isLocalHost} = await import("./state");
        for (const host of ["localhost", "LOCALHOST", "api.localhost", "127.0.0.1", "127.1.2.3", "[::1]"]) expect(isLocalHost(host)).toBe(true);
        for (const host of ["localhost.evil.com", "evil-localhost.com", "127.0.0.1.nip.io", "10.0.0.5", "192.168.1.2", "example.com"]) expect(isLocalHost(host)).toBe(false);
        const {state} = await open("http://localhost:8000", popup);
        expect(state.sessionStore.get()).toMatchObject({tokenAccess: "local", hiddenTokens: 0});
        expect(state.sessionStore.get().savedTokens).toHaveLength(1);
        const loopback = await open("http://127.0.0.1:3000", popup);
        expect(loopback.state.sessionStore.get().tokenAccess).toBe("local");
    });

    it("show saved tokens on allowed sites and saved APIs", async () => {
        const site = await open("https://allowed.example", {...popup, cookifyTokenSites: ["https://allowed.example"]});
        expect(site.state.sessionStore.get()).toMatchObject({tokenAccess: "site", hiddenTokens: 0});
        const api = await open("http://x", {...popup, [KEY]: saved}, {apiId: "r", envId: "dev"});
        expect(api.state.sessionStore.get()).toMatchObject({tokenAccess: "api", hiddenTokens: 0});
        expect(api.state.sessionStore.get().savedTokens).toHaveLength(1);
    });
});
