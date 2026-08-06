import {
    ConflictResolution,
    CookieData,
    Settings,
    SwaggerData,
    SyncConflict,
    SyncEntity,
    SyncSnapshot,
} from "@/types/types";

export interface MergeResult {
    snapshot: SyncSnapshot;
    conflicts: SyncConflict[];
}

const now = () => new Date().toISOString();

const createId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const validDate = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? value : undefined;

export function normalizeCookie(cookie: CookieData, timestamp = now()): CookieData {
    return {
        ...cookie,
        id: cookie.id || createId(),
        createdAt: validDate(cookie.createdAt) || timestamp,
        updatedAt: validDate(cookie.updatedAt) || validDate(cookie.createdAt) || timestamp,
    };
}

export function normalizeSwagger(swagger: SwaggerData, timestamp = now()): SwaggerData {
    return {
        ...swagger,
        id: swagger.id || createId(),
        createdAt: validDate(swagger.createdAt) || timestamp,
        updatedAt: validDate(swagger.updatedAt) || validDate(swagger.createdAt) || timestamp,
    };
}

export function normalizeSnapshot(snapshot: Partial<SyncSnapshot>): SyncSnapshot {
    const timestamp = now();
    return {
        cookies: (snapshot.cookies || []).map((item) => normalizeCookie(item, timestamp)),
        swaggers: (snapshot.swaggers || []).map((item) => normalizeSwagger(item, timestamp)),
        settings: {
            applyOnClick: snapshot.settings?.applyOnClick ?? false,
            projects: [...new Set(snapshot.settings?.projects || [])],
            activeProject: typeof snapshot.settings?.activeProject === "string"
                ? snapshot.settings.activeProject
                : null,
            updatedAt: validDate(snapshot.settings?.updatedAt) || timestamp,
        },
    };
}

export function cookieSyncKey(cookie: CookieData): string {
    const location = (cookie.domain || cookie.url || "").trim().toLowerCase();
    return [cookie.project, cookie.alias, cookie.name, location]
        .map((value) => (value || "").trim().toLowerCase())
        .join("\u001f");
}

export function swaggerSyncKey(swagger: SwaggerData): string {
    return [swagger.project, swagger.alias]
        .map((value) => (value || "").trim().toLowerCase())
        .join("\u001f");
}

const cookieContent = (cookie: CookieData) => JSON.stringify({
    alias: cookie.alias,
    name: cookie.name,
    value: cookie.value,
    url: cookie.url || "",
    domain: cookie.domain || "",
    project: cookie.project || "",
    order: cookie.order,
});

const swaggerContent = (swagger: SwaggerData) => JSON.stringify({
    alias: swagger.alias,
    bearerToken: swagger.bearerToken,
    project: swagger.project || "",
    order: swagger.order,
});

function canonicalSnapshot(snapshot: SyncSnapshot) {
    const normalized = normalizeSnapshot(snapshot);
    return {
        cookies: normalized.cookies
            .map((cookie) => ({
                id: cookie.id,
                alias: cookie.alias,
                name: cookie.name,
                value: cookie.value,
                url: cookie.url || "",
                domain: cookie.domain || "",
                project: cookie.project || "",
                order: cookie.order,
                createdAt: cookie.createdAt,
                updatedAt: cookie.updatedAt,
            }))
            .sort((left, right) => (left.id || "").localeCompare(right.id || "")),
        swaggers: normalized.swaggers
            .map((swagger) => ({
                id: swagger.id,
                alias: swagger.alias,
                bearerToken: swagger.bearerToken,
                project: swagger.project || "",
                order: swagger.order,
                createdAt: swagger.createdAt,
                updatedAt: swagger.updatedAt,
            }))
            .sort((left, right) => (left.id || "").localeCompare(right.id || "")),
        settings: {
            applyOnClick: normalized.settings.applyOnClick,
            projects: [...normalized.settings.projects].sort(),
            activeProject: normalized.settings.activeProject,
            updatedAt: normalized.settings.updatedAt,
        },
    };
}

export function syncSnapshotsEqual(left: SyncSnapshot, right: SyncSnapshot): boolean {
    return JSON.stringify(canonicalSnapshot(left)) === JSON.stringify(canonicalSnapshot(right));
}

function prepareChangedItems<T extends SyncEntity>(
    items: T[],
    previousItems: T[],
    normalize: (item: T, timestamp?: string) => T,
    contentOf: (item: T) => string,
): T[] {
    const timestamp = now();
    return items.map((item) => {
        const previous = item.id
            ? previousItems.find((candidate) => candidate.id === item.id)
            : undefined;
        const normalized = normalize(item, timestamp);
        if (!previous) return normalized;
        if (contentOf(previous) === contentOf(normalized)) {
            return {
                ...normalized,
                id: previous.id,
                createdAt: previous.createdAt,
                updatedAt: previous.updatedAt,
            };
        }
        return {
            ...normalized,
            id: previous.id,
            createdAt: previous.createdAt,
            updatedAt: timestamp,
        };
    });
}

export function prepareCookiesForSave(items: CookieData[], previousItems: CookieData[]): CookieData[] {
    return prepareChangedItems(items, previousItems, normalizeCookie, cookieContent);
}

export function prepareSwaggersForSave(items: SwaggerData[], previousItems: SwaggerData[]): SwaggerData[] {
    return prepareChangedItems(items, previousItems, normalizeSwagger, swaggerContent);
}

const updatedTime = (entity: SyncEntity | undefined) => Date.parse(entity?.updatedAt || "") || 0;

function mergeEqualEntities<T extends SyncEntity>(local: T, cloud: T): T {
    const newer = updatedTime(cloud) > updatedTime(local) ? cloud : local;
    return {
        ...newer,
        id: local.id || cloud.id,
        createdAt: [local.createdAt, cloud.createdAt].filter(Boolean).sort()[0],
        updatedAt: [local.updatedAt, cloud.updatedAt].filter(Boolean).sort().at(-1),
    } as T;
}

function mergeCollection<T extends SyncEntity>(
    type: "cookie" | "swagger",
    localItems: T[],
    cloudItems: T[],
    baselineItems: T[],
    keyOf: (item: T) => string,
    contentOf: (item: T) => string,
): { items: T[]; conflicts: SyncConflict[] } {
    const localByKey = new Map(localItems.map((item) => [keyOf(item), item]));
    const cloudByKey = new Map(cloudItems.map((item) => [keyOf(item), item]));
    const baselineByKey = new Map(baselineItems.map((item) => [keyOf(item), item]));
    const keys = new Set([...localByKey.keys(), ...cloudByKey.keys(), ...baselineByKey.keys()]);
    const items: T[] = [];
    const conflicts: SyncConflict[] = [];

    for (const key of keys) {
        const local = localByKey.get(key);
        const cloud = cloudByKey.get(key);
        const baseline = baselineByKey.get(key);

        if (local && cloud) {
            if (contentOf(local) === contentOf(cloud)) {
                items.push(mergeEqualEntities(local, cloud));
                continue;
            }

            const localMatchesBaseline = !!baseline && contentOf(local) === contentOf(baseline);
            const cloudMatchesBaseline = !!baseline && contentOf(cloud) === contentOf(baseline);
            if (localMatchesBaseline && !cloudMatchesBaseline) {
                items.push(cloud);
                continue;
            }
            if (cloudMatchesBaseline && !localMatchesBaseline) {
                items.push(local);
                continue;
            }
        } else if (local || cloud) {
            const existing = local || cloud;
            if (!baseline) {
                items.push(existing as T);
                continue;
            }

            if (existing && contentOf(existing) === contentOf(baseline)) {
                // The missing side deleted an unchanged item.
                continue;
            }
        } else {
            continue;
        }

        conflicts.push({
            id: `${type}:${key}`,
            key,
            type,
            local: local || null,
            cloud: cloud || null,
        });
    }

    return { items, conflicts };
}

function mergeSettings(local: Settings, cloud: Settings, baseline?: Settings): Settings {
    let applyOnClick: boolean;
    if (local.applyOnClick === cloud.applyOnClick) {
        applyOnClick = local.applyOnClick;
    } else if (baseline && local.applyOnClick === baseline.applyOnClick) {
        applyOnClick = cloud.applyOnClick;
    } else if (baseline && cloud.applyOnClick === baseline.applyOnClick) {
        applyOnClick = local.applyOnClick;
    } else {
        applyOnClick = Date.parse(cloud.updatedAt || "") > Date.parse(local.updatedAt || "")
            ? cloud.applyOnClick
            : local.applyOnClick;
    }

    let activeProject: string | null;
    if (local.activeProject === cloud.activeProject) {
        activeProject = local.activeProject;
    } else if (baseline && local.activeProject === baseline.activeProject) {
        activeProject = cloud.activeProject;
    } else if (baseline && cloud.activeProject === baseline.activeProject) {
        activeProject = local.activeProject;
    } else {
        activeProject = Date.parse(cloud.updatedAt || "") > Date.parse(local.updatedAt || "")
            ? cloud.activeProject
            : local.activeProject;
    }

    return {
        applyOnClick,
        projects: [...new Set([...local.projects, ...cloud.projects])],
        activeProject,
        updatedAt: [local.updatedAt, cloud.updatedAt].filter(Boolean).sort().at(-1) || now(),
    };
}

export function mergeSnapshots(
    localInput: Partial<SyncSnapshot>,
    cloudInput: Partial<SyncSnapshot>,
    baselineInput?: Partial<SyncSnapshot>,
): MergeResult {
    const local = normalizeSnapshot(localInput);
    const cloud = normalizeSnapshot(cloudInput);
    const baseline = baselineInput ? normalizeSnapshot(baselineInput) : undefined;

    const cookies = mergeCollection(
        "cookie",
        local.cookies,
        cloud.cookies,
        baseline?.cookies || [],
        cookieSyncKey,
        cookieContent,
    );
    const swaggers = mergeCollection(
        "swagger",
        local.swaggers,
        cloud.swaggers,
        baseline?.swaggers || [],
        swaggerSyncKey,
        swaggerContent,
    );

    return {
        snapshot: {
            cookies: cookies.items,
            swaggers: swaggers.items,
            settings: mergeSettings(local.settings, cloud.settings, baseline?.settings),
        },
        conflicts: [...cookies.conflicts, ...swaggers.conflicts],
    };
}

export function applyConflictResolutions(
    result: MergeResult,
    resolutions: Record<string, ConflictResolution>,
): SyncSnapshot {
    const snapshot = normalizeSnapshot(result.snapshot);

    for (const conflict of result.conflicts) {
        const resolution = resolutions[conflict.id];
        if (!resolution) {
            throw new Error("Every conflict must be resolved before syncing.");
        }
        const selected = conflict[resolution];
        if (!selected) continue;

        if (conflict.type === "cookie") {
            snapshot.cookies.push(selected as CookieData);
        } else {
            snapshot.swaggers.push(selected as SwaggerData);
        }
    }

    return normalizeSnapshot(snapshot);
}
