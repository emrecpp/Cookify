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
    // If order property doesn't exist or is the same, make no change
    if ((a.order === undefined && b.order === undefined) || a.order === b.order) {
      return 0;
    }
    
    // Put undefined order values at the end
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    
    // Sort from small to large
    return a.order - b.order;
  });
}

export function stringToGradient(str: string) {
  // Karakter yoksa varsayılan renk döndür
  if (!str || str.length === 0) {
    return {
      color1: 'hsl(210, 10%, 70%)',
      color2: 'hsl(210, 10%, 60%)',
      gradient: 'linear-gradient(135deg, hsl(210, 10%, 70%) 0%, hsl(210, 10%, 60%) 100%)'
    };
  }

  // İlk karakteri al
  const firstChar = str.charAt(0).toLowerCase();
  
  // İlk karakterin ASCII değerine göre renk hesapla
  const charCode = firstChar.charCodeAt(0);
  
  // Hue değeri (0-360)
  const hue = (charCode * 15) % 360;
  
  // Renk değerlerini hesapla
  const s1 = 70 + (charCode % 20); // %70-90 doygunluk
  const l1 = 60 + (charCode % 15); // %60-75 parlaklık
  
  // İkinci renk için farklı bir ton
  const h2 = (hue + 40) % 360; // Farklı ama uyumlu ton
  const s2 = s1 - 10; // Biraz daha az doygun
  const l2 = l1 - 10; // Biraz daha koyu

  return {
    color1: `hsl(${hue}, ${s1}%, ${l1}%)`,
    color2: `hsl(${h2}, ${s2}%, ${l2}%)`,
    gradient: `linear-gradient(135deg, hsl(${hue}, ${s1}%, ${l1}%) 0%, hsl(${h2}, ${s2}%, ${l2}%) 100%)`
  };
}