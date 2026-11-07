// "Apply" on a saved cookie: sets it in the browser for the active tab's site (or the url / domain saved with it).
import {Button} from "@/components/ui/button.tsx";
import {getTabInfo, TabInfo} from "@/lib/utils.ts";
import {CookieData} from "@/types/types.ts";
import {RefreshCw} from "lucide-react";
import toast from "react-hot-toast";

const LOCAL_DOMAINS = ["localhost", "127.0.0.1"];
const COOKIE_DAYS = 30;

/** What chrome.cookies.set gets for `cookie` on the tab `tab`. */
export function cookieDetails(cookie: CookieData, tab: Pick<TabInfo, "url" | "domain">, now = Date.now()): chrome.cookies.SetDetails {
    const domain = cookie.domain || tab.domain;
    let url = tab.url;
    if (cookie.url) {
        // "https://example.com" as typed in the form, or "example.com" (https, or http for local addresses)
        const scheme = LOCAL_DOMAINS.includes(domain) ? "http" : "https";
        try {
            url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(cookie.url) ? cookie.url : `${scheme}://${cookie.url}`);
        } catch {
            // keep the tab's address
        }
    }
    const secure = url.protocol === "https:";
    return {
        url: url.origin,
        domain,
        name: cookie.name,
        value: cookie.value,
        expirationDate: Math.floor(now / 1000) + COOKIE_DAYS * 24 * 60 * 60,
        secure,
        path: "/",
        sameSite: secure ? "strict" : "lax",
    };
}

function appliedToast(tab: chrome.tabs.Tab) {
    toast.success((t) => (
        <div className="flex flex-col items-center justify-center gap-1">
            <p className="text-gray-800">Cookie applied successfully!</p>
            <Button
                onClick={() => {
                    if (tab.id !== undefined) void chrome.tabs.reload(tab.id);
                    toast.dismiss(t.id);
                    window.close(); // the popup isn't needed any more
                }}
                className="text-sm h-8"
            >
                <RefreshCw className="w-4 h-4 animate-spin duration-1500"/>
                Refresh the page
            </Button>
        </div>
    ), {duration: 2500});
}

export async function applyCookie(cookie: CookieData): Promise<void> {
    try {
        const tab = await getTabInfo();
        const details = cookieDetails(cookie, tab);
        // Refused for this url / domain: the callback API gave null, the promise API rejects.
        const set = await chrome.cookies.set(details).catch((error: unknown) => {
            console.warn("Cookie not accepted:", (error as Error)?.message ?? error);
            return null;
        });
        if (set) {
            appliedToast(tab.tab);
            return;
        }
        // Not accepted for this domain: try localhost (handy while developing).
        if (details.domain !== "localhost") {
            await applyCookie({...cookie, domain: "localhost"});
            return;
        }
        toast.error("Failed to set cookie!");
    } catch (error) {
        console.error("Error applying the cookie:", (error as Error).message);
        toast.error((error as Error).message);
    }
}
