import {CookieData} from "@/types/types";
import GlobalFilter, {GlobalFilterRef} from "../shared/GlobalFilter";
import {forwardRef, useImperativeHandle, useRef} from "react";

export interface CookieFilterRef {
    clearSearch: () => void;
}

interface CookieFilterProps {
    cookies: CookieData[]
    onFilteredCookiesChange: (filteredCookies: CookieData[]) => void
    onSearchTermChange?: (searchTerm: string) => void
}

export const CookieFilter = forwardRef<CookieFilterRef, CookieFilterProps>(function CookieFilter(
    {cookies, onFilteredCookiesChange, onSearchTermChange},
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
            items={cookies}
            onFilteredItemsChange={onFilteredCookiesChange}
            type="cookie"
            onSearchTermChange={onSearchTermChange}
        />
    )
});

export default CookieFilter; 