// One theme for all of Cookify: the popup and the Swagger view share the Swagger view's preference
// (dark until the user picks light in either of them).
import {patchSwaggerUiPrefs} from "@/lib/swagger-bridge";
import {DEFAULT_PREFS, Prefs, PREFS_KEY, Theme} from "@/swagger-ui/state";
import {useEffect, useState} from "react";

let current: Theme = DEFAULT_PREFS.theme;
const listeners = new Set<(theme: Theme) => void>();

function apply(theme: Theme) {
    current = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    listeners.forEach((listener) => listener(theme));
}

const themeOf = (prefs?: Partial<Prefs>): Theme => (prefs?.theme === "light" ? "light" : "dark");

/** Applies the saved theme and follows changes made in the Swagger view. */
export function initTheme() {
    apply(current);
    try {
        void chrome.storage.local.get(PREFS_KEY).then((result) => apply(themeOf(result[PREFS_KEY] as Partial<Prefs> | undefined)));
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local" && changes[PREFS_KEY]) apply(themeOf(changes[PREFS_KEY].newValue as Partial<Prefs> | undefined));
        });
    } catch {
        // outside the extension (vite preview): stay dark
    }
}

export async function setTheme(theme: Theme) {
    apply(theme);
    await patchSwaggerUiPrefs({theme});
}

export function useTheme(): [Theme, (theme: Theme) => void] {
    const [theme, setState] = useState(current);
    useEffect(() => {
        listeners.add(setState);
        setState(current);
        return () => void listeners.delete(setState);
    }, []);
    return [theme, (next) => void setTheme(next)];
}
