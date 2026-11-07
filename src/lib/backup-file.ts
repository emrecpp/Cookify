// Export file format: a small header, then the JSON backup compressed with gzip. With a password the
// compressed data is encrypted with AES-256-GCM, using a key derived from the password with PBKDF2.
// The header is authenticated too, so changing it makes the file fail to open.

import {concatBytes, readBytes} from "@/lib/values";

const MAGIC = [0x43, 0x4b, 0x46, 0x59]; // "CKFY"
const FORMAT = 1;
const FLAG_ENCRYPTED = 1;
const PREFIX_BYTES = MAGIC.length + 2;
const ITERATIONS_BYTES = 4;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const ENCRYPTED_HEADER_BYTES = PREFIX_BYTES + ITERATIONS_BYTES + SALT_BYTES + IV_BYTES;
const ITERATIONS = 600_000;
/** The count comes from the file, so a damaged file must not be able to freeze the popup. */
const MAX_ITERATIONS = 10_000_000;
/** A few kilobytes of gzip can unpack to gigabytes: a file past this is refused instead of freezing the popup. */
const MAX_UNPACKED_BYTES = 200 * 1024 * 1024;

export class WrongPasswordError extends Error {
    constructor() {
        super("Wrong password, or the file is damaged.");
    }
}

class TooLargeError extends Error {
    constructor() {
        super("The file unpacks to more than 200 MB, it can't be a Cookify export.");
    }
}

async function transform(data: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array> {
    const bytes = await readBytes(new Blob([data]).stream().pipeThrough(stream), limit);
    if (!bytes) throw new TooLargeError();
    return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
    // The same password typed on another system can arrive in a different Unicode form.
    const secret = new TextEncoder().encode(password.normalize("NFKC"));
    const material = await crypto.subtle.importKey("raw", secret, "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        {name: "PBKDF2", hash: "SHA-256", salt, iterations},
        material,
        {name: "AES-GCM", length: 256},
        false,
        ["encrypt", "decrypt"],
    );
}

/** An empty password means the file is compressed only. */
export async function packBackup(json: string, password = ""): Promise<Uint8Array> {
    const compressed = await transform(new TextEncoder().encode(json), new CompressionStream("gzip"));
    if (!password) return concatBytes(Uint8Array.from([...MAGIC, FORMAT, 0]), compressed);

    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const iterations = new Uint8Array(ITERATIONS_BYTES);
    new DataView(iterations.buffer).setUint32(0, ITERATIONS);
    const header = concatBytes(Uint8Array.from([...MAGIC, FORMAT, FLAG_ENCRYPTED]), iterations, salt, iv);
    const key = await deriveKey(password, salt, ITERATIONS);
    const body = await crypto.subtle.encrypt({name: "AES-GCM", iv, additionalData: header}, key, compressed);
    return concatBytes(header, new Uint8Array(body));
}

const isPacked = (bytes: Uint8Array) => bytes.length >= PREFIX_BYTES && MAGIC.every((byte, index) => bytes[index] === byte);

export const isEncryptedBackup = (bytes: Uint8Array) => isPacked(bytes) && (bytes[MAGIC.length + 1] & FLAG_ENCRYPTED) !== 0;

const damaged = () => new Error("The file is damaged.");

async function decrypt(bytes: Uint8Array, password: string): Promise<Uint8Array> {
    if (bytes.length <= ENCRYPTED_HEADER_BYTES) throw damaged();
    const saltStart = PREFIX_BYTES + ITERATIONS_BYTES;
    const iterations = new DataView(bytes.buffer, bytes.byteOffset + PREFIX_BYTES, ITERATIONS_BYTES).getUint32(0);
    if (!iterations || iterations > MAX_ITERATIONS) throw damaged();
    const key = await deriveKey(password, bytes.slice(saltStart, saltStart + SALT_BYTES), iterations);
    try {
        return new Uint8Array(await crypto.subtle.decrypt(
            {name: "AES-GCM", iv: bytes.slice(saltStart + SALT_BYTES, ENCRYPTED_HEADER_BYTES), additionalData: bytes.slice(0, ENCRYPTED_HEADER_BYTES)},
            key,
            bytes.slice(ENCRYPTED_HEADER_BYTES),
        ));
    } catch {
        throw new WrongPasswordError();
    }
}

/** Returns the JSON text of an export file. Files from older versions are plain JSON. */
export async function openBackup(bytes: Uint8Array, password = ""): Promise<string> {
    if (!isPacked(bytes)) return new TextDecoder().decode(bytes);
    if (bytes[MAGIC.length] > FORMAT) throw new Error("This file was exported by a newer Cookify version.");
    const compressed = isEncryptedBackup(bytes) ? await decrypt(bytes, password) : bytes.slice(PREFIX_BYTES);
    let unpacked: Uint8Array;
    try {
        unpacked = await transform(compressed, new DecompressionStream("gzip"), MAX_UNPACKED_BYTES);
    } catch (error) {
        throw error instanceof TooLargeError ? error : damaged();
    }
    return new TextDecoder().decode(unpacked);
}
