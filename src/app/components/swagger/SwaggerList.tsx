import { useGlobalContext } from "@/context/global-context.tsx"
import SwaggerSVG from "@/svg/swagger.tsx"
import { SwaggerData } from "@/types/types.ts"
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SwaggerFilter } from './SwaggerFilter.tsx'
import SwaggerTable from './SwaggerTable.tsx'

export function SwaggerList() {
    const { swaggers, setSwaggers } = useGlobalContext()
    const [filteredSwaggers, setFilteredSwaggers] = useState<SwaggerData[]>(swaggers)

    // Update filtered list when swaggers change
    useEffect(() => {
        setFilteredSwaggers(swaggers)
    }, [swaggers])

    // Move an item up one position
    const moveItemUp = (index: number) => {
        if (index === 0) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index - 1, 0, itemToMove);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Update global swagger list
        updateGlobalSwaggers(updatedItems);
    };

    // Move an item down one position
    const moveItemDown = (index: number) => {
        if (index === filteredSwaggers.length - 1) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index + 1, 0, itemToMove);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Update global swagger list
        updateGlobalSwaggers(updatedItems);
    };

    // Reorder using drag and drop
    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredSwaggers);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        // Assign order value to each item
        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        // Update global swagger list
        updateGlobalSwaggers(updatedItems);
    };

    // Update global swagger list
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
                    No swagger configurations added yet...
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

