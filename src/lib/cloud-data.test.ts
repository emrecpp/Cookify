import {describe, expect, it} from "vitest";
import {cloudState, contentEqual, fromStorage, mergeSwaggerUi, toCloud} from "./cloud-data";
import {stableJson as stable} from "./values";
import {SwaggerUiData, SyncSnapshot} from "@/types/types";

const ui = (states: SwaggerUiData["states"], extra: Partial<SwaggerUiData> = {}): SwaggerUiData => ({states, ...extra});
const api = (fields: Record<string, unknown>) => ({favorites: [], history: [], tabs: [], envs: [], ...fields});

describe("mergeSwaggerUi", () => {
    it("keeps favorites added on both computers and drops the ones removed on either", () => {
        const base = ui({"project:r": api({favorites: ["a", "b"]})});
        const local = ui({"project:r": api({favorites: ["a", "b", "c"]})});
        const cloud = ui({"project:r": api({favorites: ["b", "d"]})});
        expect(mergeSwaggerUi(local, cloud, base)!.states["project:r"].favorites).toEqual(["b", "c", "d"]);
    });

    it("continues where you left off: the open tabs changed last win", () => {
        const base = ui({"project:r": api({tabs: ["x"], active: "x", viewAt: 1})});
        const here = ui({"project:r": api({tabs: ["x", "y"], active: "y", viewAt: 2})});
        const other = ui({"project:r": api({tabs: ["z"], active: "z", viewAt: 3, viewBy: "pc-b", favorites: ["f"]})});
        expect(mergeSwaggerUi(here, other, base)!.states["project:r"]).toMatchObject({tabs: ["z"], active: "z", viewBy: "pc-b", favorites: ["f"]});
        const older = ui({"project:r": api({tabs: ["z"], active: "z", viewAt: 1})});
        expect(mergeSwaggerUi(here, older, base)!.states["project:r"]).toMatchObject({tabs: ["x", "y"], active: "y"});
    });

    it("keeps the longer history and the seen endpoints of this computer", () => {
        const history = Array.from({length: 30}, (_, i) => ({key: `k${i}`, at: 100 - i}));
        const local = ui({"project:r": api({history, seenOps: {a: "1"}, collapsed: ["Auth"], envs: [{id: "dev", seenOps: {a: "1"}}]})});
        const cloud = ui({"project:r": api({history: [{key: "new", at: 200}], envs: [{id: "dev", token: "t"}]})});
        const merged = mergeSwaggerUi(local, cloud, local)!.states["project:r"];
        expect((merged.history as unknown[]).length).toBe(31);
        expect(merged).toMatchObject({seenOps: {a: "1"}, collapsed: ["Auth"], envs: [{id: "dev", token: "t", seenOps: {a: "1"}}]});
    });

    it("takes an API state from the cloud on a new computer, open tabs included", () => {
        const cloud = ui({"project:r": api({tabs: ["z"], active: "z"})});
        expect(mergeSwaggerUi(ui({}), cloud)!.states["project:r"]).toMatchObject({tabs: ["z"], active: "z"});
    });

    it("syncs environment tokens and refreshes the active environment's copy", () => {
        const env = (token: string) => ({id: "dev", name: "Development", kind: "local", token});
        const base = ui({"project:r": api({activeEnv: "dev", token: "old", envs: [env("old")]})});
        const local = ui({"project:r": api({activeEnv: "dev", token: "old", envs: [env("old")]})});
        const cloud = ui({"project:r": api({activeEnv: "prod", token: "p", envs: [env("new")]})});
        const merged = mergeSwaggerUi(local, cloud, base)!.states["project:r"];
        expect(merged).toMatchObject({activeEnv: "dev", token: "new", envs: [env("new")]});
    });

    it("joins the request history of both computers", () => {
        const local = ui({"project:r": api({history: [{key: "a", at: 3}, {key: "b", at: 1}]})});
        const cloud = ui({"project:r": api({history: [{key: "c", at: 2}, {key: "b", at: 1}]})});
        expect((mergeSwaggerUi(local, cloud)!.states["project:r"].history as { at: number }[]).map((h) => h.at)).toEqual([3, 2, 1]);
    });

    it("removes an API state deleted on the other computer, unless it changed here", () => {
        const base = ui({"project:a": api({favorites: ["x"]}), "project:b": api({favorites: ["y"]})});
        const local = ui({"project:a": api({favorites: ["x"]}), "project:b": api({favorites: ["y", "z"]})});
        expect(Object.keys(mergeSwaggerUi(local, ui({}), base)!.states)).toEqual(["project:b"]);
    });

    it("merges saved APIs by id and preferences per field", () => {
        const base = ui({}, {apis: {apis: [{id: "r", name: "Shop"}], version: 2}, prefs: {theme: "dark", sideWidth: 320}});
        const local = ui({}, {apis: {apis: [{id: "r", name: "Shop"}, {id: "e", name: "Billing"}], version: 2}, prefs: {theme: "light", sideWidth: 320}});
        const cloud = ui({}, {apis: {apis: [{id: "r", name: "Shop API v2"}], version: 2}, prefs: {theme: "dark", sideWidth: 400}});
        const merged = mergeSwaggerUi(local, cloud, base)!;
        expect(merged.apis!.apis).toEqual([{id: "r", name: "Shop API v2"}, {id: "e", name: "Billing"}]);
        expect(merged.prefs).toEqual({theme: "light", sideWidth: 400});
    });
});

describe("storage and secrets", () => {
    const stored = {
        cookifyData: {cookies: [], swaggers: [{id: "1", alias: "admin", bearerToken: "t", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"}], settings: {applyOnClick: false, projects: [], activeProject: null, updatedAt: "2026-01-01T00:00:00.000Z"}},
        cookifySwaggerApis: {apis: [{id: "r"}], version: 2},
        "cookifySwaggerApi:project:r": api({token: "secret", envs: [{id: "dev", token: "secret", login: {opKey: "x"}}]}),
        "cookifySpecCache:http://x": {text: "{}"},
    };

    it("reads everything that syncs and leaves the spec cache out", () => {
        const snapshot = fromStorage(stored);
        expect(snapshot.swaggers[0].alias).toBe("admin");
        expect(Object.keys(snapshot.swaggerUi!.states)).toEqual(["project:r"]);
        expect(stable(snapshot)).not.toContain("cookifySpecCache");
    });

    it("syncs a change of the open tabs, not of what stays on the computer", () => {
        const a = fromStorage(stored);
        const withState = (extra: Record<string, unknown>): SyncSnapshot => ({...a, swaggerUi: ui({"project:r": {...a.swaggerUi!.states["project:r"], ...extra}}, {apis: a.swaggerUi!.apis})});
        expect(contentEqual(a, withState({seenOps: {x: "1"}, collapsed: ["Auth"], updatedAt: "now"}))).toBe(true);
        expect(contentEqual(a, withState({tabs: ["other"], active: "other"}))).toBe(false);
        expect(contentEqual(a, withState({viewAt: 5, viewBy: "other"}))).toBe(true);
    });

    it("sends only what helps on another computer to the cloud", () => {
        const state = cloudState(api({
            history: Array.from({length: 40}, (_, i) => ({key: `k${i}`, at: i})),
            seenOps: {a: "1"}, collapsed: ["Auth"], updatedAt: "x",
            activeEnv: "dev", token: "copy", envs: [{id: "dev", token: "t", seenOps: {a: "1"}}],
            drafts: {used: {params: {id: "7"}}, empty: {params: {id: ""}, headers: [{key: "", value: ""}]}},
        }));
        expect((state.history as unknown[]).length).toBe(10);
        expect(state).not.toHaveProperty("seenOps");
        expect(state).not.toHaveProperty("collapsed");
        expect(state).not.toHaveProperty("token");
        expect(state.envs).toEqual([{id: "dev", token: "t"}]);
        expect(Object.keys(state.drafts as object)).toEqual(["used"]);
        expect(stable(toCloud(fromStorage(stored)))).not.toContain("seenOps");
    });

    it("leaves pages that were only looked at out of the cloud copy, but keeps them here", () => {
        const looked = api({seenOps: {a: "1"}, collapsed: [], drafts: {}, paramMemory: {}, templates: {}});
        const snapshot = fromStorage({...stored, "cookifySwaggerApi:http://other/openapi.json": looked});
        expect(Object.keys(toCloud(snapshot).swaggerUi!.states)).toEqual(["project:r"]);
        const merged = mergeSwaggerUi(snapshot.swaggerUi, toCloud(snapshot).swaggerUi, snapshot.swaggerUi)!;
        expect(Object.keys(merged.states)).toContain("http://other/openapi.json");
    });
});
