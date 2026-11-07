import {afterEach, describe, expect, it, vi} from "vitest";
import {checkProxyRequest, runProxyRequest, toFormParts} from "./proxy";

const respond = (body: BodyInit, type?: string, status = 200) =>
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, {status, headers: type ? {"content-type": type} : {}}));

afterEach(() => vi.restoreAllMocks());

describe("background proxy", () => {
    it("only takes well formed http(s) requests", () => {
        expect(checkProxyRequest({method: "GET", url: "file:///etc/passwd"})).toBe("Only http and https addresses are allowed");
        expect(checkProxyRequest({method: "GET", url: "chrome-extension://abc/index.html"})).toBe("Only http and https addresses are allowed");
        expect(checkProxyRequest({method: "GET", url: "not a url"})).toBe("Only http and https addresses are allowed");
        expect(checkProxyRequest({url: "https://a.test"})).toBe("Invalid request");
        expect(checkProxyRequest(null)).toBe("Invalid request");
        expect(checkProxyRequest({method: "POST", url: "https://a.test", body: {x: 1}})).toBe("Invalid request body");
        expect(checkProxyRequest({method: "GET", url: "https://a.test", headers: {a: 1}})).toBe("Invalid request headers");
        expect(checkProxyRequest({method: "GET", url: "https://a.test/x", headers: {a: "b"}})).toMatchObject({url: "https://a.test/x"});
    });

    it("refuses without sending anything", async () => {
        const fetch = vi.spyOn(globalThis, "fetch");
        const res = await runProxyRequest({method: "GET", url: "javascript:alert(1)"});
        expect(res).toMatchObject({ok: false, status: 0, error: "Only http and https addresses are allowed"});
        expect(fetch).not.toHaveBeenCalled();
    });

    it("hands text over as text and other content as base64", async () => {
        respond('{"a":1}', "application/json");
        expect(await runProxyRequest({method: "GET", url: "https://a.test"})).toMatchObject({ok: true, status: 200, bodyText: '{"a":1}'});
        respond(new Uint8Array([0, 1, 2, 255]), "application/octet-stream");
        const binary = await runProxyRequest({method: "GET", url: "https://a.test"});
        expect(binary.base64).toBe(btoa(String.fromCharCode(0, 1, 2, 255)));
        expect(binary.bodyText).toBeUndefined();
    });

    it("keeps the status of a response too large to hand over", async () => {
        respond("x".repeat(2000), "text/plain", 201);
        const res = await runProxyRequest({method: "GET", url: "https://a.test"}, undefined, 1000);
        expect(res).toMatchObject({ok: false, status: 201});
        expect(res.error).toMatch(/larger than/);
        expect(res.bodyText).toBeUndefined();
    });

    it("sends no body with GET and reports network errors", async () => {
        const fetch = respond("", "text/plain");
        await runProxyRequest({method: "GET", url: "https://a.test", body: "ignored", credentials: "omit"});
        expect(fetch.mock.calls[0][1]).toMatchObject({body: undefined, credentials: "omit"});
        fetch.mockRejectedValue(new TypeError("Failed to fetch"));
        expect(await runProxyRequest({method: "POST", url: "https://a.test", body: "x"})).toMatchObject({status: 0, error: "Failed to fetch"});
    });

    it("stops when the port closes", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }));
        const controller = new AbortController();
        const pending = runProxyRequest({method: "GET", url: "https://a.test"}, controller.signal);
        controller.abort();
        expect(await pending).toMatchObject({status: 0, error: "aborted"});
    });

    it("sends multipart form data with files", async () => {
        const data = new FormData();
        data.append("title", "report");
        data.append("file", new File([new Uint8Array([0, 1, 255])], "a.bin", {type: "application/octet-stream"}));
        const form = await toFormParts(data);
        expect(form).toEqual([
            {name: "title", value: "report"},
            {name: "file", file: {name: "a.bin", type: "application/octet-stream", base64: btoa(String.fromCharCode(0, 1, 255))}},
        ]);
        const fetch = respond("ok", "text/plain");
        await runProxyRequest({method: "POST", url: "https://a.test/upload", form});
        const sent = fetch.mock.calls[0][1]?.body as FormData;
        expect(sent).toBeInstanceOf(FormData);
        expect(sent.get("title")).toBe("report");
        const file = sent.get("file") as File;
        expect(file.name).toBe("a.bin");
        expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([0, 1, 255]);
    });

    it("leaves files too large to hand over to the page, and refuses malformed form data", async () => {
        const data = new FormData();
        data.append("file", new File(["x".repeat(2000)], "big.txt"));
        expect(await toFormParts(data, 1000)).toBeNull();
        expect(checkProxyRequest({method: "POST", url: "https://a.test", form: [{name: "f", file: {name: "a"}}]})).toBe("Invalid form data");
        expect(checkProxyRequest({method: "POST", url: "https://a.test", form: [{name: "a", value: "b"}], body: "x"})).toBe("Invalid form data");
        expect(checkProxyRequest({method: "POST", url: "https://a.test", form: "a=b"})).toBe("Invalid form data");
    });
});
