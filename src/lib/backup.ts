// Export / import files. Version 3 holds everything Google Drive sync holds (popup data and the Swagger
// view data); version 1 files (popup data only) and Google Drive backups (version 2 and 3) are read too.
import {mergeSwaggerUi, readLocal, toCloud, writeLocal} from "@/lib/cloud-data";
import {applyConflictResolutions, mergeSnapshots, normalizeSnapshot} from "@/lib/sync";
import {isObject} from "@/lib/values";
import {Settings, SwaggerUiData, SyncSnapshot} from "@/types/types";

export const EXPORT_VERSION = 3;

export interface ImportedFile {
    snapshot: SyncSnapshot;
    /** False for files from older versions that were exported without tokens, cookie values and logins. */
    hasSecrets: boolean;
}

export async function buildExport(): Promise<string> {
    const {snapshot} = await readLocal();
    // The same data as the Google Drive copy: what is useful on another computer.
    return JSON.stringify({name: "cookify", version: EXPORT_VERSION, exportedAt: new Date().toISOString(), ...toCloud(snapshot)});
}

function readSwaggerUi(value: unknown): SwaggerUiData | undefined {
    if (!isObject(value)) return undefined;
    const states = isObject(value.states)
        ? Object.fromEntries(Object.entries(value.states).filter(([, state]) => isObject(state))) as SwaggerUiData["states"]
        : {};
    return {
        prefs: isObject(value.prefs) ? value.prefs : undefined,
        apis: isObject(value.apis) && Array.isArray(value.apis.apis) ? value.apis as SwaggerUiData["apis"] : undefined,
        states,
    };
}

export function parseImport(text: string): ImportedFile {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("The file is not valid JSON.");
    }
    if (!isObject(data) || data.name !== "cookify") throw new Error("This is not a Cookify export file.");
    const version = typeof data.version === "number" ? data.version : 1;
    if (version > EXPORT_VERSION) throw new Error("This file was exported by a newer Cookify version.");
    // Google Drive backups keep the data under `snapshot`.
    const body = isObject(data.snapshot) ? data.snapshot : data;
    const snapshot = normalizeSnapshot({
        cookies: Array.isArray(body.cookies) ? body.cookies : [],
        swaggers: Array.isArray(body.swaggers) ? body.swaggers : [],
        settings: isObject(body.settings) ? body.settings as unknown as Settings : undefined,
    });
    return {snapshot: {...snapshot, swaggerUi: readSwaggerUi(body.swaggerUi)}, hasSecrets: data.includesSecrets !== false};
}

export function summarize(snapshot: SyncSnapshot) {
    return {
        cookies: snapshot.cookies.length,
        tokens: snapshot.swaggers.length,
        apis: snapshot.swaggerUi?.apis?.apis.length ?? 0,
    };
}

/**
 * Merge: adds what the file has, its version wins where both changed the same thing (yours wins when the
 * file has no tokens). Replace: the file's data replaces yours (the Swagger part only when the file has one).
 */
export async function applyImport({snapshot: imported, hasSecrets}: ImportedFile, mode: "merge" | "replace"): Promise<void> {
    const {all, snapshot: local} = await readLocal();
    let next: SyncSnapshot;
    if (mode === "replace") {
        next = {...imported, swaggerUi: imported.swaggerUi ?? local.swaggerUi};
    } else {
        const winner = hasSecrets ? "cloud" : "local";
        const popup = mergeSnapshots(local, imported);
        next = {
            ...applyConflictResolutions(popup, Object.fromEntries(popup.conflicts.map((c) => [c.id, winner]))),
            swaggerUi: mergeSwaggerUi(local.swaggerUi, imported.swaggerUi, undefined, hasSecrets),
        };
    }
    await writeLocal(next, all);
}
