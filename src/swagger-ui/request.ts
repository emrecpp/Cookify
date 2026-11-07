import {
    formFields,
    isFormType,
    isJsonType,
    mediaExample,
    Operation,
    ParsedSpec,
    primaryType,
    Schema,
    unwrapNullable,
} from "./openapi";
import {fromBase64, proxyFetch, ProxyRequest, TEXTUAL_TYPE, toFormParts} from "@/lib/proxy";
import {isObject} from "@/lib/values";
import {Draft, SentResponse} from "./state";

// ---------------------------------------------------------------------------
// Drafts

export function stringifyValue(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(stringifyValue).join(",");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

export function exampleBody(spec: ParsedSpec, op: Operation, contentType?: string): string {
    const media = contentType ? op.requestBody?.content[contentType] : undefined;
    if (!media || !isJsonType(contentType)) return "";
    const example = mediaExample(spec.raw, media);
    return example === undefined ? "" : JSON.stringify(example, null, 2);
}

/** Whether a remembered value can be reused for a parameter of this type (e.g. no text in integer fields). */
function fitsType(spec: ParsedSpec, schema: Schema | undefined, value: string): boolean {
    const type = primaryType(unwrapNullable(spec.raw, schema));
    if (type === "integer") return /^-?\d+$/.test(value);
    if (type === "number") return /^-?\d+(\.\d+)?$/.test(value);
    if (type === "boolean") return value === "true" || value === "false";
    return true;
}

/**
 * Fields of the default body that this body no longer has, as paths ("address.city", "items[].quantity").
 * Changed values don't count, and neither does a body that isn't valid JSON while it is being typed.
 */
export function removedFields(body: string, example: string): string[] {
    let from: unknown;
    let to: unknown;
    try {
        from = JSON.parse(example);
        to = body.trim() ? JSON.parse(body) : {};
    } catch {
        return [];
    }
    const removed: string[] = [];
    const walk = (a: unknown, b: unknown, path: string) => {
        if (Array.isArray(a) && Array.isArray(b) && a.length && b.length) walk(a[0], b[0], `${path}[]`);
        if (!isObject(a) || !isObject(b)) return;
        for (const key of Object.keys(a)) {
            const field = path ? `${path}.${key}` : key;
            if (key in b) walk(a[key], b[key], field);
            else removed.push(field);
        }
    };
    walk(from, to, "");
    return removed;
}

export function defaultDraft(spec: ParsedSpec, op: Operation, memory: Record<string, string>): Draft {
    const params: Record<string, string> = {};
    for (const param of op.parameters) {
        if (!param.required) continue;
        const fallback = param.example ?? param.schema?.example ?? param.schema?.default;
        const remembered = memory[param.name];
        params[`${param.in}:${param.name}`] = remembered !== undefined && fitsType(spec, param.schema, remembered)
            ? remembered
            : stringifyValue(fallback);
    }
    const contentType = op.requestBody?.contentTypes[0];
    return {params, contentType, body: exampleBody(spec, op, contentType), form: {}, headers: []};
}

// ---------------------------------------------------------------------------
// Request building

export interface BuiltRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string | FormData | URLSearchParams;
    /** Human readable form fields for cURL. */
    formEntries?: [string, string | File][];
    missing: string[];
    jsonError?: string;
}

function stripBearer(token: string) {
    return token.replace(/^bearer\s+/i, "");
}

function applyAuth(spec: ParsedSpec, op: Operation, token: string, headers: Record<string, string>, query: URLSearchParams) {
    if (!token) return;
    const schemeNames = Object.keys(spec.securitySchemes);
    if (schemeNames.length && !op.secured) return;
    const name = op.securitySchemes.find((n) => spec.securitySchemes[n]) ?? op.securitySchemes[0];
    const scheme = name ? spec.securitySchemes[name] : undefined;
    const type = String(scheme?.type ?? "").toLowerCase();
    if (type === "apikey") {
        if (scheme?.in === "query") query.set(scheme.name, token);
        else if (scheme?.in === "header") headers[scheme.name] = token;
        return;
    }
    if (type === "basic" || (type === "http" && /basic/i.test(scheme?.scheme ?? ""))) {
        headers["Authorization"] = /^basic\s/i.test(token) ? token : `Basic ${btoa(token)}`;
        return;
    }
    headers["Authorization"] = `Bearer ${stripBearer(token)}`;
}

function splitList(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(stringifyValue);
        } catch {
            // fall through
        }
    }
    return trimmed.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

export function buildRequest(
    spec: ParsedSpec,
    op: Operation,
    draft: Draft,
    options: { baseUrl: string; token: string; files?: Record<string, File[]> },
): BuiltRequest {
    const missing: string[] = [];
    const headers: Record<string, string> = {};
    const query = new URLSearchParams();
    let path = op.path;

    for (const param of op.parameters) {
        const value = draft.params[`${param.in}:${param.name}`] ?? "";
        if (!value.trim()) {
            if (param.required) missing.push(param.name);
            continue;
        }
        const schema = unwrapNullable(spec.raw, param.schema) as Schema | undefined;
        switch (param.in) {
            case "path":
                path = path.replace(`{${param.name}}`, encodeURIComponent(value.trim()));
                break;
            case "query":
                if (primaryType(schema) === "array") splitList(value).forEach((v) => query.append(param.name, v));
                else query.append(param.name, value);
                break;
            case "header":
                headers[param.name] = value;
                break;
            case "cookie":
                // Browsers do not allow setting the Cookie header from fetch; cookies are sent automatically.
                break;
        }
    }

    applyAuth(spec, op, options.token, headers, query);

    for (const row of draft.headers ?? []) {
        if (row.key.trim()) headers[row.key.trim()] = row.value;
    }

    let body: BuiltRequest["body"];
    let formEntries: BuiltRequest["formEntries"];
    let jsonError: string | undefined;
    const contentType = draft.contentType;
    if (op.requestBody && contentType) {
        const media = op.requestBody.content[contentType];
        if (isFormType(contentType)) {
            const fields = formFields(spec.raw, media?.schema);
            formEntries = [];
            for (const field of fields) {
                if (field.isFile) {
                    const files = options.files?.[field.name] ?? [];
                    if (!files.length && field.required) missing.push(field.name);
                    files.forEach((file) => formEntries!.push([field.name, file]));
                    continue;
                }
                const value = draft.form?.[field.name] ?? "";
                if (!value.trim()) {
                    if (field.required) missing.push(field.name);
                    continue;
                }
                if (field.multiple) splitList(value).forEach((v) => formEntries!.push([field.name, v]));
                else formEntries.push([field.name, value]);
            }
            if (/multipart/i.test(contentType)) {
                const data = new FormData();
                formEntries.forEach(([k, v]) => data.append(k, v));
                body = data;
            } else {
                const data = new URLSearchParams();
                formEntries.forEach(([k, v]) => data.append(k, String(v)));
                body = data;
                headers["Content-Type"] = contentType;
            }
        } else {
            const text = draft.body ?? "";
            if (text.trim()) {
                if (isJsonType(contentType)) {
                    try {
                        JSON.parse(text);
                    } catch (error) {
                        jsonError = (error as Error).message;
                    }
                }
                body = text;
                headers["Content-Type"] = contentType;
            } else if (op.requestBody.required) {
                missing.push("body");
            }
        }
    }

    const base = options.baseUrl.replace(/\/+$/, "");
    const qs = query.toString();
    return {method: op.method.toUpperCase(), url: `${base}${path}${qs ? `?${qs}` : ""}`, headers, body, formEntries, missing, jsonError};
}

// ---------------------------------------------------------------------------
// cURL

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

export function toCurl(req: BuiltRequest): string {
    const parts = [`curl -X ${req.method} ${shellQuote(req.url)}`];
    for (const [key, value] of Object.entries(req.headers)) parts.push(`-H ${shellQuote(`${key}: ${value}`)}`);
    if (req.body instanceof FormData) {
        for (const [key, value] of req.formEntries ?? []) {
            parts.push(`-F ${shellQuote(value instanceof File ? `${key}=@${value.name}` : `${key}=${value}`)}`);
        }
    } else if (req.body !== undefined) {
        parts.push(`--data-raw ${shellQuote(String(req.body))}`);
    }
    return parts.join(" \\\n  ");
}

/** JavaScript fetch() snippet for the request. */
export function toFetch(req: BuiltRequest): string {
    const NL = "\n";
    const options: string[] = [`  method: ${JSON.stringify(req.method)}`];
    if (Object.keys(req.headers).length) options.push(`  headers: ${JSON.stringify(req.headers, null, 2).split(NL).join(NL + "  ")}`);
    let prefix = "";
    if (req.body instanceof FormData) {
        const lines = (req.formEntries ?? []).map(([k, v]) => `form.append(${JSON.stringify(k)}, ${v instanceof File ? `file /* ${v.name} */` : JSON.stringify(v)});`);
        prefix = ["const form = new FormData();", ...lines, "", ""].join(NL);
        options.push("  body: form");
    } else if (req.body !== undefined) {
        options.push(`  body: ${JSON.stringify(String(req.body))}`);
    }
    return `${prefix}const res = await fetch(${JSON.stringify(req.url)}, {${NL}${options.join("," + NL)}${NL}});${NL}const data = await res.json();`;
}

// ---------------------------------------------------------------------------
// Sending

const controllers = new Map<string, AbortController>();

export function cancelRequest(key: string) {
    controllers.get(key)?.abort();
}

/** The request as the background worker takes it, or null when it has to be sent from the page (files too large). */
async function proxyRequest(req: BuiltRequest): Promise<ProxyRequest | null> {
    const request = {method: req.method, url: req.url, headers: req.headers};
    if (req.body instanceof FormData) {
        const form = await toFormParts(req.body);
        return form && {...request, form};
    }
    return {...request, body: req.body instanceof URLSearchParams ? req.body.toString() : req.body};
}

export async function sendRequest(key: string, req: BuiltRequest): Promise<SentResponse> {
    const started = performance.now();
    const base = {method: req.method, url: req.url, at: Date.now()};
    let sameOrigin = false;
    try {
        sameOrigin = new URL(req.url).origin === location.origin;
    } catch {
        return {...base, status: 0, statusText: "", headers: [], ms: 0, size: 0, contentType: "", error: `Invalid URL: ${req.url}`};
    }

    // Cancel aborts either way: the page's own fetch, or the port to the background worker (which aborts there).
    const controller = new AbortController();
    controllers.get(key)?.abort();
    controllers.set(key, controller);
    try {
        // Another origin: through the background worker, so CORS doesn't apply. Only files too large to hand over
        // (see MAX_PROXY_BYTES) are sent from the page, where it does.
        const proxied = sameOrigin ? null : await proxyRequest(req);
        if (proxied) {
            const res = await proxyFetch(proxied, controller.signal);
            const ms = Math.round(performance.now() - started);
            if (res.error && !res.status) throw new Error(res.error);
            const contentType = res.headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
            // The server answered, but the body could not be handed over (too large).
            if (res.error) return {...base, status: res.status, statusText: res.statusText, headers: res.headers, ms, size: 0, contentType, error: res.error};
            if (res.base64 !== undefined) {
                const blob = new Blob([fromBase64(res.base64)], {type: contentType});
                return {...base, status: res.status, statusText: res.statusText, headers: res.headers, ms, size: blob.size, contentType, blobUrl: URL.createObjectURL(blob)};
            }
            const bodyText = res.bodyText ?? "";
            return {...base, status: res.status, statusText: res.statusText, headers: res.headers, ms, size: new Blob([bodyText]).size, contentType, bodyText};
        }

        const response = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
            credentials: "include",
            signal: controller.signal,
        });
        const blob = await response.blob();
        const ms = Math.round(performance.now() - started);
        const contentType = response.headers.get("content-type") ?? "";
        const headers = [...response.headers.entries()] as [string, string][];
        const common = {...base, status: response.status, statusText: response.statusText, headers, ms, size: blob.size, contentType};
        if (!blob.size || TEXTUAL_TYPE.test(contentType) || !contentType) return {...common, bodyText: await blob.text()};
        return {...common, blobUrl: URL.createObjectURL(blob)};
    } catch (error) {
        const ms = Math.round(performance.now() - started);
        const aborted = (error as Error).name === "AbortError";
        const message = aborted
            ? "Request cancelled"
            : `${(error as Error).message || "Network error"}${sameOrigin ? "" : " (cross-origin request, check CORS / server availability)"}`;
        return {...base, status: 0, statusText: "", headers: [], ms, size: 0, contentType: "", error: message};
    } finally {
        if (controllers.get(key) === controller) controllers.delete(key);
    }
}

// ---------------------------------------------------------------------------
// Tokens

const TOKEN_KEYS = ["access_token", "accessToken", "token", "jwt", "id_token", "idToken", "bearer", "auth_token"];

export function findTokenInResponse(bodyText?: string): string | null {
    return findTokenPath(bodyText)?.token ?? null;
}

/** Token in a login response plus where it was found (used to renew it later). */
export function findTokenPath(bodyText?: string): { token: string; path: string[] } | null {
    if (!bodyText || bodyText.length > 200_000) return null;
    let data: unknown;
    try {
        data = JSON.parse(bodyText);
    } catch {
        return null;
    }
    const lookup = (obj: unknown, depth: number, path: string[]): { token: string; path: string[] } | null => {
        if (!obj || typeof obj !== "object" || depth > 2) return null;
        const record = obj as Record<string, unknown>;
        for (const key of TOKEN_KEYS) {
            const value = record[key];
            if (typeof value === "string" && value.length >= 16) return {token: value, path: [...path, key]};
        }
        for (const nested of ["data", "result", "tokens", "auth"]) {
            const found = lookup(record[nested], depth + 1, [...path, nested]);
            if (found) return found;
        }
        return null;
    };
    return lookup(data, 0, []);
}

export function valueAtPath(bodyText: string | undefined, path: string[]): unknown {
    if (!bodyText) return undefined;
    try {
        return path.reduce<unknown>((obj, key) => (obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined), JSON.parse(bodyText));
    } catch {
        return undefined;
    }
}

function issuesFromRepr(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const pattern = /['"]loc['"]\s*:\s*[([]([^)\]]*)[)\]]\s*,\s*['"]msg['"]\s*:\s*(['"])(.*?)\2/g;
    for (const match of text.matchAll(pattern)) {
        const loc = match[1].split(",").map((part) => part.trim()).filter(Boolean)
            .map((part) => (/^-?\d+$/.test(part) ? Number(part) : part.replace(/^['"]|['"]$/g, "")));
        issues.push({loc, msg: match[3]});
    }
    return issues;
}

export interface ValidationIssue {
    /** e.g. ["body", "email"], ["query", "limit"], ["path", "user_id"] */
    loc: (string | number)[];
    msg: string;
}

/** FastAPI / pydantic style validation errors: {"detail": [{"loc": [...], "msg": "..."}]}. */
export function validationIssues(status: number, bodyText?: string): ValidationIssue[] {
    if ((status !== 422 && status !== 400) || !bodyText || bodyText.length > 200_000) return [];
    try {
        const data = JSON.parse(bodyText);
        const list = Array.isArray(data?.detail) ? data.detail : Array.isArray(data?.errors) ? data.errors : [];
        if (!list.length) {
            // some APIs wrap pydantic errors in a string (Python repr): "[{'loc': ('body', 'email'), 'msg': 'Field required'}]"
            const text = [data?.message, data?.detail, data?.error].find((v) => typeof v === "string" && v.includes("loc")) as string | undefined;
            return text ? issuesFromRepr(text) : [];
        }
        return list
            .filter((item: unknown): item is { loc: unknown[]; msg: unknown } => !!item && typeof item === "object" && Array.isArray((item as { loc?: unknown }).loc))
            .map((item: { loc: unknown[]; msg: unknown }) => ({
                loc: item.loc.filter((p): p is string | number => typeof p === "string" || typeof p === "number"),
                msg: String(item.msg ?? "invalid"),
            }));
    } catch {
        return [];
    }
}

export function decodeJwt(token: string): { exp?: number; sub?: string; email?: string; [key: string]: unknown } | null {
    const parts = stripBearer(token).split(".");
    if (parts.length !== 3) return null;
    try {
        const binary = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="));
        const json = new TextDecoder("utf-8", {fatal: true}).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
        const payload = JSON.parse(json);
        return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
    } catch {
        return null;
    }
}

export function tokenExpiry(token: string): { expired: boolean; label: string } | null {
    const payload = decodeJwt(token);
    if (!payload?.exp) return null;
    const diff = payload.exp * 1000 - Date.now();
    const abs = Math.abs(diff);
    const label = abs < 60_000 ? `${Math.round(abs / 1000)}s`
        : abs < 3_600_000 ? `${Math.round(abs / 60_000)}m`
            : abs < 86_400_000 ? `${Math.round(abs / 3_600_000)}h`
                : `${Math.round(abs / 86_400_000)}d`;
    return {expired: diff <= 0, label: diff <= 0 ? `expired ${label} ago` : `expires in ${label}`};
}

export type TokenState = "ok" | "expiring" | "expired" | "unknown";

/** Human friendly identity of a token: e-mail / username from a JWT payload, else the given label. */
export function tokenInfo(token: string, label?: string): { name: string; state: TokenState; expiry: string | null } {
    const payload = decodeJwt(token);
    // identity claims can sit at the top level or one level down (e.g. {user: {email}})
    const scopes = [payload, ...Object.values(payload ?? {}).filter((v) => v && typeof v === "object" && !Array.isArray(v))] as Record<string, unknown>[];
    const pick = (...keys: string[]) => {
        for (const scope of scopes) {
            const hit = keys.map((k) => scope?.[k]).find((v) => typeof v === "string" && v);
            if (hit) return hit as string;
        }
        return undefined;
    };
    const name = pick("email", "preferred_username", "username", "user_name", "name", "upn")
        ?? (payload?.sub !== undefined ? `sub ${String(payload.sub)}` : undefined)
        ?? label
        ?? "token";
    if (!payload?.exp) return {name, state: "unknown", expiry: null};
    const left = payload.exp * 1000 - Date.now();
    const expiry = tokenExpiry(token)?.label ?? null;
    return {name, state: left <= 0 ? "expired" : left < 5 * 60_000 ? "expiring" : "ok", expiry};
}

const AUTH_MESSAGE = /not authenticated|unauthori[sz]ed|authentication (required|failed)|invalid (token|credentials)|token (is )?(expired|invalid|missing)|could not validate credentials|signature has expired|missing (authorization|bearer)|jwt|forbidden/i;

/** Detects responses that most likely failed because of missing or invalid credentials. */
export function authProblem(status: number, bodyText?: string): string | null {
    let message = "";
    if (bodyText && bodyText.length < 4000) {
        try {
            const data = JSON.parse(bodyText);
            const detail = data?.detail ?? data?.message ?? data?.error ?? data?.error_description;
            message = typeof detail === "string" ? detail : "";
        } catch {
            message = bodyText.slice(0, 200);
        }
    }
    if (status === 401) return message || "401 Unauthorized";
    if (status === 403 && (!message || AUTH_MESSAGE.test(message))) return message || "403 Forbidden";
    if (message && AUTH_MESSAGE.test(message) && status >= 400) return message;
    return null;
}

export async function oauthPasswordLogin(tokenUrl: string, username: string, password: string, scopes = ""): Promise<string> {
    const body = new URLSearchParams({grant_type: "password", username, password});
    if (scopes) body.set("scope", scopes);
    const url = new URL(tokenUrl, location.href).href;
    const res = await sendRequest("__oauth__", {
        method: "POST",
        url,
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body,
        missing: [],
    });
    if (res.error) throw new Error(res.error);
    const token = findTokenInResponse(res.bodyText);
    if (res.status >= 400 || !token) {
        throw new Error(`Login failed (${res.status}): ${(res.bodyText ?? "").slice(0, 200)}`);
    }
    return token;
}

export function formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
