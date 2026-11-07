// Google Drive sync status and actions for the popup. The sync itself runs in the background service
// worker (lib/cloud-sync.ts); signing in stays here because it needs a user gesture.
import {SYNC_BASE_KEY, SYNC_KEY} from "@/lib/cloud-data";
import {getSyncConfig, patchSyncConfig, SYNC_RUN_KEY, SyncConfig, SyncMessage, SyncRun} from "@/lib/cloud-sync";
import {connectGoogleDrive, getCachedGoogleAccountProfile, isGoogleDriveConfigured, logoutGoogleDrive} from "@/lib/google-drive";
import {ConflictResolution, GoogleDriveSyncStatus} from "@/types/types";
import {useCallback, useEffect, useMemo, useState} from "react";

function send(message: SyncMessage): Promise<{ ok: boolean; error?: string }> {
    return chrome.runtime.sendMessage(message).catch((error) => ({ok: false, error: String(error)}));
}

export function useGoogleDriveSync({isInitialized}: { isInitialized: boolean }) {
    const [config, setConfig] = useState<SyncConfig>({enabled: false});
    const [run, setRun] = useState<SyncRun>({running: false, progress: false});
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        void getSyncConfig().then(setConfig);
        void chrome.storage.session.get(SYNC_RUN_KEY).then((r) => r[SYNC_RUN_KEY] && setRun(r[SYNC_RUN_KEY] as SyncRun)).catch(() => undefined);
        const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (area === "local" && changes[SYNC_KEY]) setConfig((changes[SYNC_KEY].newValue as SyncConfig | undefined) ?? {enabled: false});
            if (area === "session" && changes[SYNC_RUN_KEY]) setRun((changes[SYNC_RUN_KEY].newValue as SyncRun | undefined) ?? {running: false, progress: false});
        };
        chrome.storage.onChanged.addListener(onChange);
        return () => chrome.storage.onChanged.removeListener(onChange);
    }, []);

    // Opening the popup fetches what changed on other computers.
    useEffect(() => {
        if (isInitialized && config.enabled) void send({type: "cookify:sync"});
    }, [isInitialized, config.enabled]);

    useEffect(() => {
        if (!config.enabled || config.profileImageUrl) return;
        let active = true;
        void getCachedGoogleAccountProfile()
            .then((profile) => {
                if (active && (profile.email || profile.profileImageUrl)) void patchSyncConfig(profile);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [config.enabled, config.profileImageUrl]);

    const connect = useCallback(async (chooseAccount = false) => {
        setConnecting(true);
        try {
            const current = await getSyncConfig();
            const profile = await connectGoogleDrive(chooseAccount);
            const lastConnectedAt = new Date().toISOString();
            const accountChanged = !!current.email && !!profile.email && current.email !== profile.email;
            if (accountChanged) {
                // Another account: start over against its own backup.
                await chrome.storage.local.remove(SYNC_BASE_KEY);
                await chrome.storage.local.set({[SYNC_KEY]: {enabled: true, ...profile, lastConnectedAt} satisfies SyncConfig});
            } else {
                await patchSyncConfig({enabled: true, ...profile, lastConnectedAt, error: undefined});
            }
            await send({type: "cookify:sync", force: true});
        } catch (error) {
            await patchSyncConfig({error: error instanceof Error ? error.message : String(error)});
        } finally {
            setConnecting(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await logoutGoogleDrive();
        await patchSyncConfig({enabled: false, pending: undefined, error: undefined, conflictPageOpened: false});
    }, []);

    const syncNow = useCallback(async () => {
        await send({type: "cookify:sync", force: true});
    }, []);

    const resolveConflicts = useCallback(async (resolutions: Record<string, ConflictResolution>) => {
        await send({type: "cookify:sync-resolve", resolutions});
    }, []);

    const status = useMemo<GoogleDriveSyncStatus>(() => ({
        enabled: config.enabled,
        email: config.email,
        profileImageUrl: config.profileImageUrl,
        lastConnectedAt: config.lastConnectedAt,
        lastSyncedAt: config.lastCheckedAt ? new Date(config.lastCheckedAt).toISOString() : config.lastSyncedAt,
        isSyncing: connecting || run.running,
        showProgress: run.progress,
        error: config.error,
        conflicts: config.pending?.result.conflicts ?? [],
    }), [config, connecting, run]);

    return {
        status,
        isConfigured: isGoogleDriveConfigured(),
        connect,
        logout,
        syncNow,
        resolveConflicts,
    };
}
