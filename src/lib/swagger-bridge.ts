// Swagger UI preferences read and changed from the popup (the Swagger pages follow them through chrome.storage).
import {DEFAULT_PREFS, Prefs, PREFS_KEY, withDefaultPrefs} from "@/swagger-ui/state";

export async function getSwaggerUiPrefs(): Promise<Prefs> {
    try {
        const result = await chrome.storage.local.get(PREFS_KEY);
        return withDefaultPrefs(result[PREFS_KEY] as Partial<Prefs> | undefined);
    } catch {
        return DEFAULT_PREFS;
    }
}

/** Changes some preferences, keeping the others as stored. */
export async function patchSwaggerUiPrefs(patch: Partial<Prefs>): Promise<void> {
    const prefs = await getSwaggerUiPrefs();
    try {
        await chrome.storage.local.set({[PREFS_KEY]: {...prefs, ...patch}});
    } catch {
        // ignore
    }
}

export const setSwaggerUiEnabled = (enabled: boolean) => patchSwaggerUiPrefs({enabled});
