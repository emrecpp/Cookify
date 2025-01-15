import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"
import toast from "react-hot-toast";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function exportToFile(cookies, swaggers) {
    return JSON.stringify({
        "name": "kurabiye",
        "version": 1,
        "cookies": cookies,
        "swaggers": swaggers
    }, null, 4)
}

export const getTabInfo = async () => {
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

export const sendMessage = async (action, params) => {
    const {tabs} = await getTabInfo()
    if (tabs.length === 0)
        return toast.error("No active tab found!");


    const tab = tabs[0];
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, {action, params}, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(response);
        });
    });

}