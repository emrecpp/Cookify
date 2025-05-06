import { CookieData, Settings, SwaggerData } from "@/types/types";
import { type ClassValue, clsx } from "clsx";
import toast from "react-hot-toast";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function exportToFile(cookies: CookieData[], swaggers: SwaggerData[], settings?: Settings) {
    return JSON.stringify({
        "name": "cookify",
        "version": 1,
        "cookies": cookies,
        "swaggers": swaggers,
        "settings": settings
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
    if ((a.order === undefined && b.order === undefined) || a.order === b.order) {
      return 0;
    }
    
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    
    return a.order - b.order;
  });
}

export function stringToGradient(str: string): { gradient: string; colors: string[] } {
  if (!str) {
    return {
      gradient: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
      colors: ['#84fab0', '#8fd3f4']
    };
  }
  
  const firstChar = str.charCodeAt(0);
  
  const hue = firstChar % 360;
  
  const color1 = `hsl(${hue}, 80%, 65%)`;
  const color2 = `hsl(${(hue + 60) % 360}, 80%, 65%)`;
  
  return {
    gradient: `linear-gradient(120deg, ${color1} 0%, ${color2} 100%)`,
    colors: [color1, color2]
  };
}