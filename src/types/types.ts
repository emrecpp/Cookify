export type PageViewTypes =
    "list-cookies"
    | "list-swaggers"
    | "settings"
    | "add-cookie"
    | "edit-cookie"
    | "add-swagger"
    | "edit-swagger"
export type ActivePages = "cookies" | "swaggers" | "others"

export function activePage(currentView: PageViewTypes): ActivePages {
    if (["list-cookies"].includes(currentView))
        return "cookies"
    else if (["list-swaggers"].includes(currentView))
        return "swaggers"
    else
        return "others"
}

export interface CookieData {
    alias: string
    name: string
    value: string
    url: string // left panel in the chrome devtools Application page.
    domain: string
    project?: string // Projeye göre gruplamak için
    order?: number // Sıralama için
}

export interface SwaggerData {
    alias: string
    urls: string[]
    bearerToken: string
    autoLogin?: "true" | "false"
    project?: string // Projeye göre gruplamak için
    order?: number // Sıralama için
}

export const isCookieData = (data: CookieData | SwaggerData): data is CookieData => {
    return (data as CookieData).name !== undefined
}