import { type ClassValue, clsx } from "clsx";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function exportToFile(cookies, swaggers) {
    return JSON.stringify({
        "name": "cookify",
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

export function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // Eğer order özelliği yoksa veya aynıysa değişiklik yapma
    if ((a.order === undefined && b.order === undefined) || a.order === b.order) {
      return 0;
    }
    
    // Undefined order değerlerini en sona koy
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    
    // Küçükten büyüğe sırala
    return a.order - b.order;
  });
}