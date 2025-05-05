import { useGlobalContext } from "@/context/global-context.tsx"
import SwaggerSVG from "@/svg/swagger.tsx"
import { SwaggerData } from "@/types/types.ts"
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SwaggerFilter } from './SwaggerFilter.tsx'
import { SwaggerTable } from './SwaggerTable.tsx'

export function SwaggerList() {
    const { swaggers, setSwaggers } = useGlobalContext()
    const [filteredSwaggers, setFilteredSwaggers] = useState<SwaggerData[]>(swaggers)

    // Swaggers güncellendiğinde filtrelenmiş listeyi de güncelle
    useEffect(() => {
        setFilteredSwaggers(swaggers)
    }, [swaggers])

    // Öğeyi bir pozisyon yukarı taşı
    const moveItemUp = (index: number) => {
        if (index === 0) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index - 1, 0, itemToMove);

        // Her öğeye order değeri atayalım
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Global swagger listesini de güncelleyelim
        updateGlobalSwaggers(updatedItems);
    };

    // Öğeyi bir pozisyon aşağı taşı
    const moveItemDown = (index: number) => {
        if (index === filteredSwaggers.length - 1) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index + 1, 0, itemToMove);

        // Her öğeye order değeri atayalım
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Global swagger listesini de güncelleyelim
        updateGlobalSwaggers(updatedItems);
    };

    // Sürükle bırak ile sıralama
    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredSwaggers);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        // Her öğeye order değeri atayalım
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Global swagger listesini de güncelleyelim
        updateGlobalSwaggers(updatedItems);
    };

    // Global swagger listesini güncelle
    const updateGlobalSwaggers = (updatedItems: SwaggerData[]) => {
        const newSwaggers = swaggers.map((swagger: SwaggerData) => {
            const updatedSwagger = updatedItems.find(item => 
                item.alias === swagger.alias && 
                item.bearerToken === swagger.bearerToken
            );
            return updatedSwagger || swagger;
        });
        setSwaggers(newSwaggers);
    };

    return (
        <div className="space-y-4">
            {swaggers.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-muted-foreground text-center text-sm select-none flex items-center gap-2 justify-center"
                >
                    <SwaggerSVG className="w-4 h-4"/>
                    Henüz hiç swagger eklenmemiş...
                </motion.p>
            ) : (
                <>
                    <SwaggerFilter 
                        swaggers={swaggers} 
                        onFilteredSwaggersChange={setFilteredSwaggers} 
                    />
                    <div className="rounded-md border">
                        <SwaggerTable 
                            swaggers={filteredSwaggers} 
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

