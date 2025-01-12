import {CookieData} from "@/types/types.ts";
import toast from "react-hot-toast";

const getTabInfo = async () => {
    return new Promise<{ protocol: string, domain: string }>((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length === 0) {
                reject(new Error("No active tab found!"));
                return;
            }

            const url = new URL(tabs[0].url);
            resolve({
                protocol: url.protocol,
                domain: url.hostname,
                url: url,
                tabs
            });
        });
    });
};

export const createSetCookieConfig = (baseConfig: {
    name: string,
    protocol: string,
    url: URL | string,
    targetDomain: string,
    value: string
}) => {
    const {name, protocol, targetDomain, url, value,} = baseConfig;

    const isLocalHost = ["localhost", "127.0.0.1"].includes(targetDomain);
    const schema = isLocalHost ? "http://" : "https://";

    return {
        url: url instanceof URL ? url.origin : (schema + url),
        // url: `${protocol}//${targetDomain}`,
        domain: targetDomain,
        name,
        value,
        expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        secure: protocol === "https:",
        path: "/",
        sameSite: protocol === 'https:' ? "strict" : "lax"
    };
};

export const createRemoveCookieConfig = (baseConfig: {
    name: string,
    protocol: string,
    targetDomain: string
}) => {
    const {name, protocol, targetDomain} = baseConfig;

    return {
        url: `${protocol}//${targetDomain}`,
        name
    };
};

export const handleApplyCookie = async (cookie: CookieData) => {
    try {
        const {protocol, domain, url, tabs} = await getTabInfo();
        const targetDomain = cookie.domain || domain;


        const cookieConfig = createSetCookieConfig({
            name: cookie.name,
            value: cookie.value,
            url: cookie.url || url,
            protocol,
            targetDomain,
        });

        chrome.cookies.set(cookieConfig, (result) => {
            if (result) {
                console.log("Cookie set successfully:", result);
                toast.success("Cookie applied successfully!");
            } else {
                console.error("Failed to set cookie:", chrome.runtime.lastError);
                toast.error("Failed to set cookie!");
            }
        });


    } catch (error) {
        console.error("Error in handleApplyCookie:", error);
        toast.error(error.message);
    }
};

export const handleRemoveCookie = async (cookie: CookieData) => {
    try {
        const {protocol, domain} = await getTabInfo();
        const targetDomain = cookie.domain || domain;


        const cookieConfig = createRemoveCookieConfig({
            name: cookie.name,
            protocol,
            targetDomain
        });

        chrome.cookies.remove(cookieConfig, (details) => {
            if (details) {
                console.log("Cookie removed successfully:", details);
                toast.success("Cookie removed successfully!");
            } else {
                console.error("Failed to remove cookie:", chrome.runtime.lastError);
                toast.error("Failed to remove cookie!");
            }
        });
    } catch (error) {
        console.error("Error in handleRemoveCookie:", error);
        toast.error(error.message);
    }
};