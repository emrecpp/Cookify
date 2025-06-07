export interface CookieData {
    alias: string
    name: string
    value: string
    url?: string // left panel in the chrome devtools Application page.
    domain?: string
    project?: string // For grouping by project
    order?: number // For ordering
}

export interface SwaggerData {
    alias: string
    bearerToken: string
    project?: string // For grouping by project
    order?: number // For ordering
}

export interface Settings {
    applyOnClick: boolean
    projects: string[]
}

export const DEFAULT_SETTINGS: Settings = {
    applyOnClick: false,
    projects: []
}

export const isCookieData = (data: CookieData | SwaggerData): data is CookieData => {
    return (data as CookieData).name !== undefined
}

export type FormType = "cookie" | "swagger"