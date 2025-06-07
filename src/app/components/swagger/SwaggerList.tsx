import { useGlobalContext } from "@/context/global-context.tsx"
import { SwaggerData } from "@/types/types.ts"
import { useEffect, useState, useRef, useMemo } from 'react'
import SwaggerTable from './SwaggerTable.tsx'
import GlobalFilter from "@/app/components/shared/GlobalFilter.tsx";

export function SwaggerList() {
    const { swaggers, setSwaggers, searchTerm, activeProject } = useGlobalContext()
    
    const filteredSwaggers = useMemo(() => {
        let filtered = [...swaggers]
        
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            filtered = filtered.filter(swagger => 
                swagger.alias.toLowerCase().includes(searchLower) ||
                (swagger.project && swagger.project.toLowerCase().includes(searchLower))
            )
        }
        
        if (activeProject) {
            filtered = filtered.filter(swagger =>
                activeProject === "Not specified"
                    ? !swagger.project
                    : swagger.project === activeProject
            )
        }
        
        return filtered
    }, [swaggers, searchTerm, activeProject])

    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredSwaggers);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        updateGlobalSwaggers(updatedItems);
    };

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
        <div className="space-y-4 h-full flex flex-col">
            <GlobalFilter
                items={swaggers}
                type="swagger"
            />
            <div className="rounded-md border flex-1 overflow-hidden">
                <SwaggerTable
                    swaggers={filteredSwaggers}
                    onReorder={handleReorder}
                    originalDataLength={swaggers.length}
                />
            </div>
        </div>
    )
}

