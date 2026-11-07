// OpenAPI (3.x and Swagger 2.0) parsing helpers used by the Cookify Swagger UI.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Schema = Record<string, any>;

export const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
export type ParamLocation = "path" | "query" | "header" | "cookie";

export interface Parameter {
    name: string;
    in: ParamLocation;
    required: boolean;
    description?: string;
    schema: Schema;
    deprecated: boolean;
    example?: unknown;
}

export interface MediaInfo {
    schema?: Schema;
    example?: unknown;
}

export interface RequestBodyInfo {
    required: boolean;
    description?: string;
    content: Record<string, MediaInfo>;
    contentTypes: string[];
}

export interface ResponseInfo {
    status: string;
    description?: string;
    contentType?: string;
    schema?: Schema;
    example?: unknown;
}

export interface Operation {
    key: string;
    method: HttpMethod;
    path: string;
    tags: string[];
    summary: string;
    description?: string;
    operationId?: string;
    deprecated: boolean;
    parameters: Parameter[];
    requestBody?: RequestBodyInfo;
    responses: ResponseInfo[];
    secured: boolean;
    securitySchemes: string[];
    searchText: string;
}

export interface OperationGroup {
    tag: string;
    description?: string;
    operations: Operation[];
}

export interface ParsedSpec {
    raw: Schema;
    title: string;
    version: string;
    description?: string;
    operations: Operation[];
    groups: OperationGroup[];
    securitySchemes: Record<string, Schema>;
    servers: string[];
}

// ---------------------------------------------------------------------------
// $ref handling

export function resolvePointer(spec: Schema, ref: string): Schema | undefined {
    if (!ref.startsWith("#/")) return undefined;
    let current: unknown = spec;
    for (const rawPart of ref.slice(2).split("/")) {
        let part: string;
        try {
            part = decodeURIComponent(rawPart).replace(/~1/g, "/").replace(/~0/g, "~");
        } catch {
            return undefined; // malformed escape: an unresolved $ref, not a broken document
        }
        if (!current || typeof current !== "object") return undefined;
        current = (current as Schema)[part];
    }
    return current as Schema | undefined;
}

export function deref(spec: Schema, obj: unknown): Schema | undefined {
    let current = obj as Schema | undefined;
    for (let hops = 0; hops < 32 && current && typeof current === "object" && typeof current.$ref === "string"; hops++) {
        const target = resolvePointer(spec, current.$ref);
        if (!target) return current;
        // OpenAPI 3.1 allows siblings next to $ref (e.g. description); keep them.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {$ref, ...rest} = current;
        current = Object.keys(rest).length ? {...target, ...rest} : target;
    }
    return current;
}

export const refName = (ref: string) => ref.split("/").pop() || ref;

function isNullSchema(spec: Schema, schema: unknown): boolean {
    const resolved = deref(spec, schema);
    return resolved?.type === "null";
}

export function schemaTypes(schema?: Schema): string[] {
    if (!schema) return [];
    if (Array.isArray(schema.type)) return schema.type;
    if (typeof schema.type === "string") return [schema.type];
    if (schema.properties || schema.additionalProperties) return ["object"];
    if (schema.items) return ["array"];
    if (schema.allOf) return ["object"];
    return [];
}

export function primaryType(schema?: Schema): string | undefined {
    return schemaTypes(schema).find((t) => t !== "null");
}

/** Resolves $ref and strips a nullable anyOf/oneOf wrapper (`T | null`). */
export function unwrapNullable(spec: Schema, schema: unknown): Schema | undefined {
    let current = deref(spec, schema);
    for (let i = 0; i < 4 && current; i++) {
        const variants = (current.anyOf ?? current.oneOf) as Schema[] | undefined;
        if (!variants || current.properties) break;
        const nonNull = variants.filter((v) => !isNullSchema(spec, v));
        if (nonNull.length !== 1) break;
        const {anyOf: _a, oneOf: _o, ...rest} = current; // eslint-disable-line @typescript-eslint/no-unused-vars
        const inner = deref(spec, nonNull[0]);
        current = {...rest, ...inner};
    }
    return current;
}

/** Collects properties of an object schema, merging allOf parts. */
export function collectObject(spec: Schema, schema: unknown): { properties: Record<string, Schema>; required: string[] } {
    const out = {properties: {} as Record<string, Schema>, required: [] as string[]};
    const seen = new Set<string>();
    const visit = (s: unknown) => {
        if (!s || typeof s !== "object") return;
        const node = s as Schema;
        if (typeof node.$ref === "string") {
            if (seen.has(node.$ref)) return;
            seen.add(node.$ref);
            visit(resolvePointer(spec, node.$ref));
            return;
        }
        if (Array.isArray(node.allOf)) node.allOf.forEach(visit);
        if (node.properties && typeof node.properties === "object") Object.assign(out.properties, node.properties);
        if (Array.isArray(node.required)) out.required.push(...node.required);
    };
    visit(unwrapNullable(spec, schema) ?? schema);
    return out;
}

export function typeLabel(spec: Schema, schema: unknown, depth = 0): string {
    const s = schema as Schema | undefined;
    if (!s || typeof s !== "object") return "any";
    if (depth > 6) return "…";
    if (typeof s.$ref === "string") return refName(s.$ref);
    const variants = (s.anyOf ?? s.oneOf) as Schema[] | undefined;
    if (variants) {
        const nonNull = variants.filter((v) => !isNullSchema(spec, v));
        const label = nonNull.map((v) => typeLabel(spec, v, depth + 1)).join(" | ") || "null";
        return nonNull.length < variants.length ? `${label} | null` : label;
    }
    if (Array.isArray(s.allOf)) {
        return s.allOf.length === 1 ? typeLabel(spec, s.allOf[0], depth + 1) : s.allOf.map((v: Schema) => typeLabel(spec, v, depth + 1)).join(" & ");
    }
    const types = schemaTypes(s);
    const nullable = Boolean(s.nullable) || types.includes("null");
    const type = types.find((t) => t !== "null");
    let label: string;
    if (type === "array") label = `${typeLabel(spec, s.items, depth + 1)}[]`;
    else if (Array.isArray(s.enum)) label = `enum`;
    else if (type) label = s.format ? `${type}<${s.format}>` : type;
    else label = "any";
    return nullable ? `${label} | null` : label;
}

// ---------------------------------------------------------------------------
// Example generation

const SAMPLE_UUID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

function sampleString(schema: Schema): string {
    switch (schema.format) {
        case "date-time":
            return new Date().toISOString();
        case "date":
            return new Date().toISOString().slice(0, 10);
        case "time":
            return "12:00:00";
        case "email":
            return "user@example.com";
        case "uuid":
            return SAMPLE_UUID;
        case "uri":
        case "url":
            return "https://example.com";
        case "ipv4":
            return "127.0.0.1";
        case "binary":
        case "byte":
            return "";
        default:
            return "string";
    }
}

/**
 * Most schema nodes one example may visit. Wide schemas nested in each other grow the example exponentially
 * (10 properties × 10 levels), which would freeze the page; past the budget the rest is left empty.
 */
const SAMPLE_BUDGET = 20_000;

export function sampleFromSchema(spec: Schema, schema: unknown): unknown {
    return sample(spec, schema, 0, [], {left: SAMPLE_BUDGET});
}

function sample(spec: Schema, schema: unknown, depth: number, seen: string[], budget: { left: number }): unknown {
    const s = schema as Schema | undefined;
    if (!s || typeof s !== "object" || depth > 12 || --budget.left < 0) return null;
    if (typeof s.$ref === "string") {
        if (seen.includes(s.$ref)) return primaryType(resolvePointer(spec, s.$ref)) === "array" ? [] : {};
        return sample(spec, deref(spec, s), depth + 1, [...seen, s.$ref], budget);
    }
    if (s.example !== undefined) return s.example;
    if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
    if (s.default !== undefined) return s.default;
    if (s.const !== undefined) return s.const;
    if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];

    const variants = (s.anyOf ?? s.oneOf) as Schema[] | undefined;
    if (variants && !s.properties) {
        const pick = variants.find((v) => !isNullSchema(spec, v)) ?? variants[0];
        return sample(spec, pick, depth + 1, seen, budget);
    }

    const type = primaryType(s) ?? (s.allOf ? "object" : undefined);
    switch (type) {
        case "object": {
            const {properties} = collectObject(spec, s);
            const out: Record<string, unknown> = {};
            for (const [name, prop] of Object.entries(properties)) {
                const resolved = deref(spec, prop);
                if (resolved?.readOnly) continue;
                out[name] = sample(spec, prop, depth + 1, seen, budget);
            }
            return out;
        }
        case "array":
            return s.items ? [sample(spec, s.items, depth + 1, seen, budget)] : [];
        case "string":
            return sampleString(s);
        case "integer":
        case "number":
            return typeof s.minimum === "number" ? s.minimum : 0;
        case "boolean":
            return true;
        case "null":
            return null;
        default:
            return s.allOf || s.properties ? {} : null;
    }
}

export function mediaExample(spec: Schema, media?: MediaInfo): unknown {
    if (!media) return undefined;
    if (media.example !== undefined) return media.example;
    return sampleFromSchema(spec, media.schema);
}

export const isJsonType = (contentType?: string) => !!contentType && /json/i.test(contentType);
export const isFormType = (contentType?: string) => !!contentType && /multipart\/form-data|x-www-form-urlencoded/i.test(contentType);

export interface FormField {
    name: string;
    schema: Schema;
    required: boolean;
    isFile: boolean;
    multiple: boolean;
    description?: string;
}

export function formFields(spec: Schema, schema: unknown): FormField[] {
    const {properties, required} = collectObject(spec, schema);
    return Object.entries(properties).map(([name, prop]) => {
        const resolved = unwrapNullable(spec, prop) ?? {};
        const multiple = primaryType(resolved) === "array";
        const inner = (multiple ? unwrapNullable(spec, resolved.items) : resolved) ?? {};
        const isFile = inner.format === "binary" || inner.type === "file" || inner.contentMediaType === "application/octet-stream";
        return {name, schema: resolved, required: required.includes(name), isFile, multiple, description: resolved.description};
    });
}

// ---------------------------------------------------------------------------
// Spec parsing

function firstExampleValue(examples: unknown): unknown {
    if (!examples || typeof examples !== "object") return undefined;
    const first = Object.values(examples as Record<string, Schema>)[0];
    return first && typeof first === "object" && "value" in first ? first.value : undefined;
}

function toMedia(spec: Schema, raw: Schema | undefined): MediaInfo {
    const media = deref(spec, raw) ?? {};
    const example = media.example !== undefined ? media.example : firstExampleValue(media.examples);
    return {schema: media.schema, example};
}

function mergeRawParams(spec: Schema, ...lists: unknown[]): Schema[] {
    const map = new Map<string, Schema>();
    for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            const param = deref(spec, item);
            if (!param?.name || !param.in) continue;
            map.set(`${param.in}:${param.name}`, param);
        }
    }
    return [...map.values()];
}

function toParameter(raw: Schema): Parameter | null {
    if (!["path", "query", "header", "cookie"].includes(raw.in)) return null;
    let schema: Schema | undefined = raw.schema;
    if (!schema && raw.type) {
        schema = {type: raw.type, format: raw.format, items: raw.items, enum: raw.enum, default: raw.default};
    }
    if (!schema && raw.content) {
        schema = (Object.values(raw.content)[0] as Schema | undefined)?.schema;
    }
    return {
        name: String(raw.name),
        in: raw.in,
        required: raw.in === "path" ? true : Boolean(raw.required),
        description: raw.description,
        schema: schema ?? {},
        deprecated: Boolean(raw.deprecated),
        example: raw.example !== undefined ? raw.example : firstExampleValue(raw.examples),
    };
}

function v3RequestBody(spec: Schema, raw: unknown): RequestBodyInfo | undefined {
    const body = deref(spec, raw);
    if (!body?.content || typeof body.content !== "object") return undefined;
    const content: Record<string, MediaInfo> = {};
    for (const [type, media] of Object.entries(body.content)) content[type] = toMedia(spec, media as Schema);
    const contentTypes = Object.keys(content).sort((a, b) => Number(isJsonType(b)) - Number(isJsonType(a)));
    if (!contentTypes.length) return undefined;
    return {required: Boolean(body.required), description: body.description, content, contentTypes};
}

function v2RequestBody(spec: Schema, op: Schema, params: Schema[]): RequestBodyInfo | undefined {
    const bodyParam = params.find((p) => p.in === "body");
    if (bodyParam) {
        const consumes: string[] = op.consumes ?? spec.consumes ?? ["application/json"];
        const type = consumes.find(isJsonType) ?? consumes[0] ?? "application/json";
        return {
            required: Boolean(bodyParam.required),
            description: bodyParam.description,
            content: {[type]: {schema: bodyParam.schema}},
            contentTypes: [type],
        };
    }
    const formParams = params.filter((p) => p.in === "formData");
    if (!formParams.length) return undefined;
    const hasFile = formParams.some((p) => p.type === "file");
    const type = hasFile ? "multipart/form-data" : "application/x-www-form-urlencoded";
    const schema: Schema = {type: "object", properties: {}, required: formParams.filter((p) => p.required).map((p) => p.name)};
    for (const p of formParams) {
        schema.properties[p.name] = p.type === "file"
            ? {type: "string", format: "binary", description: p.description}
            : {type: p.type, format: p.format, items: p.items, enum: p.enum, default: p.default, description: p.description};
    }
    return {required: formParams.some((p) => p.required), content: {[type]: {schema}}, contentTypes: [type]};
}

function parseResponses(spec: Schema, raw: unknown): ResponseInfo[] {
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw as Record<string, unknown>).map(([status, value]) => {
        const response = deref(spec, value) ?? {};
        const content: Record<string, Schema> = response.content ?? (response.schema ? {"application/json": {schema: response.schema}} : {});
        const contentType = Object.keys(content).sort((a, b) => Number(isJsonType(b)) - Number(isJsonType(a)))[0];
        const media = contentType ? toMedia(spec, content[contentType]) : undefined;
        return {status, description: response.description, contentType, schema: media?.schema, example: media?.example};
    });
}

function resolveServers(raw: Schema, specUrl: string): string[] {
    const base = (() => {
        try {
            return new URL(specUrl);
        } catch {
            return new URL(location.href);
        }
    })();
    const out: string[] = [];
    const push = (value: string) => {
        try {
            const url = new URL(value, base).href.replace(/\/+$/, "");
            if (!out.includes(url)) out.push(url);
        } catch {
            // ignore invalid server urls
        }
    };
    if (Array.isArray(raw.servers)) {
        for (const server of raw.servers) {
            if (!server?.url) continue;
            let url: string = server.url;
            for (const [name, variable] of Object.entries<Schema>(server.variables ?? {})) {
                url = url.replace(`{${name}}`, String(variable?.default ?? ""));
            }
            push(url);
        }
    } else if (raw.swagger) {
        const scheme = Array.isArray(raw.schemes) && raw.schemes.length ? raw.schemes[0] : base.protocol.replace(":", "");
        push(`${scheme}://${raw.host ?? base.host}${raw.basePath ?? ""}`);
    }
    if (!out.length) push(base.origin);
    return out;
}

export function parseSpec(raw: Schema, specUrl: string): ParsedSpec {
    const isV2 = typeof raw.swagger === "string";
    const operations: Operation[] = [];

    for (const [path, rawItem] of Object.entries(raw.paths ?? {})) {
        const item = deref(raw, rawItem);
        if (!item || typeof item !== "object") continue;
        for (const method of HTTP_METHODS) {
            const op = item[method] as Schema | undefined;
            if (!op || typeof op !== "object") continue;
            const rawParams = mergeRawParams(raw, item.parameters, op.parameters);
            const parameters = rawParams.map(toParameter).filter((p): p is Parameter => p !== null);
            const requestBody = isV2 ? v2RequestBody(raw, op, rawParams) : v3RequestBody(raw, op.requestBody);
            const security = op.security ?? raw.security;
            const securitySchemes: string[] = Array.isArray(security)
                ? [...new Set(security.flatMap((req: Schema) => Object.keys(req ?? {})))]
                : [];
            const tags: string[] = Array.isArray(op.tags) && op.tags.length ? op.tags.map(String) : ["default"];
            const summary = String(op.summary ?? "");
            operations.push({
                key: `${method.toUpperCase()} ${path}`,
                method,
                path,
                tags,
                summary,
                description: op.description,
                operationId: op.operationId,
                deprecated: Boolean(op.deprecated),
                parameters,
                requestBody,
                responses: parseResponses(raw, op.responses),
                secured: securitySchemes.length > 0,
                securitySchemes,
                searchText: [method, path, summary, op.operationId, tags.join(" "), String(op.description ?? "").slice(0, 300)]
                    .join(" ")
                    .toLowerCase(),
            });
        }
    }

    const tagMeta: Schema[] = Array.isArray(raw.tags) ? raw.tags : [];
    const groupsByTag = new Map<string, Operation[]>(tagMeta.map((t) => [String(t.name), []]));
    for (const op of operations) {
        for (const tag of op.tags) {
            if (!groupsByTag.has(tag)) groupsByTag.set(tag, []);
            groupsByTag.get(tag)!.push(op);
        }
    }
    const descriptions = new Map(tagMeta.map((t) => [String(t.name), t.description as string | undefined]));
    const groups = [...groupsByTag.entries()]
        .filter(([, ops]) => ops.length > 0)
        .map(([tag, ops]) => ({tag, description: descriptions.get(tag), operations: ops}));

    return {
        raw,
        title: String(raw.info?.title ?? "API"),
        version: String(raw.info?.version ?? ""),
        description: raw.info?.description,
        operations,
        groups,
        securitySchemes: (raw.components?.securitySchemes ?? raw.securityDefinitions ?? {}) as Record<string, Schema>,
        servers: resolveServers(raw, specUrl),
    };
}

export function isValidSpec(raw: unknown): raw is Schema {
    return !!raw && typeof raw === "object" && typeof (raw as Schema).paths === "object"
        && (typeof (raw as Schema).openapi === "string" || typeof (raw as Schema).swagger === "string");
}
