import {CookieData, SwaggerData} from "@/types/types";
import ProjectFilter, {ProjectFilterRef} from "./ProjectFilter";
import {forwardRef, Ref, useEffect, useImperativeHandle, useRef, useState} from "react";
import {useGlobalContext} from "@/context/global-context";

const GLOBAL_PROJECT_KEY = "cookify_selected_global_project";

export interface GlobalFilterRef {
    clearSearch: () => void;
}

export interface GlobalFilterProps<T> {
    items: T[];
    onFilteredItemsChange: (items: T[]) => void;
    type: "cookie" | "swagger";
    onSearchTermChange?: (term: string) => void;
}

export const GlobalFilter = forwardRef(function GlobalFilter<T extends CookieData | SwaggerData>(
    props: GlobalFilterProps<T>,
    ref: Ref<GlobalFilterRef>
) {
    const {items, onFilteredItemsChange, type, onSearchTermChange} = props;
    const {activeProject, setActiveProject} = useGlobalContext();
    const [searchTerm, setSearchTerm] = useState("");
    const projectFilterRef = useRef<ProjectFilterRef>(null);

    useEffect(() => {
        const savedProject = localStorage.getItem(GLOBAL_PROJECT_KEY);
        if (savedProject) {
            setActiveProject(savedProject === "Not specified" ? "Not specified" : savedProject);
        }
    }, [setActiveProject]);

    useImperativeHandle(ref, () => ({
        clearSearch: () => {
            if (projectFilterRef.current) {
                projectFilterRef.current.clearSearch();
            }
        }
    }));

    const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
        if (onSearchTermChange) {
            onSearchTermChange(term);
        }
    };

    const additionalSearchFields = (item: T) => {
        if (type === "cookie") {
            const cookieItem = item as unknown as CookieData;
            return [
                cookieItem.name,
                cookieItem.domain || ""
            ];
        }
        return [];
    };

    return (
        <ProjectFilter
            ref={projectFilterRef}
            items={items}
            onFilteredItemsChange={onFilteredItemsChange}
            storageKey={GLOBAL_PROJECT_KEY}
            additionalSearchFields={additionalSearchFields}
            longPressTime={2000}
            onSearchTermChange={handleSearchTermChange}
        />
    )
});

export default GlobalFilter; 