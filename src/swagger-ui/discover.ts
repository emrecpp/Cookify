import {proxyFetch} from "@/lib/proxy";
import {isValidSpec, Schema} from "./openapi";

/** How long one candidate address may take, directly and again through the background worker. */
const FETCH_TIMEOUT_MS = 10_000;

const URL_PATTERNS = [
    // First: when a page has both, Swagger UI loads what the config file names, not `url`.
    /\bconfigUrl["']?\s*:\s*["'`]([^"'`]+)["'`]/g,
    /\burl\s*:\s*["'`]([^"'`]+)["'`]/g,
    /["']url["']\s*:\s*["']([^"']+)["']/g,
];

function scanScript(text: string, add: (url: string) => void) {
    for (const pattern of URL_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text))) {
            const value = match[1];
            if (/oauth2-redirect|\.(js|css|png|svg|ico)(\?|$)/i.test(value)) continue;
            add(value);
        }
    }
}

/**
 * The document a page passes to Swagger UI as an object instead of a URL. swagger-ui-express and NestJS do this
 * in their init script (`"swaggerDoc": {...}`), so there may be no JSON address to fetch.
 */
export function embeddedSpec(text: string): string | null {
    const start = /["']?\b(?:swaggerDoc|spec)["']?\s*:\s*(?=\{)/.exec(text);
    if (!start) return null;
    const from = start.index + start[0].length;
    let depth = 0;
    let inString = false;
    for (let i = from; i < text.length; i++) {
        const char = text[i];
        if (inString) {
            if (char === "\\") i++;
            else if (char === '"') inString = false;
        } else if (char === '"') {
            inString = true;
        } else if (char === "{") {
            depth++;
        } else if (char === "}" && --depth === 0) {
            const doc = text.slice(from, i + 1);
            try {
                return isValidSpec(JSON.parse(doc)) ? doc : null;
            } catch {
                return null;
            }
        }
    }
    return null;
}

function parseText(text: string | undefined): { raw: unknown; text: string } | null {
    if (!text) return null;
    try {
        return {raw: JSON.parse(text), text};
    } catch {
        const doc = embeddedSpec(text);
        return doc ? {raw: JSON.parse(doc), text: doc} : null;
    }
}

/** The documents a Swagger UI config file (`configUrl`) points to. */
export function configuredUrls(raw: unknown): string[] {
    const config = raw as { url?: unknown; urls?: { url?: unknown }[] } | null;
    const urls = Array.isArray(config?.urls) ? config.urls.map((entry) => entry?.url) : [];
    return [...urls, config?.url].filter((url): url is string => typeof url === "string" && url !== "");
}

async function fetchSpecText(url: string, fresh = false): Promise<{ raw: unknown; text: string } | null> {
    try {
        const res = await fetch(url, {
            credentials: "include", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: {Accept: "application/json"},
            cache: fresh ? "no-store" : "default",
        });
        if (!res.ok) return null;
        return parseText(await res.text());
    } catch {
        // Possibly CORS: retry through the background worker, which has host permissions. Without cookies:
        // the address comes from the page, which must not read another site's private documents this way.
        try {
            const response = await proxyFetch(
                {method: "GET", url, headers: {Accept: "application/json"}, credentials: "omit"},
                AbortSignal.timeout(FETCH_TIMEOUT_MS),
            );
            if (response.error || response.status >= 400) return null;
            return parseText(response.bodyText);
        } catch {
            return null;
        }
    }
}

export interface DiscoveredSpec {
    url: string;
    raw: Schema;
    /** Raw document text, used for caching and change detection. */
    text: string;
}

/** Fetches a known OpenAPI document again, bypassing the HTTP cache. */
export async function refetchSpec(url: string): Promise<DiscoveredSpec | null> {
    const result = await fetchSpecText(url, true);
    return result && isValidSpec(result.raw) ? {url, raw: result.raw, text: result.text} : null;
}

export async function discoverSpec(): Promise<DiscoveredSpec | null> {
    const candidates: string[] = [];
    const add = (value: string) => {
        try {
            const url = new URL(value, location.href).href;
            if (!candidates.includes(url)) candidates.push(url);
        } catch {
            // ignore
        }
    };

    // A document in the script itself is the one this page shows: the URLs inside it are just its servers.
    const scan = (text: string, source: string) => (embeddedSpec(text) ? add(source) : scanScript(text, add));

    document.querySelectorAll<HTMLScriptElement>("script:not([src])").forEach((script) => scan(script.textContent ?? "", location.href));

    const initializers = [...document.querySelectorAll<HTMLScriptElement>("script[src]")]
        .filter((s) => /initializer|swagger-config|swagger-(ui-)?init|\/index\.js/i.test(s.src));
    for (const script of initializers) {
        try {
            scan(await (await fetch(script.src, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)})).text(), script.src);
        } catch {
            // ignore
        }
    }

    for (const entry of performance.getEntriesByType("resource")) {
        const name = entry.name;
        if (/(openapi|swagger|api-docs)/i.test(name) && !/swagger-ui|\.(js|css|png|svg|ico)(\?|$)/i.test(name)) add(name);
    }

    const dir = location.pathname.replace(/[^/]*$/, "");
    const parent = dir.replace(/[^/]+\/$/, "");
    ["openapi.json", "swagger.json"].forEach((file) => {
        add(dir + file);
        add(parent + file);
    });
    ["/openapi.json", "/swagger.json", "/v3/api-docs", "/swagger/v1/swagger.json", "/api-docs"].forEach(add);

    // Index loop: a config file adds the documents it names to the list.
    for (let i = 0; i < candidates.length; i++) {
        const url = candidates[i];
        const result = await fetchSpecText(url);
        if (result && isValidSpec(result.raw)) return {url, raw: result.raw, text: result.text};
        if (result) configuredUrls(result.raw).forEach(add);
    }
    return null;
}
