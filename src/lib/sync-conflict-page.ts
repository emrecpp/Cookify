export function isSyncConflictPage(): boolean {
    return new URLSearchParams(window.location.search).get("page") === "sync-conflicts";
}

export async function openSyncConflictPage(): Promise<void> {
    await chrome.tabs.create({
        url: chrome.runtime.getURL("index.html?page=sync-conflicts"),
        active: true,
    });
}
