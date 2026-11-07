import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface TabInfo {
    protocol: string;
    domain: string;
    url: URL;
    tab: chrome.tabs.Tab;
}

/** The active tab of the current window and its address. Rejects for tabs without a readable url. */
export async function getTabInfo(): Promise<TabInfo> {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab) throw new Error("No active tab found!");
    // A tab that is still loading (or a browser page) has no url yet.
    if (!tab.url) throw new Error("This tab has no address Cookify can use.");
    const url = new URL(tab.url);
    return {protocol: url.protocol, domain: url.hostname, url, tab};
}

/** Sends a message to the content script of the active tab (see src/runtime/router.ts). */
export async function sendMessage<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    const {tab} = await getTabInfo();
    if (tab.id === undefined) throw new Error("No active tab found!");
    return chrome.tabs.sendMessage(tab.id, {action, params}) as Promise<T>;
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

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;

    const saturation = 70 + (hash % 20);
    const lightness = 55 + ((hash >> 4) % 10);

    const hue2 = (hue + 40 + (hash % 80)) % 360;

    const color1 = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const color2 = `hsl(${hue2}, ${saturation}%, ${lightness}%)`;

    return {
        gradient: `linear-gradient(120deg, ${color1} 0%, ${color2} 100%)`,
        colors: [color1, color2]
    };
}

/** Two letters for an avatar: the first letters of the first two words, or the first two letters of one word. */
export function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    return words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
}
