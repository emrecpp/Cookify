export interface SyncMetadata {
    id?: string
    createdAt?: string
    updatedAt?: string
}

export interface CookieData extends SyncMetadata {
    alias: string
    name: string
    value: string
    url?: string // left panel in the chrome devtools Application page.
    domain?: string
    project?: string // For grouping by project
    order?: number // For ordering
}

export interface SwaggerData extends SyncMetadata {
    alias: string
    bearerToken: string
    project?: string // For grouping by project
    order?: number // For ordering
}

export interface Settings {
    applyOnClick: boolean
    projects: string[]
    activeProject: string | null
    updatedAt?: string
}

export const DEFAULT_SETTINGS: Settings = {
    applyOnClick: false,
    projects: [],
    activeProject: null
}

export const isCookieData = (data: CookieData | SwaggerData): data is CookieData => {
    return (data as CookieData).name !== undefined
}

export type FormType = "cookie" | "swagger"

export interface SyncSnapshot {
    cookies: CookieData[]
    swaggers: SwaggerData[]
    settings: Settings
}

export type SyncEntity = CookieData | SwaggerData
export type SyncConflictType = "cookie" | "swagger"

export interface SyncConflict {
    id: string
    key: string
    type: SyncConflictType
    local: SyncEntity | null
    cloud: SyncEntity | null
}

export type ConflictResolution = "local" | "cloud"

export interface GoogleDriveSyncStatus {
    enabled: boolean
    email?: string
    profileImageUrl?: string
    lastConnectedAt?: string
    lastSyncedAt?: string
    isSyncing: boolean
    error?: string
    conflicts: SyncConflict[]
}
