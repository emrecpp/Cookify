import {describe, expect, it} from "vitest";
import {documentedResponse, enumChoices, fieldHint, formFields, parseSpec, rawSchemaAtPath, resolvePointer, sampleFromSchema, schemaAtPath, schemaHasHints, schemaLookups, typeLabel, valueProblem} from "./openapi";
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

describe("enum choices in a body", () => {
    const spec = {
        components: {
            schemas: {
                Kind: {type: "string", enum: ["ERROR_REPORT", "SUGGESTION"]},
                Item: {type: "object", properties: {level: {type: "integer", enum: [1, 2, 3]}}},
                Body: {
                    type: "object",
                    properties: {
                        type: {$ref: "#/components/schemas/Kind"},
                        maybe: {anyOf: [{$ref: "#/components/schemas/Kind"}, {type: "null"}]},
                        items: {type: "array", items: {$ref: "#/components/schemas/Item"}},
                        tags: {type: "array", items: {type: "string", enum: ["a", "b"]}},
                        subject: {type: "string"},
                    },
                },
            },
        },
    };
    const body = {$ref: "#/components/schemas/Body"};
    const at = (path: (string | number)[]) => enumChoices(spec, schemaAtPath(spec, body, path));
    it("lists the values of an enum property", () => {
        expect(at(["type"])).toEqual(["ERROR_REPORT", "SUGGESTION"]);
    });
    it("adds null for a nullable enum", () => {
        expect(at(["maybe"])).toEqual(["ERROR_REPORT", "SUGGESTION", null]);
    });
    it("follows arrays and nested objects", () => {
        expect(at(["items", 0, "level"])).toEqual([1, 2, 3]);
        expect(at(["tags", 3])).toEqual(["a", "b"]);
    });
    it("returns null for free values and unknown paths", () => {
        expect(at(["subject"])).toBeNull();
        expect(at(["tags"])).toBeNull();
        expect(at(["missing"])).toBeNull();
    });
});

describe("type hints above body fields", () => {
    const spec = {
        components: {
            schemas: {
                FeedbackType: {type: "string", enum: ["ERROR_REPORT", "FEATURE_REQUEST", "OTHER"]},
                Body: {
                    type: "object",
                    properties: {
                        id: {anyOf: [{type: "string", format: "uuid"}, {type: "null"}]},
                        type: {$ref: "#/components/schemas/FeedbackType"},
                        kinds: {type: "array", items: {$ref: "#/components/schemas/FeedbackType"}},
                        when: {type: "string", format: "date-time"},
                        subject: {type: "string"},
                        count: {type: "integer", format: "int64"},
                        many: {type: "string", enum: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]},
                    },
                },
            },
        },
    };
    const body = {$ref: "#/components/schemas/Body"};
    const hint = (key: string) => fieldHint(spec, rawSchemaAtPath(spec, body, [key]));
    it("names enums and lists their values", () => {
        expect(hint("type")).toEqual({type: "FeedbackType", values: "ERROR_REPORT | FEATURE_REQUEST | OTHER"});
        expect(hint("kinds")).toEqual({type: "FeedbackType[]", values: "ERROR_REPORT | FEATURE_REQUEST | OTHER"});
        expect(hint("many")?.values).toBe("a | b | c | d | e | f | g | h | … 2 more");
    });
    it("shows string formats, nullable too", () => {
        expect(hint("id")).toEqual({type: "string<uuid> | null"});
        expect(hint("when")).toEqual({type: "string<date-time>"});
    });
    it("leaves plain types alone", () => {
        expect(hint("subject")).toBeNull();
        expect(hint("count")).toBeNull();
        expect(hint("missing")).toBeNull();
    });
});

describe("documented responses", () => {
    const responses = [{status: "200"}, {status: "4XX"}, {status: "default"}];
    it("picks the exact code, then its range, then default", () => {
        expect(documentedResponse(responses, 200)?.status).toBe("200");
        expect(documentedResponse(responses, 422)?.status).toBe("4XX");
        expect(documentedResponse(responses, 503)?.status).toBe("default");
        expect(documentedResponse(responses, 0)).toBeUndefined();   // no response at all (network error)
    });
    it("looks up the fields of a schema once", () => {
        const spec = {components: {schemas: {Kind: {type: "string", enum: ["A", "B"]}}}};
        const lookups = schemaLookups(spec, {type: "object", properties: {kind: {$ref: "#/components/schemas/Kind"}}})!;
        expect(lookups.choices(["kind"])).toEqual(["A", "B"]);
        expect(lookups.hint(["kind"])).toEqual({type: "Kind", values: "A | B"});
        expect(lookups.hint(["kind"])).toBe(lookups.hint(["kind"]));
        expect(schemaLookups(spec, undefined)).toBeUndefined();
    });
});

describe("schemas with field types", () => {
    const spec = {components: {schemas: {Kind: {type: "string", enum: ["A"]}, Node: {type: "object", properties: {child: {$ref: "#/components/schemas/Node"}, name: {type: "string"}}}}}};
    it("finds hinted fields, nested in objects and arrays too", () => {
        expect(schemaHasHints(spec, {type: "object", properties: {kind: {$ref: "#/components/schemas/Kind"}}})).toBe(true);
        expect(schemaHasHints(spec, {type: "array", items: {type: "object", properties: {at: {type: "string", format: "date-time"}}}})).toBe(true);
        expect(schemaHasHints(spec, {type: "object", properties: {inner: {type: "object", properties: {id: {type: "string", format: "uuid"}}}}})).toBe(true);
    });
    it("says no for plain fields and survives recursive schemas", () => {
        expect(schemaHasHints(spec, {type: "object", properties: {name: {type: "string"}, n: {type: "integer"}}})).toBe(false);
        expect(schemaHasHints(spec, {$ref: "#/components/schemas/Node"})).toBe(false);
    });
});

describe("values that do not fit their schema", () => {
    const spec = {components: {schemas: {Kind: {type: "string", enum: ["A", "B"]}}}};
    const nullableString = {anyOf: [{type: "string"}, {type: "null"}]};
    it("names the expected and the given type", () => {
        expect(valueProblem(spec, nullableString, 4)).toBe("expected string, got integer");
        expect(valueProblem(spec, nullableString, null)).toBeNull();
        expect(valueProblem(spec, {type: "string"}, null)).toBe("null not allowed");
        expect(valueProblem(spec, {type: "integer"}, 1.5)).toBe("expected integer, got number");
        expect(valueProblem(spec, {type: "number"}, 2)).toBeNull();
        expect(valueProblem(spec, {type: "array", items: {}}, {})).toBe("expected array, got object");
    });
    it("checks enums and formats", () => {
        expect(valueProblem(spec, {$ref: "#/components/schemas/Kind"}, "C")).toBe("not an allowed value");
        expect(valueProblem(spec, {$ref: "#/components/schemas/Kind"}, null)).toBe("null not allowed");
        expect(valueProblem(spec, {type: "string", format: "uuid"}, "3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBeNull();
        expect(valueProblem(spec, {type: "string", format: "uuid"}, "string")).toBe("not a valid uuid");
        expect(valueProblem(spec, {type: "string", format: "date-time"}, "2026-11-10T12:00:00Z")).toBeNull();
    });
    it("leaves unknown fields and free schemas alone", () => {
        expect(valueProblem(spec, undefined, 4)).toBeNull();
        expect(valueProblem(spec, {}, 4)).toBeNull();
        expect(valueProblem(spec, {anyOf: [{type: "string"}, {}]}, 4)).toBeNull();
    });
});
