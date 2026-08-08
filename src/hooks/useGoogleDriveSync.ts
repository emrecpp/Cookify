import {
    connectGoogleDrive,
    downloadSyncDocument,
    DriveSyncDocument,
    findSyncFile,
    getCachedGoogleAccountProfile,
    isGoogleDriveConfigured,
    logoutGoogleDrive,
    uploadSyncDocument,
} from "@/lib/google-drive";
import {applyConflictResolutions, MergeResult, mergeSnapshots, normalizeSnapshot, syncSnapshotsEqual} from "@/lib/sync";
import {clearSyncConflictPageState, openSyncConflictPage} from "@/lib/sync-conflict-page";
import {
    ConflictResolution,
    GoogleDriveSyncStatus,
    SyncSnapshot,
} from "@/types/types";
import {useCallback, useEffect, useRef, useState} from "react";

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
        return raw ? JSON.parse(raw) as StoredSyncConfig : {enabled: false};
    } catch {
        return {enabled: false};
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
        showProgress: false,
        conflicts: initialConfig.current.pendingMerge?.result.conflicts || [],
    });
    const [pendingMerge, setPendingMerge] = useState<PendingMerge | null>(initialConfig.current.pendingMerge || null);
    const snapshotRef = useRef(snapshot);
    const syncingRef = useRef(false);
    const lastSyncedSignatureRef = useRef<string>();

    useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    const completeSync = useCallback((
        merged: SyncSnapshot,
        fileId: string,
        lastSyncedAt: string,
        configOverride?: StoredSyncConfig,
        expectedLocalSnapshot?: SyncSnapshot,
    ) => {
        const normalized = normalizeSnapshot(merged);
        const current = configOverride || readConfig();
        const localChangedDuringSync = expectedLocalSnapshot
            && !syncSnapshotsEqual(snapshotRef.current, expectedLocalSnapshot);
        const nextConfig: StoredSyncConfig = {
            ...current,
            enabled: true,
            fileId,
            lastSyncedAt,
            baseline: normalized,
            pendingMerge: undefined,
        };
        writeConfig(nextConfig);
        clearSyncConflictPageState();
        lastSyncedSignatureRef.current = JSON.stringify(normalized);
        // Do not let an older in-flight sync overwrite edits made while it was running.
        // The follow-up sync is scheduled when isSyncing changes back to false.
        if (!localChangedDuringSync) {
            applySnapshot(normalized);
        }
        setPendingMerge(null);
        setStatus({
            enabled: true,
            email: nextConfig.email,
            profileImageUrl: nextConfig.profileImageUrl,
            lastConnectedAt: nextConfig.lastConnectedAt,
            lastSyncedAt,
            isSyncing: false,
            showProgress: false,
            conflicts: [],
        });
    }, [applySnapshot]);

    const finishSync = useCallback(async (
        merged: SyncSnapshot,
        fileId?: string,
        configOverride?: StoredSyncConfig,
        expectedLocalSnapshot?: SyncSnapshot,
    ) => {
        if (expectedLocalSnapshot && !syncSnapshotsEqual(snapshotRef.current, expectedLocalSnapshot)) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                showProgress: false,
            }));
            return;
        }

        const normalized = normalizeSnapshot(merged);
        setStatus((previous) => ({...previous, showProgress: true}));
        const upload = await uploadSyncDocument(normalized, fileId);
        completeSync(
            normalized,
            upload.fileId,
            upload.document.updatedAt,
            configOverride,
            expectedLocalSnapshot,
        );
    }, [completeSync]);

    const performSync = useCallback(async (
        configOverride?: StoredSyncConfig,
        forceProgress = false,
    ) => {
        const config = configOverride || readConfig();
        if (!config.enabled || syncingRef.current) return;

        syncingRef.current = true;
        setStatus((previous) => ({
            ...previous,
            isSyncing: true,
            showProgress: forceProgress,
            error: undefined,
        }));
        try {
            const local = normalizeSnapshot(snapshotRef.current);
            const isInitialDownload = isSnapshotEmpty(local) && !config.baseline;
            let file = config.fileId ? {id: config.fileId} : await findSyncFile();
            let cloudDocument: DriveSyncDocument | undefined;

            if (file) {
                if (isInitialDownload) {
                    setStatus((previous) => ({...previous, showProgress: true}));
                }
                try {
                    cloudDocument = await downloadSyncDocument(file.id);
                } catch (error) {
                    if (config.fileId && getErrorMessage(error).includes("404")) {
                        file = await findSyncFile();
                        cloudDocument = file ? await downloadSyncDocument(file.id) : undefined;
                    } else {
                        throw error;
                    }
                }
            }

            if (!cloudDocument) {
                await finishSync(local, undefined, config, local);
                return;
            }

            const cloud = cloudDocument.snapshot;

            // A newer local edit arrived while the cloud document was downloading.
            // Abort this stale merge and let the normal auto-sync effect retry it.
            if (!syncSnapshotsEqual(snapshotRef.current, local)) {
                setStatus((previous) => ({
                    ...previous,
                    isSyncing: false,
                    showProgress: false,
                }));
                return;
            }

            if (isInitialDownload) {
                completeSync(cloud, file!.id, cloudDocument.updatedAt, config, local);
                return;
            }

            const result = mergeSnapshots(local, cloud, config.baseline);
            if (result.conflicts.length > 0) {
                const pending = {result, fileId: file!.id};
                setPendingMerge(pending);
                writeConfig({...config, pendingMerge: pending});
                setStatus((previous) => ({
                    ...previous,
                    isSyncing: false,
                    showProgress: false,
                    conflicts: result.conflicts,
                }));
                if (!new URLSearchParams(window.location.search).has("page")) {
                    void openSyncConflictPage();
                }
                return;
            }

            if (syncSnapshotsEqual(result.snapshot, cloud)) {
                completeSync(result.snapshot, file!.id, cloudDocument.updatedAt, config, local);
                return;
            }

            await finishSync(result.snapshot, file?.id, config, local);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                showProgress: false,
                error: getErrorMessage(error),
            }));
        } finally {
            syncingRef.current = false;
        }
    }, [completeSync, finishSync]);

    const syncNow = useCallback(
        () => performSync(undefined, true),
        [performSync],
    );

    const connect = useCallback(async (chooseAccount = false) => {
        setStatus((previous) => ({
            ...previous,
            isSyncing: true,
            showProgress: false,
            error: undefined,
        }));
        try {
            const currentConfig = readConfig();
            const profile = await connectGoogleDrive(chooseAccount);
            const lastConnectedAt = new Date().toISOString();
            const accountChanged = !!currentConfig.email
                && !!profile.email
                && currentConfig.email !== profile.email;
            const nextConfig: StoredSyncConfig = accountChanged
                ? {enabled: true, ...profile, lastConnectedAt}
                : {...currentConfig, enabled: true, ...profile, lastConnectedAt};
            writeConfig(nextConfig);
            setStatus((previous) => ({...previous, enabled: true, ...profile, lastConnectedAt}));
            await performSync(nextConfig);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                showProgress: false,
                error: getErrorMessage(error),
            }));
        }
    }, [performSync]);

    const logout = useCallback(async () => {
        await logoutGoogleDrive();
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
            showProgress: false,
            conflicts: [],
        });
    }, []);

    useEffect(() => {
        if (!status.enabled || status.profileImageUrl) return;
        let active = true;
        void getCachedGoogleAccountProfile()
            .then((profile) => {
                if (!active || (!profile.email && !profile.profileImageUrl)) return;
                const nextConfig = {...readConfig(), ...profile};
                writeConfig(nextConfig);
                setStatus((previous) => ({...previous, ...profile}));
            })
            .catch(() => undefined);
        return () => {active = false;};
    }, [status.enabled, status.profileImageUrl]);

    const resolveConflicts = useCallback(async (resolutions: Record<string, ConflictResolution>) => {
        if (!pendingMerge || syncingRef.current) return;
        syncingRef.current = true;
        setStatus((previous) => ({
            ...previous,
            isSyncing: true,
            showProgress: true,
            error: undefined,
        }));
        try {
            const resolved = applyConflictResolutions(pendingMerge.result, resolutions);
            await finishSync(resolved, pendingMerge.fileId);
        } catch (error) {
            setStatus((previous) => ({
                ...previous,
                isSyncing: false,
                showProgress: false,
                error: getErrorMessage(error),
            }));
        } finally {
            syncingRef.current = false;
        }
    }, [finishSync, pendingMerge]);

    useEffect(() => {
        if (!isInitialized || !status.enabled || status.isSyncing || status.conflicts.length > 0) return;
        if (JSON.stringify(snapshot) === lastSyncedSignatureRef.current) return;
        const timeoutId = window.setTimeout(() => void performSync(), AUTO_SYNC_DELAY_MS);
        return () => window.clearTimeout(timeoutId);
    }, [isInitialized, performSync, snapshot, status.conflicts.length, status.enabled, status.isSyncing]);

    return {
        status,
        isConfigured: isGoogleDriveConfigured(),
        connect,
        logout,
        syncNow,
        resolveConflicts,
    };
}
