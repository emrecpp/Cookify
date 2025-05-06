import { useGlobalContext } from "@/context/global-context.tsx"
import { CookieData } from "@/types/types.ts"
import { motion } from 'framer-motion'
import { Cookie } from "lucide-react"
import { useEffect, useState } from 'react'
import { CookieFilter } from './CookieFilter.tsx'
import CookieTable from './CookieTable.tsx'

export function CookieList() {
    const { cookies, setCookies } = useGlobalContext()
    const [filteredCookies, setFilteredCookies] = useState<CookieData[]>(cookies)

    // Update filtered list when cookies change
    useEffect(() => {
        setFilteredCookies(cookies)
    }, [cookies])

    // Move an item up one position
    const moveItemUp = (index: number) => {
        if (index === 0) return;

        const items = Array.from(filteredCookies);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index - 1, 0, itemToMove);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredCookies(updatedItems);
        updateGlobalCookies(updatedItems);
    };

    // Move an item down one position
    const moveItemDown = (index: number) => {
        if (index === filteredCookies.length - 1) return;

        const items = Array.from(filteredCookies);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index + 1, 0, itemToMove);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredCookies(updatedItems);
        updateGlobalCookies(updatedItems);
    };

    // Reorder using drag and drop
    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredCookies);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredCookies(updatedItems);
        updateGlobalCookies(updatedItems);
    };

    // Update global cookie list
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
        <div className="space-y-4">
            {cookies.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-muted-foreground text-center text-sm select-none flex items-center gap-2 justify-center"
                >
                    <Cookie className="w-4 h-4"/>
                    No cookies added yet...
                </motion.p>
            ) : (
                <>
                    <CookieFilter 
                        cookies={cookies} 
                        onFilteredCookiesChange={setFilteredCookies} 
                    />
                    <div className="rounded-md border">
                        <CookieTable 
                            cookies={filteredCookies} 
                            onMoveUp={moveItemUp}
                            onMoveDown={moveItemDown}
                            onReorder={handleReorder}
                        />
                    </div>
                </>
            )}
        </div>
    )
}

