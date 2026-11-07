// Code snippets for a built request and a Postman collection export.
import {ParsedSpec} from "./openapi";
import {BuiltRequest, buildRequest, defaultDraft, toCurl, toFetch} from "./request";
import {apiStore} from "./state";

const NL = "\n";

function py(value: string) {
    return JSON.stringify(value);
}

function jsonBody(req: BuiltRequest): unknown | undefined {
    if (typeof req.body !== "string") return undefined;
    if (!/json/i.test(req.headers["Content-Type"] ?? req.headers["content-type"] ?? "")) return undefined;
    try {
        return JSON.parse(req.body);
    } catch {
        return undefined;
    }
}

function toPythonLiteral(value: unknown, indent = 0): string {
    const pad = "    ".repeat(indent + 1);
    const end = "    ".repeat(indent);
    if (value === null) return "None";
    if (value === true) return "True";
    if (value === false) return "False";
    if (typeof value === "string") return py(value);
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
        if (!value.length) return "[]";
        return `[${NL}${value.map((v) => pad + toPythonLiteral(v, indent + 1)).join("," + NL)}${NL}${end}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return "{}";
    return `{${NL}${entries.map(([k, v]) => `${pad}${py(k)}: ${toPythonLiteral(v, indent + 1)}`).join("," + NL)}${NL}${end}}`;
}

export function toPython(req: BuiltRequest): string {
    const lines = ["import requests", ""];
    const headers = {...req.headers};
    const json = jsonBody(req);
    if (json !== undefined) {
        delete headers["Content-Type"];
        delete headers["content-type"];
    }
    const args = [py(req.url)];
    if (Object.keys(headers).length) {
        lines.push(`headers = ${toPythonLiteral(headers)}`);
        args.push("headers=headers");
    }
    if (json !== undefined) {
        lines.push(`payload = ${toPythonLiteral(json)}`);
        args.push("json=payload");
    } else if (req.body instanceof FormData) {
        const fields = (req.formEntries ?? []).filter(([, v]) => !(v instanceof File)).map(([k, v]) => [k, String(v)]);
        const files = (req.formEntries ?? []).filter(([, v]) => v instanceof File).map(([k, v]) => [k, (v as File).name]);
        if (fields.length) {
            lines.push(`data = ${toPythonLiteral(Object.fromEntries(fields))}`);
            args.push("data=data");
        }
        if (files.length) {
            lines.push(`files = {${files.map(([k, name]) => `${py(k)}: open(${py(name)}, "rb")`).join(", ")}}`);
            args.push("files=files");
        }
    } else if (req.body !== undefined) {
        lines.push(`data = ${py(String(req.body))}`);
        args.push("data=data");
    }
    lines.push("", `response = requests.${req.method.toLowerCase()}(${args.join(", ")})`, "print(response.status_code)", "print(response.json())");
    return lines.join(NL);
}

export function toAxios(req: BuiltRequest): string {
    const config: string[] = [`  method: ${JSON.stringify(req.method.toLowerCase())}`, `  url: ${JSON.stringify(req.url)}`];
    if (Object.keys(req.headers).length) config.push(`  headers: ${JSON.stringify(req.headers, null, 2).split(NL).join(NL + "  ")}`);
    const json = jsonBody(req);
    if (json !== undefined) config.push(`  data: ${JSON.stringify(json, null, 2).split(NL).join(NL + "  ")}`);
    else if (typeof req.body === "string") config.push(`  data: ${JSON.stringify(req.body)}`);
    else if (req.body instanceof FormData) config.push("  data: form // build a FormData with the fields");
    return `import axios from "axios";${NL}${NL}const {data} = await axios({${NL}${config.join("," + NL)}${NL}});${NL}console.log(data);`;
}

export function toHttpie(req: BuiltRequest): string {
    const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
    const parts = [`http ${req.method} ${quote(req.url)}`];
    for (const [k, v] of Object.entries(req.headers)) parts.push(quote(`${k}:${v}`));
    if (req.body instanceof FormData) {
        parts[0] = `http --form ${req.method} ${quote(req.url)}`;
        for (const [k, v] of req.formEntries ?? []) parts.push(quote(v instanceof File ? `${k}@${v.name}` : `${k}=${v}`));
        return parts.join(" \\" + NL + "  ");
    }
    const cmd = parts.join(" \\" + NL + "  ");
    return req.body !== undefined ? `echo ${quote(String(req.body))} | ${cmd}` : cmd;
}

export function toPowerShell(req: BuiltRequest): string {
    const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
    const lines: string[] = [];
    const headers = Object.entries(req.headers).filter(([k]) => k.toLowerCase() !== "content-type");
    if (headers.length) lines.push(`$headers = @{${NL}${headers.map(([k, v]) => `    ${q(k)} = ${q(v)}`).join(NL)}${NL}}`);
    const args = [`-Method ${req.method}`, `-Uri ${q(req.url)}`];
    if (headers.length) args.push("-Headers $headers");
    const contentType = req.headers["Content-Type"] ?? req.headers["content-type"];
    if (typeof req.body === "string") {
        lines.push(`$body = @'${NL}${req.body}${NL}'@`);
        args.push("-Body $body");
        if (contentType) args.push(`-ContentType ${q(contentType)}`);
    }
    lines.push(`Invoke-RestMethod ${args.join(" ")}`);
    return lines.join(NL);
}

export const SNIPPETS: { id: string; label: string; build: (req: BuiltRequest) => string }[] = [
    {id: "curl", label: "cURL", build: toCurl},
    {id: "fetch", label: "fetch()", build: toFetch},
    {id: "python", label: "Python (requests)", build: toPython},
    {id: "axios", label: "axios", build: toAxios},
    {id: "httpie", label: "HTTPie", build: toHttpie},
    {id: "powershell", label: "PowerShell", build: toPowerShell},
];

// ---------------------------------------------------------------------------
// Postman collection (v2.1)

/** Builds a Postman v2.1 collection; `{{baseUrl}}` and `{{token}}` are collection variables. */
export function postmanCollection(spec: ParsedSpec, keys?: string[]): string {
    const state = apiStore.get();
    const baseUrl = (state.baseUrl || spec.servers[0]).replace(/\/+$/, "");
    const wanted = keys ? new Set(keys) : null;
    const folders = spec.groups
        .map((group) => ({
            name: group.tag,
            item: group.operations.filter((op) => !wanted || wanted.has(op.key)).map((op) => {
                const draft = state.drafts[op.key] ?? defaultDraft(spec, op, state.paramMemory);
                const req = buildRequest(spec, op, draft, {baseUrl: "{{baseUrl}}", token: ""});
                const raw = req.url.replace(/^\{\{baseUrl\}\}/, "{{baseUrl}}");
                const headers = Object.entries(req.headers).map(([key, value]) => ({key, value}));
                const body = typeof req.body === "string"
                    ? {mode: "raw", raw: req.body, options: {raw: {language: /json/i.test(req.headers["Content-Type"] ?? "") ? "json" : "text"}}}
                    : req.body instanceof FormData
                        ? {mode: "formdata", formdata: (req.formEntries ?? []).map(([key, v]) => (v instanceof File ? {key, type: "file", src: v.name} : {key, value: String(v), type: "text"}))}
                        : undefined;
                return {
                    name: op.summary || `${op.method.toUpperCase()} ${op.path}`,
                    request: {
                        method: op.method.toUpperCase(),
                        header: headers,
                        url: {raw},
                        ...(body ? {body} : {}),
                        ...(op.secured ? {} : {auth: {type: "noauth"}}),
                        description: op.description,
                    },
                };
            }),
        }))
        .filter((folder) => folder.item.length);
    return JSON.stringify({
        info: {name: spec.title, schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
        auth: {type: "bearer", bearer: [{key: "token", value: "{{token}}", type: "string"}]},
        variable: [{key: "baseUrl", value: baseUrl}, {key: "token", value: ""}],
        item: folders,
    }, null, 2);
}

export function downloadText(filename: string, text: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
