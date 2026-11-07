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

/** Joins byte arrays into one. */
export function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/** Reads a stream to the end, or returns null once it grows past `limit` (the rest is not read). */
export async function readBytes(stream: ReadableStream<Uint8Array>, limit = Infinity): Promise<Uint8Array | null> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel().catch(() => undefined);
            return null;
        }
        chunks.push(value);
    }
    return concatBytes(...chunks);
}
