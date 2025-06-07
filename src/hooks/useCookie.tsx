import {CookieData} from "@/types/types.ts";
import toast from "react-hot-toast";
import {getTabInfo} from "@/lib/utils.ts";
import {Button} from "@/components/ui/button.tsx";
import {RefreshCw} from "lucide-react";


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

export const useApplyCookie = async (cookie: CookieData) => {
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
                // console.log("Cookie set successfully:", result);
                // toast.success("Cookie applied successfully!");

                toast.success((t) => (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <p className="text-gray-800">Cookie applied successfully!</p>
                        <Button
                            onClick={() => {
                                if (tabs.length > 0) {
                                    const tab = tabs[0];
                                    chrome.tabs.reload(tab.id);
                                }
                                toast.dismiss(t.id);

                                if (window.close) // close Cookify (don't need anymore)
                                    window.close();

                            }}
                            className="text-sm h-8"
                        >
                            <RefreshCw className="w-4 h-4 animate-spin duration-1500" />
                            Refresh the page
                        </Button>
                    </div>
                ), {
                    duration: 2500
                })
            } else {
                if (targetDomain !== "localhost") // if failed to set cookie on custom domain, then try in localhost (good for development)
                {
                    useApplyCookie({
                        ...cookie,
                        domain: "localhost"
                    })
                } else {
                    console.error("Failed to set cookie:", JSON.stringify(chrome.runtime.lastError));
                    toast.error("Failed to set cookie!");
                }

            }
        });


    } catch (error) {
        console.error("Error in useApplyCookie:", error.message);
        toast.error(error.message);
    }
};

export const useDeleteCookie = async (cookie: CookieData) => {
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
                console.log("Cookie deleted successfully:", details);
                toast.success("Cookie deleted successfully!");
            } else {
                console.error("Failed to delete cookie:", chrome.runtime.lastError);
                toast.error("Failed to delete cookie!");
            }
        });
    } catch (error) {
        console.error("Error in useDeleteCookie:", error.message);
        toast.error(error.message);
    }
};