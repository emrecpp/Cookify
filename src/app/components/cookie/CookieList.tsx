import { useGlobalContext } from "@/context/global-context.tsx"
import { CookieData } from "@/types/types.ts"
import { motion } from 'framer-motion'
import { Cookie, PlusCircle } from "lucide-react"
import { useEffect, useState, useRef } from 'react'
import CookieFilter, { CookieFilterRef } from './CookieFilter.tsx'
import CookieTable from './CookieTable.tsx'
import { Button } from "@/components/ui/button"

export function CookieList() {
    const { cookies, setCookies } = useGlobalContext()
    const [filteredCookies, setFilteredCookies] = useState<CookieData[]>(cookies)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const cookieFilterRef = useRef<CookieFilterRef>(null);

    useEffect(() => {
        setFilteredCookies(cookies)
    }, [cookies])

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

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const clearSearchTerm = () => {
        if (cookieFilterRef.current) {
            cookieFilterRef.current.clearSearch();
        }
        setSearchTerm("");
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <CookieFilter 
                ref={cookieFilterRef}
                cookies={cookies} 
                onFilteredCookiesChange={setFilteredCookies}
                onSearchTermChange={handleSearchTermChange}
            />

            <div className="rounded-md border flex-1 overflow-hidden">
                <CookieTable
                    cookies={filteredCookies}
                    onReorder={handleReorder}
                    searchTerm={searchTerm}
                    clearSearchTerm={clearSearchTerm}
                    originalDataLength={cookies.length}
                />
            </div>
        </div>
    )
}

