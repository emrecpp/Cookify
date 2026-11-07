// Requests sent through the background service worker. It has host permissions for all urls, so CORS does
// not stand in the way of an API server on another origin. The Cookify view opens a port per request: the
// request goes in as the first message, the response comes back as one message, and closing the port (Cancel,
// a timeout, the page going away) aborts the request in the worker as well.

import {readBytes} from "@/lib/values";

export const PROXY_PORT = "cookify:fetch";
/** Responses are handed over as one extension message (limited to 64 MiB, base64 adds a third). */
export const MAX_PROXY_BYTES = 32 * 1024 * 1024;
/** Content types shown as text; anything else is handed over as bytes. */
export const TEXTUAL_TYPE = /json|text|xml|javascript|html|csv|yaml|x-www-form-urlencoded|problem/i;

/** One multipart/form-data field: text, or a file (its bytes as base64; a Blob can't go through a port). */
export type ProxyFormPart =
    | { name: string; value: string }
    | { name: string; file: { name: string; type: string; base64: string } };

export interface ProxyRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    /** A multipart/form-data body, instead of `body`. */
    form?: ProxyFormPart[];
    /** "omit" for requests the user did not start (finding a page's OpenAPI document on another origin). */
    credentials?: "include" | "omit";
}

export interface ProxyResponse {
    ok: boolean;
    status: number;
    statusText: string;
    headers: [string, string][];
    bodyText?: string;
    base64?: string;
    error?: string;
}

const failure = (error: string): ProxyResponse => ({ok: false, status: 0, statusText: "", headers: [], error});

const isString = (value: unknown): value is string => typeof value === "string";

function isFormPart(value: unknown): value is ProxyFormPart {
    const part = value as Record<string, unknown> | null;
    if (!part || typeof part !== "object" || !isString(part.name)) return false;
    if ("value" in part) return isString(part.value);
    const file = part.file as Record<string, unknown> | null;
    return !!file && typeof file === "object" && isString(file.name) && isString(file.type) && isString(file.base64);
}

/** Only well formed requests to http(s) addresses are sent; the port can be reached by any content script. */
export function checkProxyRequest(value: unknown): ProxyRequest | string {
    const request = value as Partial<ProxyRequest> | null;
    if (!request || typeof request !== "object" || typeof request.method !== "string" || typeof request.url !== "string") return "Invalid request";
    if (request.body !== undefined && typeof request.body !== "string") return "Invalid request body";
    if (request.form !== undefined && (request.body !== undefined || !Array.isArray(request.form) || !request.form.every(isFormPart))) return "Invalid form data";
    const headers = request.headers ?? {};
    if (typeof headers !== "object" || Object.values(headers).some((v) => typeof v !== "string")) return "Invalid request headers";
    let protocol = "";
    try {
        protocol = new URL(request.url).protocol;
    } catch {
        // refused below
    }
    if (protocol !== "http:" && protocol !== "https:") return "Only http and https addresses are allowed";
    return request as ProxyRequest;
}

export function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** The parts of a FormData for a ProxyRequest, or null when its files are too large to hand over. */
export async function toFormParts(data: FormData, limit = MAX_PROXY_BYTES): Promise<ProxyFormPart[] | null> {
    let size = 0;
    for (const value of data.values()) if (typeof value !== "string") size += value.size;
    if (size > limit) return null;
    const parts: ProxyFormPart[] = [];
    for (const [name, value] of data.entries()) {
        if (typeof value === "string") parts.push({name, value});
        else parts.push({name, file: {name: value.name, type: value.type, base64: toBase64(new Uint8Array(await value.arrayBuffer()))}});
    }
    return parts;
}

function toFormData(parts: ProxyFormPart[]): FormData {
    const data = new FormData();
    for (const part of parts) {
        if ("value" in part) data.append(part.name, part.value);
        else data.append(part.name, new Blob([fromBase64(part.file.base64)], {type: part.file.type}), part.file.name);
    }
    return data;
}

/** The body, or null once it grows past `limit` (the rest is not downloaded). */
async function readLimited(response: Response, limit: number): Promise<Uint8Array | null> {
    if (!response.body) return new Uint8Array(await response.arrayBuffer());
    return readBytes(response.body, limit);
}

/** Runs a request in the background worker. Never throws: failures come back as `error`. */
export async function runProxyRequest(value: unknown, signal?: AbortSignal, limit = MAX_PROXY_BYTES): Promise<ProxyResponse> {
    const request = checkProxyRequest(value);
    if (typeof request === "string") return failure(request);
    try {
        const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.method === "GET" || request.method === "HEAD" ? undefined : request.form ? toFormData(request.form) : request.body,
            credentials: request.credentials === "omit" ? "omit" : "include",
            signal,
        });
        const meta = {ok: response.ok, status: response.status, statusText: response.statusText, headers: [...response.headers.entries()]};
        const bytes = await readLimited(response, limit);
        if (!bytes) return {...meta, ok: false, error: `The response is larger than ${Math.round(limit / 1024 / 1024)} MB, too big to show here. Use "Copy as cURL" to download it.`};
        const contentType = response.headers.get("content-type") ?? "";
        const textual = !bytes.byteLength || !contentType || TEXTUAL_TYPE.test(contentType);
        return {...meta, ...(textual ? {bodyText: new TextDecoder().decode(bytes)} : {base64: toBase64(bytes)})};
    } catch (error) {
        return failure((error as Error).message || "Network error");
    }
}

const abortError = () => new DOMException("Request cancelled", "AbortError");

/**
 * Sends `request` through the background worker. Aborting `signal` rejects with an AbortError and closes the
 * port, which cancels the request in the worker too.
 */
export function proxyFetch(request: ProxyRequest, signal?: AbortSignal): Promise<ProxyResponse> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError());
            return;
        }
        let port: chrome.runtime.Port;
        try {
            port = chrome.runtime.connect({name: PROXY_PORT});
        } catch (error) {
            reject(error);
            return;
        }
        let settled = false;
        const settle = () => {
            settled = true;
            signal?.removeEventListener("abort", onAbort);
        };
        const onAbort = () => {
            settle();
            port.disconnect();
            reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, {once: true});
        port.onMessage.addListener((response: ProxyResponse) => {
            if (settled) return;
            settle();
            port.disconnect();
            resolve(response);
        });
        // Only fires when the worker side closed the port (our own disconnect() doesn't call it).
        port.onDisconnect.addListener(() => {
            if (settled) return;
            settle();
            reject(new Error(chrome.runtime.lastError?.message || "No response from the Cookify background worker"));
        });
        port.postMessage(request);
    });
}

/**
 * Background side: answers the ports opened by proxyFetch. Only the Cookify view may use it, which runs as a
 * content script in the top frame of a tab; one request per port.
 */
export function serveProxyRequests() {
    chrome.runtime.onConnect.addListener((port) => {
        if (port.name !== PROXY_PORT) return;
        const sender = port.sender;
        if (sender?.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0) {
            port.disconnect();
            return;
        }
        const controller = new AbortController();
        port.onDisconnect.addListener(() => controller.abort());
        let started = false;
        port.onMessage.addListener((message: unknown) => {
            if (started) return;
            started = true;
            void runProxyRequest(message, controller.signal).then((response) => {
                if (!controller.signal.aborted) port.postMessage(response);
            });
        });
    });
}
