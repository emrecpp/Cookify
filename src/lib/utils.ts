import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function exportToFile(cookies) {
    return JSON.stringify({
        "name": "kurabiye",
        "version": 1,
        "cookies": cookies
    }, null, 4)
}