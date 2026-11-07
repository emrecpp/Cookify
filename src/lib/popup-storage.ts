// Popup data moved from the popup's localStorage to chrome.storage.local, where the background service
// worker (Google Drive sync) and the Swagger pages can read it. This moves it once.
import {DATA_KEY, PopupData, SYNC_BASE_KEY, SYNC_KEY} from "@/lib/cloud-data";
import {SyncConfig} from "@/lib/cloud-sync";
import {migrateWebAuthSelection} from "@/lib/google-drive";
import {TOKENS_KEY} from "@/swagger-ui/state";

const LEGACY_DATA_KEY = "Cookify";
const LEGACY_PROJECT_KEY = "cookify_selected_global_project";
const LEGACY_SYNC_KEY = "CookifyGoogleDriveSync";
const LEGACY_CONFLICT_PAGE_KEY = "CookifySyncConflictPageOpened";

function readJson<T>(key: string): T | undefined {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : undefined;
    } catch {
        return undefined;
    }
}

export async function loadPopupData(): Promise<PopupData> {
    const stored = await chrome.storage.local.get([DATA_KEY, SYNC_KEY]);
    const updates: Record<string, unknown> = {};
    const moved: string[] = [];

    let data = stored[DATA_KEY] as PopupData | undefined;
    if (!data) {
        data = readJson<PopupData>(LEGACY_DATA_KEY) ?? {};
        const project = localStorage.getItem(LEGACY_PROJECT_KEY);
        if (project && !(data.settings && "activeProject" in data.settings)) data = {...data, settings: {...data.settings, activeProject: project}};
        updates[DATA_KEY] = data;
        moved.push(LEGACY_DATA_KEY, LEGACY_PROJECT_KEY);
    }

    if (!stored[SYNC_KEY]) {
        const legacy = readJson<SyncConfig & { baseline?: unknown; pendingMerge?: SyncConfig["pending"] }>(LEGACY_SYNC_KEY);
        if (legacy) {
            const {baseline, pendingMerge, ...config} = legacy;
            updates[SYNC_KEY] = {...config, pending: pendingMerge, conflictPageOpened: localStorage.getItem(LEGACY_CONFLICT_PAGE_KEY) === "true"} satisfies SyncConfig;
            if (baseline) updates[SYNC_BASE_KEY] = baseline;
            moved.push(LEGACY_SYNC_KEY, LEGACY_CONFLICT_PAGE_KEY);
        }
    }

    await migrateWebAuthSelection();
    if (Object.keys(updates).length) {
        await chrome.storage.local.set(updates);
        // The Swagger pages read the popup data directly now; drop the copy they used before.
        await chrome.storage.local.remove(TOKENS_KEY);
        moved.forEach((key) => localStorage.removeItem(key));
    }
    return data;
}

export async function savePopupData(data: PopupData): Promise<void> {
    await chrome.storage.local.set({[DATA_KEY]: data});
}
