// Cookify background service worker.
// - Syncs Cookify data with Google Drive (lib/cloud-sync.ts): collects local changes, checks periodically and on request.
// - Registers the Swagger guard (public/swagger-guard.js) as a document_start content script.
//   It has to be a plain, unbundled script so it runs before the page parser reaches Swagger's
//   <script> tags, which manifest content scripts built by crxjs (dynamic import loaders) can't guarantee.
// - Proxies requests from the Swagger UI content script so that cross-origin API servers work
//   without CORS restrictions (the extension has host permissions for all urls; see lib/proxy.ts).

import {isSyncedKey} from "@/lib/cloud-data";
import {PUSH_ALARM, resolveConflicts, runSync, schedulePush, SYNC_RUN_KEY, SyncMessage} from "@/lib/cloud-sync";
import {serveProxyRequests} from "@/lib/proxy";

const GUARD_ID = "cookify-swagger-guard";

/** Same pages as the Swagger UI content scripts (dev builds limit them to API docs pages, see vite.config.ts). */
function guardMatches(): string[] {
    const matches = [...new Set((chrome.runtime.getManifest().content_scripts ?? []).flatMap((script) => script.matches ?? []))];
    return !matches.length || matches.includes("<all_urls>") ? ["<all_urls>"] : matches;
}

async function registerSwaggerGuard() {
    try {
        const script = {id: GUARD_ID, js: ["swagger-guard.js"], matches: guardMatches(), runAt: "document_start" as const, allFrames: false};
        // Re-register from scratch so Chrome re-reads the file after an extension update.
        const existing = await chrome.scripting.getRegisteredContentScripts({ids: [GUARD_ID]});
        if (existing.length) await chrome.scripting.unregisterContentScripts({ids: [GUARD_ID]});
        await chrome.scripting.registerContentScripts([script]);
    } catch (error) {
        console.warn("[Cookify] Could not register the Swagger guard", error);
    }
}

chrome.runtime.onInstalled.addListener(() => void registerSwaggerGuard());
chrome.runtime.onStartup.addListener(() => void registerSwaggerGuard());
void registerSwaggerGuard();

serveProxyRequests();

// ---------------------------------------------------------------------------
// Google Drive sync

const SYNC_ALARM = "cookify-sync";
// A sync cut off by a service worker restart must not leave the popup showing "Syncing…".
void chrome.storage.session.set({[SYNC_RUN_KEY]: {running: false, progress: false}});
const PULL_MINUTES = 30;
/** Pages save every few hundred ms while typing: plan the upload once they pause. */
const PLAN_DELAY_MS = 2000;
let planTimer: ReturnType<typeof setTimeout> | undefined;

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !Object.keys(changes).some(isSyncedKey)) return;
    clearTimeout(planTimer);
    planTimer = setTimeout(() => void schedulePush(), PLAN_DELAY_MS);
});

// Created once: creating it again on every service worker start would restart its period.
void chrome.alarms.get(SYNC_ALARM).then((alarm) => {
    if (alarm?.periodInMinutes !== PULL_MINUTES) void chrome.alarms.create(SYNC_ALARM, {periodInMinutes: PULL_MINUTES});
});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) void runSync({reason: "pull"});
    if (alarm.name === PUSH_ALARM) void runSync({reason: "push"});
});
chrome.runtime.onStartup.addListener(() => void runSync({reason: "pull"}));

/** The popup and the sync conflict page; content scripts (any web page) only ask for a sync. */
const fromExtensionPage = (sender: chrome.runtime.MessageSender) => sender.id === chrome.runtime.id && !!sender.url?.startsWith(chrome.runtime.getURL(""));

chrome.runtime.onMessage.addListener((message: SyncMessage, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message?.type === "cookify:sync") {
        runSync({reason: "pull", force: message.force}).then(() => sendResponse({ok: true}), (error) => sendResponse({ok: false, error: String(error)}));
        return true;
    }
    if (message?.type === "cookify:leaving") {
        void schedulePush(true);
        return false;
    }
    if (message?.type === "cookify:sync-resolve" && fromExtensionPage(sender)) {
        resolveConflicts(message.resolutions).then(() => sendResponse({ok: true}), (error) => sendResponse({ok: false, error: String(error)}));
        return true;
    }
    return false;
});
