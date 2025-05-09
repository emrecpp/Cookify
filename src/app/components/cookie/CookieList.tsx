import { useGlobalContext } from "@/context/global-context.tsx"
import { CookieData } from "@/types/types.ts"
import { useEffect, useState, useRef } from 'react'
import CookieTable from './CookieTable.tsx'
import GlobalFilter from "@/app/components/shared/GlobalFilter.tsx";

export function CookieList() {
    const { cookies, setCookies } = useGlobalContext()
    const [filteredCookies, setFilteredCookies] = useState<CookieData[]>(cookies)

    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredCookies);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredCookies(updatedItems);
        updateGlobalCookies(updatedItems);
    };

    const updateGlobalCookies = (updatedItems: CookieData[]) => {
        const newCookies = cookies.map((cookie: CookieData) => {
            const updatedCookie = updatedItems.find(item =>
                item.name === cookie.name &&
                item.domain === cookie.domain &&
                item.value === cookie.value
            );
            return updatedCookie || cookie;
        });
        setCookies(newCookies);
    };



    return (
        <div className="space-y-4 h-full flex flex-col">
            <GlobalFilter
                items={cookies}
                setFilteredItems={setFilteredCookies}
                type="cookie"
            />

            <div className="rounded-md border flex-1 overflow-hidden">
                <CookieTable
                    cookies={filteredCookies}
                    onReorder={handleReorder}
                    originalDataLength={cookies.length}
                />
            </div>
        </div>
    )
}

