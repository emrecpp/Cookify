// Small value helpers shared by the popup, the background worker and the Swagger view.

/** A plain object (not null, not an array). */
export const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** JSON with sorted object keys, so equal data compares equal whatever its key order (chrome.storage may reorder). */
export function stableJson(value: unknown): string {
    return JSON.stringify(value, (_key, v) => (isObject(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v));
}

export const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Origin of an address; "" when it is missing or not a valid url. */
export function originOf(url?: string): string {
    try {
        return url ? new URL(url).origin : "";
    } catch {
        return "";
    }
}
