import {createContext, useContext} from "react";
import {ParsedSpec} from "./openapi";

export interface SpecContextValue {
    spec: ParsedSpec;
    specUrl: string;
    baseUrl: string;
}

export const SpecContext = createContext<SpecContextValue | null>(null);

export function useSpec(): SpecContextValue {
    const value = useContext(SpecContext);
    if (!value) throw new Error("SpecContext missing");
    return value;
}
