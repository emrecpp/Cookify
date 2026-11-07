import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {pushTime, runSync, schedulePush, SyncConfig} from "./cloud-sync";
import {changeLevel, DATA_KEY, fromStorage, SYNC_BASE_KEY, SYNC_KEY} from "./cloud-data";
import {downloadSyncDocument, uploadSyncDocument} from "./google-drive";
import {SyncSnapshot} from "@/types/types";

vi.mock("./google-drive", () => ({
    downloadSyncDocument: vi.fn(),
    uploadSyncDocument: vi.fn(),
    findSyncFile: vi.fn(),
    logoutGoogleDrive: vi.fn(),
}));

const MINUTE = 60_000;
const KEY = "cookifySwaggerApi:project:r";
const settings = {applyOnClick: false, projects: [], activeProject: null, updatedAt: "2026-01-01T00:00:00.000Z"};
const popup = {cookies: [], swaggers: [], settings};
const state = (fields: Record<string, unknown> = {}) => ({favorites: ["a"], history: [], tabs: ["a"], envs: [], drafts: {}, ...fields});

/** The computer (chrome.storage + alarms) and the Drive file. */
function setup(local: Record<string, unknown>, cloud: SyncSnapshot, config: Partial<SyncConfig> = {}) {
    const data: Record<string, unknown> = {[DATA_KEY]: popup, [KEY]: state(), ...local};
    data[SYNC_KEY] = {enabled: true, fileId: "file", ...config};
    const drive = {snapshot: cloud};
    const alarms = new Map<string, number>();
    const reads: string[] = [];
    vi.stubGlobal("chrome", {
        storage: {
            local: {
                get: async (key: string | string[] | null) => {
                    const keys = key === null ? Object.keys(data) : Array.isArray(key) ? key : [key];
                    reads.push(...keys);
                    return JSON.parse(JSON.stringify(Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))));
                },
                getKeys: async () => Object.keys(data),
                set: async (values: Record<string, unknown>) => void Object.assign(data, JSON.parse(JSON.stringify(values))),
                remove: async (keys: string[]) => keys.forEach((key) => delete data[key]),
            },
            session: {set: async () => undefined},
        },
        alarms: {
            get: async (name: string) => (alarms.has(name) ? {name, scheduledTime: alarms.get(name)} : undefined),
            create: async (name: string, {when}: { when: number }) => void alarms.set(name, when),
            clear: async (name: string) => alarms.delete(name),
        },
    });
    vi.mocked(downloadSyncDocument).mockImplementation(async () => ({name: "cookify", version: 3, updatedAt: "2026-01-01T00:00:00.000Z", snapshot: drive.snapshot}));
    vi.mocked(uploadSyncDocument).mockImplementation(async (snapshot, fileId) => {
        drive.snapshot = JSON.parse(JSON.stringify(snapshot));
        return {fileId: fileId!, document: {name: "cookify", version: 3, updatedAt: "2026-01-01T00:00:00.000Z", snapshot}};
    });
    return {data, drive, alarms, reads};
}

/** What is on the computer as a snapshot, with these changes to the API state. */
const snapshotOf = (fields: Record<string, unknown> = {}) => fromStorage({[DATA_KEY]: popup, [KEY]: state(fields)});
const same = snapshotOf();

describe("how much a change matters", () => {
    it("tells what can wait from what can't", () => {
        expect(changeLevel(snapshotOf({collapsed: ["x"]}), same)).toBe("none");
        expect(changeLevel(snapshotOf({tabs: ["b"], active: "b"}), same)).toBe("minor");
        expect(changeLevel(snapshotOf({drafts: {a: {params: {id: "1"}}}}), same)).toBe("minor");
        expect(changeLevel(snapshotOf({history: [{key: "a", at: 1}]}), same)).toBe("minor");
        expect(changeLevel(snapshotOf({favorites: ["a", "b"]}), same)).toBe("important");
        expect(changeLevel(snapshotOf({envs: [{id: "dev", token: "t"}]}), same)).toBe("important");
    });

    it("picks the time of the upload", () => {
        expect(pushTime("important", false, 1000)).toBe(1000 + MINUTE);
        expect(pushTime("minor", false, 1000)).toBe(1000 + 15 * MINUTE);
        expect(pushTime("minor", true, 10 * MINUTE, 0)).toBe(10 * MINUTE);
        expect(pushTime("minor", true, 10 * MINUTE, 9 * MINUTE)).toBe(14 * MINUTE);
    });
});

describe("sync requests", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(100 * MINUTE);
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("keeps the time of the first change, so working on doesn't postpone the upload", async () => {
        const {alarms} = setup({[KEY]: state({tabs: ["b"]}), [SYNC_BASE_KEY]: same}, same);
        await schedulePush();
        const first = alarms.get("cookify-push");
        expect(first).toBe(Date.now() + 15 * MINUTE);
        vi.setSystemTime(105 * MINUTE);
        await schedulePush();
        expect(alarms.get("cookify-push")).toBe(first);
    });

    it("brings an important change closer, and a waiting minor one goes with it", async () => {
        const {data, alarms, drive} = setup({[KEY]: state({tabs: ["b"]}), [SYNC_BASE_KEY]: same}, same);
        await schedulePush();
        data[KEY] = state({tabs: ["b"], favorites: ["a", "f"]});
        await schedulePush();
        expect(alarms.get("cookify-push")).toBe(Date.now() + MINUTE);
        await runSync({reason: "push"});
        expect(uploadSyncDocument).toHaveBeenCalledTimes(1);
        expect(drive.snapshot.swaggerUi!.states["project:r"]).toMatchObject({tabs: ["b"], favorites: ["a", "f"]});
        expect(alarms.has("cookify-push")).toBe(false);
    });

    it("uploads when leaving a page, at most every 5 minutes", async () => {
        setup({[KEY]: state({tabs: ["b"]}), [SYNC_BASE_KEY]: same}, same, {lastPushedAt: 90 * MINUTE});
        await schedulePush(true);
        expect(uploadSyncDocument).toHaveBeenCalledTimes(1);

        vi.setSystemTime(101 * MINUTE);
        const {alarms} = setup({[KEY]: state({tabs: ["c"]}), [SYNC_BASE_KEY]: same}, same, {lastPushedAt: 100 * MINUTE});
        await schedulePush(true);
        expect(uploadSyncDocument).toHaveBeenCalledTimes(1);
        expect(alarms.get("cookify-push")).toBe(105 * MINUTE);
    });

    it("downloads at most every 2 minutes", async () => {
        setup({[SYNC_BASE_KEY]: same}, same);
        await runSync({reason: "pull"});
        await runSync({reason: "pull"});
        vi.setSystemTime(101 * MINUTE);
        await runSync({reason: "pull"});
        expect(downloadSyncDocument).toHaveBeenCalledTimes(1);
        vi.setSystemTime(103 * MINUTE);
        await runSync({reason: "pull"});
        expect(downloadSyncDocument).toHaveBeenCalledTimes(2);
        expect(uploadSyncDocument).not.toHaveBeenCalled();
    });

    it("never reads the spec cache (megabytes) while syncing", async () => {
        const {drive, reads} = setup({[KEY]: state({tabs: ["b"]}), [SYNC_BASE_KEY]: same, "cookifySpecCache:http://x/docs": {text: "{}"}}, same);
        await runSync({reason: "pull", force: true});
        expect(drive.snapshot.swaggerUi!.states["project:r"]).toMatchObject({tabs: ["b"]});
        expect(reads.some((key) => key.startsWith("cookifySpecCache:"))).toBe(false);
    });

    it("Sync now doesn't wait for anything", async () => {
        const {drive} = setup({[KEY]: state({tabs: ["b"]}), [SYNC_BASE_KEY]: same}, same, {lastCheckedAt: Date.now()});
        await runSync({reason: "pull", force: true});
        expect(drive.snapshot.swaggerUi!.states["project:r"]).toMatchObject({tabs: ["b"]});
    });

    it("a download doesn't upload minor changes, and doesn't lose them or the cloud's", async () => {
        const cloud = snapshotOf({favorites: ["a", "cloud"]});
        const {data, drive, alarms} = setup({[KEY]: state({drafts: {a: {params: {id: "7"}}}}), [SYNC_BASE_KEY]: same}, cloud);
        await runSync({reason: "pull"});
        expect(uploadSyncDocument).not.toHaveBeenCalled();
        expect(data[KEY]).toMatchObject({favorites: ["a", "cloud"], drafts: {a: {params: {id: "7"}}}});
        expect(alarms.get("cookify-push")).toBe(Date.now() + 15 * MINUTE);

        // The draft is still a local change for the next sync, and the favorite isn't taken for a removal.
        vi.setSystemTime(116 * MINUTE);
        await runSync({reason: "push"});
        expect(uploadSyncDocument).toHaveBeenCalledTimes(1);
        expect(drive.snapshot.swaggerUi!.states["project:r"]).toMatchObject({favorites: ["a", "cloud"], drafts: {a: {params: {id: "7"}}}});
        expect(alarms.has("cookify-push")).toBe(false);
    });

    it("sends nothing while nothing changed, and nothing when sync is off", async () => {
        const {alarms} = setup({[SYNC_BASE_KEY]: same}, same);
        await schedulePush();
        await runSync({reason: "push"});
        expect(alarms.size).toBe(0);
        expect(downloadSyncDocument).not.toHaveBeenCalled();

        setup({[KEY]: state({favorites: []}), [SYNC_BASE_KEY]: same}, same, {enabled: false});
        await schedulePush(true);
        await runSync({reason: "pull"});
        expect(downloadSyncDocument).not.toHaveBeenCalled();
    });
});
