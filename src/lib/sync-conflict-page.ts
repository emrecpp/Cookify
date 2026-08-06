const CONFLICT_PAGE_OPEN_KEY = "CookifySyncConflictPageOpened";

export function isSyncConflictPage(): boolean {
    return new URLSearchParams(window.location.search).get("page") === "sync-conflicts";
}

export async function openSyncConflictPage(force = false): Promise<void> {
    if (!force && localStorage.getItem(CONFLICT_PAGE_OPEN_KEY) === "true") return;
    localStorage.setItem(CONFLICT_PAGE_OPEN_KEY, "true");
    await chrome.tabs.create({
        url: chrome.runtime.getURL("index.html?page=sync-conflicts"),
        active: true,
    });
}

export function clearSyncConflictPageState(): void {
    localStorage.removeItem(CONFLICT_PAGE_OPEN_KEY);
}
