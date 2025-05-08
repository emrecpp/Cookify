import {sendMessage} from '@/lib/utils';
import {CookieData} from '@/types/types';
import {useEffect, useState} from 'react';

interface CookiesResponse {
    cookies: {
        name: string;
        value: string;
        [key: string]: any;
    }[];
}

/**
 * Hook that checks active cookies in the browser
 * @returns A set containing active cookie aliases
 */
export function useActiveCookies(cookies: CookieData[]) {
    const [activeCookies, setActiveCookies] = useState<Set<string>>(new Set());

    useEffect(() => {
        const checkActiveCookies = async () => {
            try {
                const result = await sendMessage<CookiesResponse>("getCookies", {});

                if (!result || !result.cookies || !Array.isArray(result.cookies)) {
                    return;
                }

                const browserCookies = result.cookies || [];

                const active = new Set<string>();

                cookies.forEach(cookie => {
                    const matchingCookie = browserCookies.find(
                        (bc) => bc.name === cookie.name && bc.value === cookie.value
                    );

                    if (matchingCookie) {
                        active.add(cookie.alias);
                    }
                });

                setActiveCookies(active);
            } catch (error) {
                console.error("Error checking cookies:", error);
            }
        };

        if (cookies.length > 0) {
            checkActiveCookies();
        }
    }, [cookies]);

    const isCookieActive = (alias: string) => {
        return activeCookies.has(alias);
    };

    return {activeCookies, isCookieActive};
} 