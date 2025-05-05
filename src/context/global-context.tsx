"use client"
import { useApplyCookie } from "@/hooks/useCookie.ts";
import { useApplySwagger } from "@/hooks/useSwagger.ts";
import { sortByOrder } from "@/lib/utils.ts";
import { CookieData, DEFAULT_SETTINGS, isCookieData, PageViewTypes, Settings, SwaggerData } from "@/types/types.ts";
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const SETTINGS_STORAGE_KEY = 'Cookify_Settings';

interface GlobalContextState {
    currentView: PageViewTypes;
    setCurrentView: (view: PageViewTypes) => void;

    cookies: CookieData[];
    setCookies: (cookies: CookieData[]) => void;

    swaggers: SwaggerData[];
    setSwaggers: (swaggers: SwaggerData[]) => void;

    editingCookie: CookieData | null;
    setEditingCookie: (cookie: CookieData | null) => void;

    editingSwagger: SwaggerData | null;
    setEditingSwagger: (swagger: SwaggerData | null) => void;

    handleEdit: (data: CookieData | SwaggerData) => void;
    handleApply: (data: CookieData | SwaggerData) => void;

    handleCookieSubmit: (cookie: CookieData) => void;
    handleDeleteProfile: (data: CookieData | SwaggerData) => void;
    handleSwaggerSubmit: (swagger: SwaggerData) => void;

    animationDirection: 1 | -1;
    setAnimationDirection: (direction: 1 | -1) => void;
    
    getAllProjects: () => string[];
    
    settings: Settings;
    updateSettings: (settings: Partial<Settings>) => void;
}

export const GlobalContext = createContext<GlobalContextState | any>(undefined);

interface GlobalContextProps {
    children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({children}) => {
    const [currentView, setCurrentView] = useState<PageViewTypes>('list-cookies')

    const [cookies, setCookiesState] = useState<CookieData[]>([])
    const [swaggers, setSwaggersState] = useState<SwaggerData[]>([])

    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null)
    const [editingSwagger, setEditingSwagger] = useState<SwaggerData | null>(null)

    const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
    
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    
    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings(prev => ({...prev, ...parsedSettings}));
            } catch (error) {
                console.error('Failed to parse settings from localStorage', error);
            }
        }
    }, []);
    
    // Update settings and save to localStorage
    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => {
            const updated = {...prev, ...newSettings};
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    // Set cookies with sorting
    const setCookies = (newCookies: CookieData[]) => {
        const sortedCookies = sortByOrder(newCookies);
        setCookiesState(sortedCookies);
    };

    // Set swaggers with sorting
    const setSwaggers = (newSwaggers: SwaggerData[]) => {
        const sortedSwaggers = sortByOrder(newSwaggers);
        setSwaggersState(sortedSwaggers);
    };
    
    // Get all unique projects from both cookies and swaggers
    const getAllProjects = () => {
        const cookieProjects = cookies
            .filter(cookie => cookie.project)
            .map(cookie => cookie.project as string);
            
        const swaggerProjects = swaggers
            .filter(swagger => swagger.project)
            .map(swagger => swagger.project as string);
            
        // Combine both arrays and get unique values
        return [...new Set([...cookieProjects, ...swaggerProjects])];
    };

    const handleEdit = (data: CookieData | SwaggerData) => {
        if (isCookieData(data)) {
            setCurrentView("edit-cookie");
            setEditingCookie(data)
        } else {
            setEditingSwagger(data)
            setCurrentView("edit-swagger");
        }
    };
    const handleCookieSubmit = (cookie: CookieData) => {
        if (editingCookie)
            setCookies(cookies.map(c => c.alias === editingCookie.alias ? cookie : c))
        else
            setCookies([...cookies, cookie])

        setCurrentView('list-cookies')
        setEditingCookie(null)
    }

    const handleSwaggerSubmit = (swagger: SwaggerData) => {
        if (editingSwagger) {
            setSwaggers(swaggers.map(
                s => s.alias === editingSwagger.alias ? swagger : s
            ))
            setEditingSwagger(null)
        } else
            setSwaggers([...swaggers, swagger])

        setCurrentView('list-swaggers')
    }

    const handleDeleteProfile = (data: CookieData | SwaggerData) => {
        if (isCookieData(data))
            setCookies(cookies.filter(c => c !== data))
        else
            setSwaggers(swaggers.filter(s => s !== data))
    }
    const handleApply = async (data: CookieData | SwaggerData) => {
        if (isCookieData(data))
            await useApplyCookie(data)
        else
            await useApplySwagger(data)
    }

    // Add page groups for determining animation direction
    const pageGroups = {
        main: ["list-cookies", "list-swaggers", "settings"],
        cookieDetail: ["add-cookie", "edit-cookie"],
        swaggerDetail: ["add-swagger", "edit-swagger"]
    };

    // Get the group of a view
    const getPageGroup = (view: string) => {
        for (const [group, pages] of Object.entries(pageGroups)) {
            if (pages.includes(view)) return group;
        }
        return "main";
    };

    // Update currentView with appropriate animation direction
    const changeView = (newView: PageViewTypes) => {
        const currentGroup = getPageGroup(currentView);
        const targetGroup = getPageGroup(newView);
        
        // If going from main to detail, or within same group
        if (
            (currentGroup === "main" && targetGroup !== "main") || 
            currentGroup === targetGroup
        ) {
            setAnimationDirection(1); // Forward
        } else {
            setAnimationDirection(-1); // Backward
        }
        
        setCurrentView(newView);
    };

    return (
        <GlobalContext.Provider
            value={{
                currentView, setCurrentView: changeView,

                cookies, setCookies,
                swaggers, setSwaggers,

                editingCookie, setEditingCookie,
                editingSwagger, setEditingSwagger,

                handleEdit, handleApply,

                handleCookieSubmit, handleDeleteProfile,
                handleSwaggerSubmit,

                animationDirection, setAnimationDirection,
                
                getAllProjects,
                
                settings, updateSettings
            }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context)
        throw new Error("useGlobalContext must be used within a GlobalContextProvider");

    return context;
}


