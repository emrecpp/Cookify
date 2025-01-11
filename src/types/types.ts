export interface CookieData {
    alias: string
    name: string
    value: string


    url: string // left panel in the chrome devtools Application page.
    domain: string
}

export type PageViewTypes = "list" | "settings" | "add" | "edit"