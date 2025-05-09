import {FormType} from "@/types/types";
import ProjectFilter from "./ProjectFilter";
import {useEffect} from "react";
import {useGlobalContext} from "@/context/global-context";

const GLOBAL_PROJECT_KEY = "cookify_selected_global_project";


export interface GlobalFilterProps<T> {
    items: T[];
    setFilteredItems: (items: T[]) => void;
    type: FormType;
}

export const GlobalFilter = ({items, setFilteredItems, type}: GlobalFilterProps<any>) => {
    const {setActiveProject} = useGlobalContext();

    useEffect(() => {
        const savedProject = localStorage.getItem(GLOBAL_PROJECT_KEY);
        if (savedProject) {
            setActiveProject(savedProject === "Not specified" ? "Not specified" : savedProject);
        }
    }, [setActiveProject]);


    return (
        <ProjectFilter
            items={items}
            setFilteredItems={setFilteredItems}
            type={type}
            storageKey={GLOBAL_PROJECT_KEY}
            longPressTime={1500}
        />
    )
}

export default GlobalFilter; 