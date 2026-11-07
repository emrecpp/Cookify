import {describe, expect, it} from "vitest";
import {isEncryptedBackup, openBackup, packBackup, WrongPasswordError} from "./backup-file";

const json = JSON.stringify({name: "cookify", version: 3, cookies: Array.from({length: 200}, (_, i) => ({alias: `cookie ${i}`, value: "secret-token-value"}))});
const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("export files", () => {
    it("compresses a file without a password", async () => {
        const file = await packBackup(json);
        expect(file.length).toBeLessThan(json.length / 4);
        expect(isEncryptedBackup(file)).toBe(false);
        expect(await openBackup(file)).toBe(json);
    });

    it("opens an encrypted file only with its password", async () => {
        const file = await packBackup(json, "pässword");
        expect(isEncryptedBackup(file)).toBe(true);
        expect(await openBackup(file, "pässword")).toBe(json);
        await expect(openBackup(file, "wrong")).rejects.toBeInstanceOf(WrongPasswordError);
        await expect(openBackup(file)).rejects.toBeInstanceOf(WrongPasswordError);
    });

    it("accepts the same password in another Unicode form", async () => {
        const file = await packBackup(json, "café");
        expect(await openBackup(file, "café")).toBe(json);
    });

    it("keeps the data unreadable and uses a new salt for every file", async () => {
        const [a, b] = await Promise.all([packBackup(json, "pw"), packBackup(json, "pw")]);
        expect(text(a)).not.toContain("secret-token-value");
        expect(text(a)).not.toBe(text(b));
    });

    it("refuses a changed header or body", async () => {
        const body = await packBackup(json, "pw");
        body[body.length - 1] ^= 1;
        await expect(openBackup(body, "pw")).rejects.toBeInstanceOf(WrongPasswordError);

        const header = await packBackup(json, "pw");
        header[15] ^= 1;
        await expect(openBackup(header, "pw")).rejects.toBeInstanceOf(WrongPasswordError);
    });

    it("refuses damaged files and files from a newer version", async () => {
        const iterations = await packBackup(json, "pw");
        iterations.fill(0xff, 6, 10);
        await expect(openBackup(iterations, "pw")).rejects.toThrow("damaged");

        const compressed = await packBackup(json);
        compressed.fill(0, 6, 30);
        await expect(openBackup(compressed)).rejects.toThrow("damaged");

        const newer = await packBackup(json);
        newer[4] = 99;
        await expect(openBackup(newer)).rejects.toThrow("newer Cookify");
    });

    it("reads plain JSON files from older versions", async () => {
        expect(await openBackup(new TextEncoder().encode(json))).toBe(json);
    });
});
