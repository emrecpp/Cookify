import {describe, expect, it} from "vitest";
import {authProblem, decodeJwt, tokenInfo} from "./request";

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.y`;

describe("authProblem", () => {
    it("flags 401 and FastAPI's Not authenticated", () => {
        expect(authProblem(401, '{"detail":"Not authenticated"}')).toBe("Not authenticated");
        expect(authProblem(403, '{"detail":"Not authenticated"}')).toBe("Not authenticated");
        expect(authProblem(401, "")).toBe("401 Unauthorized");
    });
    it("flags auth messages on other codes", () => {
        expect(authProblem(400, '{"detail":"Could not validate credentials"}')).toBe("Could not validate credentials");
    });
    it("ignores unrelated errors and permission denials", () => {
        expect(authProblem(422, '{"detail":[{"msg":"field required"}]}')).toBeNull();
        expect(authProblem(403, '{"detail":"Only admins can do this"}')).toBeNull();
        expect(authProblem(200, '{"ok":true}')).toBeNull();
    });
});

describe("tokenInfo", () => {
    it("reads identity and expiry from a JWT", () => {
        const now = Math.floor(Date.now() / 1000);
        expect(tokenInfo(jwt({email: "a@b.c", exp: now + 3600}))).toMatchObject({name: "a@b.c", state: "ok"});
        expect(tokenInfo(jwt({sub: 15, exp: now + 60})).state).toBe("expiring");
        expect(tokenInfo(jwt({sub: 15, exp: now - 60})).state).toBe("expired");
        expect(tokenInfo(jwt({user: {id: 1, email: "n@e.st"}})).name).toBe("n@e.st");
        expect(tokenInfo("opaque", "Prod")).toMatchObject({name: "Prod", state: "unknown"});
    });
});

import {validationIssues} from "./request";

describe("validationIssues", () => {
    it("reads FastAPI detail lists", () => {
        const body = JSON.stringify({detail: [{loc: ["body", "email"], msg: "Field required", type: "missing"}, {loc: ["query", "limit"], msg: "bad"}]});
        expect(validationIssues(422, body)).toEqual([{loc: ["body", "email"], msg: "Field required"}, {loc: ["query", "limit"], msg: "bad"}]);
    });
    it("reads pydantic errors wrapped in a Python repr string", () => {
        const body = JSON.stringify({
            status_code: 422,
            message: "[{'type': 'missing', 'loc': ('body', 'email'), 'msg': 'Field required', 'input': {}}, {'type': 'x', 'loc': ('body', 'items', 0, 'id'), 'msg': \"Input should be a valid integer\"}]",
        });
        expect(validationIssues(422, body)).toEqual([
            {loc: ["body", "email"], msg: "Field required"},
            {loc: ["body", "items", 0, "id"], msg: "Input should be a valid integer"},
        ]);
    });
    it("ignores other statuses", () => {
        expect(validationIssues(500, '{"detail":[{"loc":["body"],"msg":"x"}]}')).toEqual([]);
    });
});

import {removedFields} from "./request";

describe("removedFields", () => {
    const example = JSON.stringify({identity_number: "string", tax_number: "string", phone: "string"});

    it("lists the fields taken out of the default body", () => {
        expect(removedFields(JSON.stringify({identity_number: "string"}), example)).toEqual(["tax_number", "phone"]);
    });

    it("ignores changed values and added fields", () => {
        const body = JSON.stringify({identity_number: "123", tax_number: "456", phone: "789", note: "extra"});
        expect(removedFields(body, example)).toEqual([]);
    });

    it("reaches nested objects and array items", () => {
        const nested = JSON.stringify({items: [{id: 1, quantity: 2}], address: {city: "x", country: "y"}});
        const body = JSON.stringify({items: [{id: 1}], address: {city: "x"}});
        expect(removedFields(body, nested)).toEqual(["items[].quantity", "address.country"]);
    });

    it("names a removed object once", () => {
        expect(removedFields("{}", JSON.stringify({address: {city: "x"}}))).toEqual(["address"]);
    });

    it("counts an empty body as removing everything", () => {
        expect(removedFields("  ", example)).toEqual(["identity_number", "tax_number", "phone"]);
    });

    it("stays quiet while the JSON is broken or there is no default", () => {
        expect(removedFields('{"identity_number": ', example)).toEqual([]);
        expect(removedFields("{}", "")).toEqual([]);
    });
});

describe("decodeJwt", () => {
    const utf8Jwt = (payload: object) => {
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        return `x.${btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.y`;
    };
    it("reads UTF-8 claims and base64url", () => {
        expect(decodeJwt(utf8Jwt({name: "Çağrı Öztürk", n: "~~~???"}))).toEqual({name: "Çağrı Öztürk", n: "~~~???"});
        expect(decodeJwt(`Bearer ${utf8Jwt({sub: "1"})}`)?.sub).toBe("1");
    });
    it("is null for anything that is not a JWT with an object payload", () => {
        expect(decodeJwt("abc")).toBeNull();
        expect(decodeJwt("x.%%%.y")).toBeNull();
        expect(decodeJwt(`x.${btoa("[1,2]")}.y`)).toBeNull();
        expect(decodeJwt(`x.${btoa("ÿþ")}.y`)).toBeNull();
    });
});
