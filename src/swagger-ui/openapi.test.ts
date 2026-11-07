import {describe, expect, it} from "vitest";
import {formFields, parseSpec, resolvePointer, sampleFromSchema, typeLabel} from "./openapi";
import {buildRequest, defaultDraft, findTokenInResponse, toCurl} from "./request";

const spec = {
    openapi: "3.1.0",
    info: {title: "Demo", version: "1.0.0"},
    tags: [{name: "Users", description: "User ops"}],
    paths: {
        "/users/{user_id}": {
            parameters: [{name: "user_id", in: "path", required: true, schema: {type: "integer"}}],
            get: {
                tags: ["Users"],
                summary: "Get user",
                operationId: "get_user",
                security: [{HTTPBearer: []}],
                parameters: [{name: "fields", in: "query", schema: {type: "array", items: {type: "string"}}}],
                responses: {"200": {description: "OK", content: {"application/json": {schema: {$ref: "#/components/schemas/User"}}}}},
            },
            put: {
                tags: ["Users"],
                requestBody: {required: true, content: {"application/json": {schema: {$ref: "#/components/schemas/User"}}}},
                responses: {},
            },
        },
        "/upload": {
            post: {
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: ["file"],
                                properties: {file: {type: "string", format: "binary"}, note: {anyOf: [{type: "string"}, {type: "null"}]}},
                            },
                        },
                    },
                },
                responses: {},
            },
        },
    },
    components: {
        securitySchemes: {HTTPBearer: {type: "http", scheme: "bearer"}},
        schemas: {
            User: {
                type: "object",
                required: ["email"],
                properties: {
                    id: {type: "integer", readOnly: true},
                    email: {type: "string", format: "email"},
                    nickname: {anyOf: [{type: "string"}, {type: "null"}]},
                    friends: {type: "array", items: {$ref: "#/components/schemas/User"}},
                },
            },
        },
    },
};

describe("parseSpec", () => {
    const parsed = parseSpec(spec, "http://localhost:8001/openapi.json");

    it("collects operations, groups and servers", () => {
        expect(parsed.operations.map((o) => o.key)).toEqual(["GET /users/{user_id}", "PUT /users/{user_id}", "POST /upload"]);
        expect(parsed.groups.map((g) => [g.tag, g.operations.length])).toEqual([["Users", 2], ["default", 1]]);
        expect(parsed.servers).toEqual(["http://localhost:8001"]);
    });

    it("merges path level parameters and marks security", () => {
        const op = parsed.operations[0];
        expect(op.parameters.map((p) => `${p.in}:${p.name}`)).toEqual(["path:user_id", "query:fields"]);
        expect(op.secured).toBe(true);
        expect(parsed.operations[2].secured).toBe(false);
    });

    it("generates examples without readOnly fields and handles recursion", () => {
        const sample = sampleFromSchema(spec, {$ref: "#/components/schemas/User"}) as Record<string, unknown>;
        expect(sample).toEqual({email: "user@example.com", nickname: "string", friends: [{}]});
    });

    it("labels types", () => {
        expect(typeLabel(spec, {anyOf: [{type: "string"}, {type: "null"}]})).toBe("string | null");
        expect(typeLabel(spec, {type: "array", items: {$ref: "#/components/schemas/User"}})).toBe("User[]");
    });

    it("detects file fields", () => {
        const fields = formFields(spec, parsed.operations[2].requestBody!.content["multipart/form-data"].schema);
        expect(fields.map((f) => [f.name, f.isFile, f.required])).toEqual([["file", true, true], ["note", false, false]]);
    });
});

describe("buildRequest", () => {
    const parsed = parseSpec(spec, "http://localhost:8001/openapi.json");
    const op = parsed.operations[0];

    it("fills path, query arrays and bearer auth", () => {
        const draft = defaultDraft(parsed, op, {user_id: "42"});
        draft.params["query:fields"] = "a, b";
        const req = buildRequest(parsed, op, draft, {baseUrl: "http://localhost:8001/", token: "Bearer abc"});
        expect(req.url).toBe("http://localhost:8001/users/42?fields=a&fields=b");
        expect(req.headers.Authorization).toBe("Bearer abc");
        expect(req.missing).toEqual([]);
        expect(toCurl(req)).toContain("-H 'Authorization: Bearer abc'");
    });

    it("reports missing required values and invalid json", () => {
        const put = parsed.operations[1];
        const req = buildRequest(parsed, put, {params: {}, contentType: "application/json", body: "{oops"}, {baseUrl: "http://x", token: ""});
        expect(req.missing).toEqual(["user_id"]);
        expect(req.jsonError).toBeTruthy();
    });
});

describe("findTokenInResponse", () => {
    it("finds common token fields", () => {
        expect(findTokenInResponse(JSON.stringify({access_token: "eyJhbGciOi.payload.sig", user: {}}))).toBe("eyJhbGciOi.payload.sig");
        expect(findTokenInResponse(JSON.stringify({data: {token: "0123456789abcdefXYZ"}}))).toBe("0123456789abcdefXYZ");
        expect(findTokenInResponse("not json")).toBeNull();
    });
});

describe("hostile documents", () => {
    it("treats a malformed $ref escape as unresolved", () => {
        expect(resolvePointer({components: {}}, "#/components/%E0%A4%A")).toBeUndefined();
        expect(() => parseSpec({openapi: "3.0.0", paths: {"/x": {get: {parameters: [{$ref: "#/%E0"}]}}}}, "http://a.test/openapi.json")).not.toThrow();
    });
    it("stops building an example that would grow exponentially", () => {
        // 12 levels of 10 properties each: 10^12 leaves without a budget
        const schemas: Record<string, unknown> = {L12: {type: "string"}};
        for (let level = 11; level >= 0; level--) {
            schemas[`L${level}`] = {type: "object", properties: Object.fromEntries(Array.from({length: 10}, (_, i) => [`p${i}`, {$ref: `#/components/schemas/L${level + 1}`}]))};
        }
        const started = Date.now();
        const sample = sampleFromSchema({components: {schemas}}, {$ref: "#/components/schemas/L0"});
        expect(Date.now() - started).toBeLessThan(2000);
        expect(Object.keys(sample as object)).toHaveLength(10);
    });
});
