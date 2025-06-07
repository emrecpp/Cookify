import {FormType} from "@/types/types";
import ProjectFilter from "./ProjectFilter";

const GLOBAL_PROJECT_KEY = "cookify_selected_global_project";


export interface GlobalFilterProps<T> {
    items: T[];
    type: FormType;
}

export const GlobalFilter = ({items, type}: GlobalFilterProps<any>) => {
    return (
        <ProjectFilter
            items={items}
            type={type}
            storageKey={GLOBAL_PROJECT_KEY}
            longPressTime={1500}
        />
    )
}

export default GlobalFilter; 