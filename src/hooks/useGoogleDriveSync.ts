import {
    connectGoogleDrive,
    disconnectGoogleDrive,
    downloadSyncDocument,
    findSyncFile,
    getCachedGoogleAccountProfile,
    isGoogleDriveConfigured,
    uploadSyncDocument,
} from "@/lib/google-drive";
import { applyConflictResolutions, MergeResult, mergeSnapshots, normalizeSnapshot } from "@/lib/sync";
import { clearSyncConflictPageState, openSyncConflictPage } from "@/lib/sync-conflict-page";
import {
    ConflictResolution,
    GoogleDriveSyncStatus,
    SyncSnapshot,
} from "@/types/types";
import { useCallback, useEffect, useRef, useState } from "react";

const SYNC_CONFIG_KEY = "CookifyGoogleDriveSync";
const AUTO_SYNC_DELAY_MS = 1500;

interface StoredSyncConfig {
    enabled: boolean;
    email?: string;
    profileImageUrl?: string;
    lastConnectedAt?: string;
    fileId?: string;
    lastSyncedAt?: string;
    baseline?: SyncSnapshot;
    pendingMerge?: PendingMerge;
}

interface PendingMerge {
    result: MergeResult;
    fileId: string;
}

interface UseGoogleDriveSyncOptions {
    snapshot: SyncSnapshot;
    isInitialized: boolean;
    applySnapshot: (snapshot: SyncSnapshot) => void;
}

function readConfig(): StoredSyncConfig {
    try {
        const raw = localStorage.getItem(SYNC_CONFIG_KEY);
        return raw ? JSON.parse(raw) as StoredSyncConfig : { enabled: false };
    } catch {
        return { enabled: false };
    }
}

function writeConfig(config: StoredSyncConfig): void {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
}

function isSnapshotEmpty(snapshot: SyncSnapshot): boolean {
    return snapshot.cookies.length === 0
        && snapshot.swaggers.length === 0
        && snapshot.settings.projects.length === 0
        && !snapshot.settings.activeProject
        && !snapshot.settings.applyOnClick;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function useGoogleDriveSync({
    snapshot,
    isInitialized,
    applySnapshot,
}: UseGoogleDriveSyncOptions) {
    const initialConfig = useRef(readConfig());
    const [status, setStatus] = useState<GoogleDriveSyncStatus>({
        enabled: initialConfig.current.enabled,
        email: initialConfig.current.email,
        profileImageUrl: initialConfig.current.profileImageUrl,
        lastConnectedAt: initialConfig.current.lastConnectedAt,
        lastSyncedAt: initialConfig.current.lastSyncedAt,
        isSyncing: false,
        conflicts: initialConfig.current.pendingMerge?.result.conflicts || [],
    });
    const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(initialConfig.current.pendingMerge || null);
    const snapshotRef = useRef(snapshot);
    const syncingRef = useRef(false);
    const lastSyncedSignatureRef = useRef<string>();

    useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    const finishSync = useCallback(async (
        merged: SyncSnapshot,
        fileId?: string,
        configOverride?: StoredSyncConfig,
    ) => {
        const normalized = normalizeSnapshot(merged);
        const upload = await uploadSyncDocument(normalized, fileId);
        const lastSyncedAt = upload.document.updatedAt;
        const current = configOverride || readConfig();
        const nextConfig: StoredSyncConfig = {
            ...current,
            enabled: true,
            fileId: upload.fileId,
            lastSyncedAt,
            baseline: normalized,
            pendingMerge: undefined,
        };
        writeConfig(nextConfig);
        clearSyncConflictPageState();
        lastSyncedSignatureRef.current = JSON.stringify(normalized);
        applySnapshot(normalized);
        setPendingMerge(null);
        setStatus({
            enabled: true,
            email: nextConfig.email,
            profileImageUrl: nextConfig.profileImageUrl,
            lastConnectedAt: nextConfig.lastConnectedAt,
            lastSyncedAt,
            isSyncing: false,
            conflicts: [],
        });
    }, [applySnapshot]);

    const performSync = useCallback(async (configOverride?: StoredSyncConfig) => {
        const config = configOverride || readConfig();
        if (!config.enabled || syncingRef.current) return;

        syncingRef.current = true;
        setStatus((previous) => ({ ...previous, isSyncing: true, error: undefined }));
        try {
            const local = normalizeSnapshot(snapshotRef.current);
            let file = config.fileId ? { id: config.fileId } : await findSyncFile();
            let cloud: SyncSnapshot | undefined;

            if (file) {
                try {
                    cloud = (await downloadSyncDocument(file.id)).snapshot;
                } catch (error) {
                    if (config.fileId && getErrorMessage(error).includes("404")) {
                        file = await findSyncFile();
                        cloud = file ? (await downloadSyncDocument(file.id)).snapshot : undefined;
                    } else {
                        throw error;
                    }
                }
            }

            if (!cloud) {
                await finishSync(local, undefined, config);
                return;
            }

            if (isSnapshotEmpty(local) && !config.baseline) {
                await finishSync(cloud, file?.id, config);
                return;
            }

            const result = mergeSnapshots(local, cloud, config.baseline);
            if (result.conflicts.length > 0) {
                const pending = { result, fileId: file!.id };
                setPendingMerge(pending);
                writeConfig({ ...config, pendingMerge: pending });
                setStatus((previous) => ({
                    ...previous,
                    isSyncing: false,
                    conflicts: result.conflicts,
                }));
                if (!new URLSearchParams(window.location.search).has("page")) {
                    void openSyncConflictPage();
                }
                return;
            }

            await finishSync(result.snapshot, file?.id, config);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                error: getErrorMessage(error),
            }));
        } finally {
            syncingRef.current = false;
        }
    }, [finishSync]);

    const connect = useCallback(async (chooseAccount = false) => {
        setStatus((previous) => ({ ...previous, isSyncing: true, error: undefined }));
        try {
            const currentConfig = readConfig();
            const profile = await connectGoogleDrive(chooseAccount);
            const lastConnectedAt = new Date().toISOString();
            const accountChanged = !!currentConfig.email
                && !!profile.email
                && currentConfig.email !== profile.email;
            const nextConfig: StoredSyncConfig = accountChanged
                ? { enabled: true, ...profile, lastConnectedAt }
                : { ...currentConfig, enabled: true, ...profile, lastConnectedAt };
            writeConfig(nextConfig);
            setStatus((previous) => ({ ...previous, enabled: true, ...profile, lastConnectedAt }));
            await performSync(nextConfig);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                error: getErrorMessage(error),
            }));
        }
    }, [performSync]);

    const disconnect = useCallback(async () => {
        await disconnectGoogleDrive();
        const currentConfig = readConfig();
        const nextConfig: StoredSyncConfig = {
            ...currentConfig,
            enabled: false,
            pendingMerge: undefined,
        };
        writeConfig(nextConfig);
        clearSyncConflictPageState();
        setPendingMerge(null);
        setStatus({
            enabled: false,
            email: nextConfig.email,
            profileImageUrl: nextConfig.profileImageUrl,
            lastConnectedAt: nextConfig.lastConnectedAt,
            lastSyncedAt: nextConfig.lastSyncedAt,
            isSyncing: false,
            conflicts: [],
        });
    }, []);

    useEffect(() => {
        if (!status.enabled || status.profileImageUrl) return;
        let active = true;
        void getCachedGoogleAccountProfile()
            .then((profile) => {
                if (!active || (!profile.email && !profile.profileImageUrl)) return;
                const nextConfig = { ...readConfig(), ...profile };
                writeConfig(nextConfig);
                setStatus((previous) => ({ ...previous, ...profile }));
            })
            .catch(() => undefined);
        return () => { active = false; };
    }, [status.enabled, status.profileImageUrl]);

    const resolveConflicts = useCallback(async (resolutions: Record<string, ConflictResolution>) => {
        if (!pendingMerge || syncingRef.current) return;
        syncingRef.current = true;
        setStatus((previous) => ({ ...previous, isSyncing: true, error: undefined }));
        try {
            const resolved = applyConflictResolutions(pendingMerge.result, resolutions);
            await finishSync(resolved, pendingMerge.fileId);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                error: getErrorMessage(error),
            }));
        } finally {
            syncingRef.current = false;
        }
    }, [finishSync, pendingMerge]);

    useEffect(() => {
        if (!isInitialized || !status.enabled || status.conflicts.length > 0) return;
        if (JSON.stringify(snapshot) === lastSyncedSignatureRef.current) return;
        const timeoutId = window.setTimeout(() => void performSync(), AUTO_SYNC_DELAY_MS);
        return () => window.clearTimeout(timeoutId);
    }, [isInitialized, performSync, snapshot, status.conflicts.length, status.enabled]);

    return {
        status,
        isConfigured: isGoogleDriveConfigured(),
        connect,
        disconnect,
        syncNow: performSync,
        resolveConflicts,
    };
}
