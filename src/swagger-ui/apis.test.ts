import {describe, expect, it} from "vitest";
import {apisActions, apisStore, envsFromRecords, envSummary, findEnv, migrate, normalizeDocsUrl, SavedApi} from "./apis";

describe("normalizeDocsUrl", () => {
    it("adds the scheme and FastAPI's /docs path when only a host is typed", () => {
        expect(normalizeDocsUrl("localhost:8000")).toBe("http://localhost:8000/docs");
        expect(normalizeDocsUrl("  https://api.example.com/  ")).toBe("https://api.example.com/docs");
    });
    it("uses https for public hosts and http for local ones when no scheme is typed", () => {
        expect(normalizeDocsUrl("auth.example.org")).toBe("https://auth.example.org/docs");
        expect(normalizeDocsUrl("api.example.com/")).toBe("https://api.example.com/docs");
        expect(normalizeDocsUrl("192.168.1.20:8000")).toBe("http://192.168.1.20:8000/docs");
        expect(normalizeDocsUrl("api.test")).toBe("http://api.test/docs");
    });
    it("keeps a given docs path and drops query, hash and trailing slashes", () => {
        expect(normalizeDocsUrl("http://localhost:8001/api/swagger/?x=1#top")).toBe("http://localhost:8001/api/swagger");
    });
    it("rejects empty or malformed input", () => {
        expect(normalizeDocsUrl("   ")).toBeNull();
        expect(normalizeDocsUrl("http://")).toBeNull();
    });
});

describe("saved APIs", () => {
    it("turns entries saved before environments existed into an API with one environment", () => {
        const {apis, changed} = migrate([{docsUrl: "http://localhost:8020/docs", name: "Shop", specUrl: "x", addedAt: 1}]);
        expect(changed).toBe(true);
        expect(apis[0]).toMatchObject({name: "Shop", addedAt: 1, envs: [{kind: "local", name: "Development", docsUrl: "http://localhost:8020/docs"}]});
        expect(migrate(apis, 2).changed).toBe(false);
    });
    it("joins old entries of the same API into one API with several environments", () => {
        const {apis} = migrate([
            {docsUrl: "http://localhost:8020/docs", name: "Shop API"},
            {docsUrl: "https://shop.example.com/docs", name: "Shop API", envKind: "production"},
            {docsUrl: "http://localhost:8001/docs", name: "Billing"},
        ]);
        expect(apis.map((a) => [a.name, a.envs.map((e) => e.kind)])).toEqual([["Shop API", ["local", "production"]], ["Billing", ["local"]]]);
    });
    it("gives server-only environments the swagger page of their server", () => {
        expect(envsFromRecords([
            {id: "a", name: "Production", kind: "production", baseUrl: "https://api.example.com", token: ""},
            {id: "b", name: "", kind: "staging", token: ""},
        ])).toEqual([{id: "a", kind: "production", name: "Production", docsUrl: "https://api.example.com/docs"}]);
    });
});

describe("findEnv", () => {
    const apis = [{id: "r", name: "Shop", addedAt: 0, envs: [
        {id: "d", kind: "local" as const, name: "Development", docsUrl: "http://localhost:8020/docs"},
        {id: "p", kind: "production" as const, name: "Production", docsUrl: "https://api.example.com/docs"},
    ]}];
    it("finds the environment by address, or by server when the docs path differs", () => {
        expect(findEnv(apis, "https://api.example.com/docs")?.env.id).toBe("p");
        expect(findEnv(apis, "https://api.example.com/api/docs")?.env.id).toBe("p");
        expect(findEnv(apis, "http://localhost:8001/docs")).toBeNull();
    });
});

describe("the list of APIs", () => {
    const api = (id: string, kinds: ("local" | "staging" | "production")[] = ["local"]): SavedApi => ({
        id, name: id, addedAt: 0, envs: kinds.map((kind, i) => ({id: `${id}${i}`, kind, name: kind, docsUrl: `http://${id}${i}/docs`})),
    });
    const order = () => apisStore.get().apis.map((a) => a.id);

    it("sums up the environment types", () => {
        expect(envSummary(api("a", ["local", "production", "production"]))).toBe("Dev · Prod ×2");
        expect(envSummary(api("a", ["local"]))).toBe("Dev");
    });

    it("moves an API up and down, and not past the ends", () => {
        apisStore.set({apis: [api("a"), api("b"), api("c")]});
        apisActions.move("c", -1);
        expect(order()).toEqual(["a", "c", "b"]);
        apisActions.move("a", 1);
        expect(order()).toEqual(["c", "a", "b"]);
        apisActions.move("c", -1);
        apisActions.move("b", 1);
        expect(order()).toEqual(["c", "a", "b"]);
    });
});
