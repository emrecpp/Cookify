// Google Drive sync engine. Runs in the background service worker, so changes made on a Swagger page are
// backed up while the popup is closed, and changes from another computer arrive without opening it.
// The popup and the Swagger pages read and write chrome.storage.local only; this module merges that with
// the cloud copy (three-way, against the snapshot of the last sync) and writes the result back.
import {changeLevel, ChangeLevel, contentEqual, isEmpty, mergeAll, mergeSwaggerUi, readLocal, SYNC_BASE_KEY, SYNC_KEY, toCloud, writeLocal} from "@/lib/cloud-data";
import {downloadSyncDocument, DriveSyncDocument, findSyncFile, logoutGoogleDrive, uploadSyncDocument} from "@/lib/google-drive";
import {applyConflictResolutions, MergeResult, syncSnapshotsEqual} from "@/lib/sync";
import {errorText} from "@/lib/values";
import {ConflictResolution, SwaggerUiData, SyncSnapshot} from "@/types/types";

/** Running / progress flags, kept in chrome.storage.session (not synced, gone with the browser session). */
export const SYNC_RUN_KEY = "cookifySyncRun";
/** The next upload. There is one: whatever is waiting by then goes up together. */
export const PUSH_ALARM = "cookify-push";

const MINUTE = 60_000;
/** A sync this recent is fresh enough for a page or the popup that opens: it doesn't download again. */
const PULL_GAP = 2 * MINUTE;
const IMPORTANT_DELAY = MINUTE;
const MINOR_DELAY = 15 * MINUTE;
/** Leaving a Swagger page uploads what is waiting, but not more often than this. */
const LEAVING_GAP = 5 * MINUTE;

export interface PendingMerge {
    result: MergeResult;
    fileId: string;
    /** Swagger view data merged when the conflicts were found, and the local copy it was merged from. */
    swaggerUi?: SwaggerUiData;
    localUi?: SwaggerUiData;
}

export interface SyncConfig {
    enabled: boolean;
    email?: string;
    profileImageUrl?: string;
    lastConnectedAt?: string;
    lastSyncedAt?: string;
    /** When Drive was last read and last written (ms). */
    lastCheckedAt?: number;
    lastPushedAt?: number;
    fileId?: string;
    error?: string;
    pending?: PendingMerge;
    conflictPageOpened?: boolean;
}

export interface SyncRun {
    running: boolean;
    progress: boolean;
}

export type SyncMessage =
    | { type: "cookify:sync"; force?: boolean }
    | { type: "cookify:leaving" }
    | { type: "cookify:sync-resolve"; resolutions: Record<string, ConflictResolution> };

export async function getSyncConfig(): Promise<SyncConfig> {
    return ((await chrome.storage.local.get(SYNC_KEY))[SYNC_KEY] as SyncConfig | undefined) ?? {enabled: false};
}

export async function patchSyncConfig(patch: Partial<SyncConfig>): Promise<SyncConfig> {
    const next = {...(await getSyncConfig()), ...patch};
    await chrome.storage.local.set({[SYNC_KEY]: next});
    return next;
}

async function setRun(run: SyncRun) {
    try {
        await chrome.storage.session.set({[SYNC_RUN_KEY]: run});
    } catch {
        // ignore
    }
}

function isAuthorizationError(error: unknown): boolean {
    const message = errorText(error).toLowerCase();
    return message.includes("access_denied")
        || (message.includes("403") && (message.includes("insufficient authentication scopes") || message.includes("insufficientpermissions") || message.includes("permission")));
}

// One sync at a time.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
}

/** When changes waiting on this computer should go to the cloud. */
export function pushTime(level: Exclude<ChangeLevel, "none">, leaving: boolean, now: number, pushedAt = 0): number {
    if (level === "important") return now + IMPORTANT_DELAY;
    return leaving ? Math.max(now, pushedAt + LEAVING_GAP) : now + MINOR_DELAY;
}

/**
 * Plans the upload of what changed here. The time is fixed by the first change and only ever moves closer, so
 * working on doesn't postpone it, and everything that changes until then goes with the same upload.
 * `leaving`: a Swagger page went to the back, maybe to continue on another computer.
 */
export async function schedulePush(leaving = false): Promise<void> {
    const config = await getSyncConfig();
    const {all, snapshot: local} = await readLocal();
    const base = all[SYNC_BASE_KEY] as SyncSnapshot | undefined;
    const level = base ? changeLevel(local, base) : "important";
    if (!config.enabled || config.pending || level === "none") {
        await chrome.alarms.clear(PUSH_ALARM);
        return;
    }
    const now = Date.now();
    const when = pushTime(level, leaving, now, config.lastPushedAt);
    if (when <= now) {
        await chrome.alarms.clear(PUSH_ALARM);
        await runSync({reason: "push"});
        return;
    }
    const alarm = await chrome.alarms.get(PUSH_ALARM);
    if (!alarm || when < alarm.scheduledTime) await chrome.alarms.create(PUSH_ALARM, {when});
}

/**
 * Syncs with Google Drive. `pull`: brings what changed elsewhere (skipped after a recent sync) and only uploads
 * important changes, the others stay planned. `push`: uploads everything that changed here. `force`: does both
 * right away and shows the progress bar.
 */
export function runSync(options: { reason: "push" | "pull"; force?: boolean }): Promise<void> {
    return serial(() => sync(options)).finally(() => schedulePush().catch(() => undefined));
}

async function sync({reason, force}: { reason: "push" | "pull"; force?: boolean }): Promise<void> {
    const config = await getSyncConfig();
    if (!config.enabled || config.pending) return;
    if (reason === "pull" && !force && Date.now() - (config.lastCheckedAt ?? 0) < PULL_GAP) return;
    const {all, snapshot: local} = await readLocal();
    const base = all[SYNC_BASE_KEY] as SyncSnapshot | undefined;
    if (reason === "push" && base && contentEqual(local, base)) return;

    await setRun({running: true, progress: !!force});
    try {
        const initialDownload = isEmpty(local) && !base;
        let file = config.fileId ? {id: config.fileId} : await findSyncFile();
        let cloudDocument: DriveSyncDocument | undefined;
        if (file) {
            if (initialDownload) await setRun({running: true, progress: true});
            try {
                cloudDocument = await downloadSyncDocument(file.id);
            } catch (error) {
                if (!config.fileId || !errorText(error).includes("404")) throw error;
                file = await findSyncFile();
                cloudDocument = file ? await downloadSyncDocument(file.id) : undefined;
            }
        }

        if (!file || !cloudDocument) {
            const upload = await uploadSyncDocument(toCloud(local));
            await complete(local, upload.fileId, upload.document.updatedAt, local, {pushed: true});
            return;
        }
        const cloud = cloudDocument.snapshot;
        if (initialDownload) {
            await complete(cloud, file.id, cloudDocument.updatedAt, local);
            return;
        }

        // Something changed while downloading: leave it to the next sync, which merges the newer local data.
        if (!contentEqual((await readLocal()).snapshot, local)) return;

        const {popup, swaggerUi} = mergeAll(local, cloud, base);
        if (popup.conflicts.length) {
            const next = await patchSyncConfig({pending: {result: popup, fileId: file.id, swaggerUi, localUi: local.swaggerUi}});
            if (!next.conflictPageOpened) {
                await patchSyncConfig({conflictPageOpened: true});
                await chrome.tabs.create({url: chrome.runtime.getURL("index.html?page=sync-conflicts"), active: true});
            }
            return;
        }

        const merged: SyncSnapshot = {...popup.snapshot, swaggerUi};
        const level = changeLevel(merged, cloud);
        const upload = level === "important" || (level === "minor" && (reason === "push" || !!force));
        let updatedAt = cloudDocument.updatedAt;
        if (upload) updatedAt = (await uploadSyncDocument(toCloud(merged), file.id)).document.updatedAt;
        // Not uploaded: the cloud copy stays the common ancestor, so what waits here still counts as a local change.
        await complete(merged, file.id, updatedAt, local, {pushed: upload, base: upload ? merged : cloud});
    } catch (error) {
        await fail(error);
    } finally {
        await setRun({running: false, progress: false});
    }
}

/**
 * Writes the merged data locally and remembers it as the new common ancestor. `startLocal` is the local data
 * the merge started from: what changed locally since then (while downloading / uploading) is kept, and goes
 * to the cloud with the next sync.
 */
async function complete(merged: SyncSnapshot, fileId: string, lastSyncedAt: string, startLocal: SyncSnapshot, {pushed, base = merged}: { pushed?: boolean; base?: SyncSnapshot } = {}) {
    const {all, snapshot: now} = await readLocal();
    // Always merged with what is stored now: fields that stay on the computer (collapsed groups) don't count
    // as a change below, but must not go back to what they were when the sync started.
    const toWrite: SyncSnapshot = {
        ...(syncSnapshotsEqual(now, startLocal) ? merged : now),
        swaggerUi: mergeSwaggerUi(now.swaggerUi, merged.swaggerUi, startLocal.swaggerUi),
    };
    await writeLocal(toWrite, all);
    await chrome.storage.local.set({[SYNC_BASE_KEY]: base});
    const time = Date.now();
    await patchSyncConfig({fileId, lastSyncedAt, lastCheckedAt: time, ...(pushed ? {lastPushedAt: time} : {}), error: undefined, pending: undefined, conflictPageOpened: false});
}

async function fail(error: unknown) {
    if (isAuthorizationError(error)) {
        await logoutGoogleDrive();
        await patchSyncConfig({enabled: false, pending: undefined, error: "Google Drive permission was denied. You have been signed out."});
        return;
    }
    console.warn("[Cookify] Google Drive sync failed", error);
    await patchSyncConfig({error: errorText(error)});
}

/** Saves the versions chosen on the conflict page and uploads the result. */
export function resolveConflicts(resolutions: Record<string, ConflictResolution>): Promise<void> {
    return serial(async () => {
        const config = await getSyncConfig();
        const pending = config.pending;
        if (!pending) return;
        await setRun({running: true, progress: true});
        try {
            const popup = applyConflictResolutions(pending.result, resolutions);
            const {snapshot: local} = await readLocal();
            // Keep what changed on the Swagger pages since the conflicts were found.
            const swaggerUi = mergeSwaggerUi(local.swaggerUi, pending.swaggerUi, pending.localUi);
            const merged: SyncSnapshot = {...popup, swaggerUi};
            const upload = await uploadSyncDocument(toCloud(merged), pending.fileId);
            await complete(merged, upload.fileId, upload.document.updatedAt, local, {pushed: true});
        } catch (error) {
            await fail(error);
            throw error;
        } finally {
            await setRun({running: false, progress: false});
        }
    });
}
