import { useGlobalContext } from "@/context/global-context.tsx"
import { SwaggerData } from "@/types/types.ts"
import { useEffect, useState, useRef } from 'react'
import SwaggerFilter, { SwaggerFilterRef } from './SwaggerFilter.tsx'
import SwaggerTable from './SwaggerTable.tsx'

export function SwaggerList() {
    const { swaggers, setSwaggers } = useGlobalContext()
    const [filteredSwaggers, setFilteredSwaggers] = useState<SwaggerData[]>(swaggers)
    const [searchTerm, setSearchTerm] = useState<string>("")
    const swaggerFilterRef = useRef<SwaggerFilterRef>(null);

    useEffect(() => {
        setFilteredSwaggers(swaggers)
    }, [swaggers])

    const moveItemUp = (index: number) => {
        if (index === 0) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index - 1, 0, itemToMove);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        updateGlobalSwaggers(updatedItems);
    };

    const moveItemDown = (index: number) => {
        if (index === filteredSwaggers.length - 1) return;

        const items = Array.from(filteredSwaggers);
        const itemToMove = items[index];
        items.splice(index, 1);
        items.splice(index + 1, 0, itemToMove);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

        updateGlobalSwaggers(updatedItems);
    };

    const handleReorder = (startIndex: number, endIndex: number) => {
        const items = Array.from(filteredSwaggers);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);

        const updatedItems = items.map((item, idx) => ({
            ...item,
            order: idx
        }));

        setFilteredSwaggers(updatedItems);

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

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
    };

    const clearSearchTerm = () => {
        if (swaggerFilterRef.current) {
            swaggerFilterRef.current.clearSearch();
        }
        setSearchTerm("");
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <SwaggerFilter 
                ref={swaggerFilterRef}
                swaggers={swaggers} 
                onFilteredSwaggersChange={setFilteredSwaggers}
                onSearchTermChange={handleSearchTermChange}
            />
            <div className="rounded-md border flex-1 overflow-hidden">
                <SwaggerTable 
                    swaggers={filteredSwaggers} 
                    onMoveUp={moveItemUp}
                    onMoveDown={moveItemDown}
                    onReorder={handleReorder}
                    searchTerm={searchTerm}
                    clearSearchTerm={clearSearchTerm}
                    originalDataLength={swaggers.length}
                />
            </div>
        </div>
    )
}

