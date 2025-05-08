import {SwaggerData} from "@/types/types";
import GlobalFilter, {GlobalFilterRef} from "../shared/GlobalFilter";
import {forwardRef, useImperativeHandle, useRef} from "react";

export interface SwaggerFilterRef {
    clearSearch: () => void;
}

interface SwaggerFilterProps {
    swaggers: SwaggerData[]
    onFilteredSwaggersChange: (filteredSwaggers: SwaggerData[]) => void
    onSearchTermChange?: (searchTerm: string) => void
}

export const SwaggerFilter = forwardRef<SwaggerFilterRef, SwaggerFilterProps>(function SwaggerFilter(
    {swaggers, onFilteredSwaggersChange, onSearchTermChange},
    ref
) {
    const globalFilterRef = useRef<GlobalFilterRef>(null);

    useImperativeHandle(ref, () => ({
        clearSearch: () => {
            if (globalFilterRef.current) {
                globalFilterRef.current.clearSearch();
            }
        }
    }));

    return (
        <GlobalFilter
            ref={globalFilterRef}
            items={swaggers}
            onFilteredItemsChange={onFilteredSwaggersChange}
            type="swagger"
            onSearchTermChange={onSearchTermChange}
        />
    )
});

export default SwaggerFilter; 