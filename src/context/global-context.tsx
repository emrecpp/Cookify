"use client"
import { useApplyCookie } from "@/hooks/useCookie.ts";
import { useApplySwagger } from "@/hooks/useSwagger.ts";
import { sortByOrder } from "@/lib/utils.ts";
import { CookieData, DEFAULT_SETTINGS, isCookieData, Settings, SwaggerData } from "@/types/types.ts";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

// Constants
const STORAGE_KEY = 'Cookify' as const;
const GLOBAL_PROJECT_KEY = 'cookify_selected_global_project' as const;

// Enums
export enum PageView {
    LIST_COOKIES = 'list-cookies',
    LIST_SWAGGERS = 'list-swaggers',
    SETTINGS = 'settings',
    ADD_COOKIE = 'add-cookie',
    EDIT_COOKIE = 'edit-cookie',
    ADD_SWAGGER = 'add-swagger',
    EDIT_SWAGGER = 'edit-swagger',
}

export enum PageGroup {
    MAIN = 'main',
    COOKIE_DETAIL = 'cookieDetail',
    SWAGGER_DETAIL = 'swaggerDetail',
}

export type PageViewTypes = PageView | null;

// Type Definitions
interface ExtendedSettings extends Settings {
    projects: string[];
}

interface StorageData {
    settings?: ExtendedSettings;
    projects?: string[];
    cookies?: CookieData[];
    swaggers?: SwaggerData[];
}

type DataType = CookieData | SwaggerData;
type DataArray<T> = T extends CookieData ? CookieData[] : SwaggerData[];

// Storage Utilities
class StorageManager {
    private static instance: StorageManager;
    
    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    getData(): StorageData {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to parse data from localStorage:', error.message);
            toast.error('Failed to load data!');
            return {};
        }
    }

    saveData(data: Partial<StorageData>): void {
        try {
            const currentData = this.getData();
            const updatedData = { ...currentData, ...data };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        } catch (error) {
            console.error('Failed to save data to localStorage:', error.message);
            toast.error('Failed to save data!');
        }
    }

    clearGlobalProject(): void {
        localStorage.removeItem(GLOBAL_PROJECT_KEY);
    }
}

// Page Groups Configuration
const PAGE_GROUPS: Record<PageGroup, readonly PageView[]> = {
    [PageGroup.MAIN]: [PageView.LIST_COOKIES, PageView.LIST_SWAGGERS, PageView.SETTINGS],
    [PageGroup.COOKIE_DETAIL]: [PageView.ADD_COOKIE, PageView.EDIT_COOKIE],
    [PageGroup.SWAGGER_DETAIL]: [PageView.ADD_SWAGGER, PageView.EDIT_SWAGGER],
} as const;

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

    handleEdit: (data: DataType) => void;
    handleApply: (data: DataType) => Promise<void>;

    handleCookieSubmit: (cookie: CookieData) => void;
    handleDeleteProfile: (data: DataType) => void;
    handleSwaggerSubmit: (swagger: SwaggerData) => void;

    animationDirection: 1 | -1;
    setAnimationDirection: React.Dispatch<React.SetStateAction<1 | -1>>;

    projects: string[];
    setProjects: React.Dispatch<React.SetStateAction<string[]>>;

    getAllProjects(): string[];
    addProject(projectName: string): void;
    handleDeleteProject(projectName: string): void;

    settings: Settings;
    updateSettings(newSettings: Partial<Settings>): void;

    activeProject: string | null;
    setActiveProject(projectName: string | null): void;

    searchTerm?: string;
    setSearchTerm?: React.Dispatch<React.SetStateAction<string>>;
    clearSearchTerm(): void;

    handleImport(importedData?: any): void;
    isInitialized: boolean;
}

export const GlobalContext = createContext<GlobalContextState | null>(null);

interface GlobalContextProps {
    children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({ children }) => {
    // State
    const [currentView, setCurrentView] = useState<PageViewTypes>(null);
    const [cookies, setCookiesState] = useState<CookieData[]>([]);
    const [swaggers, setSwaggersState] = useState<SwaggerData[]>([]);
    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null);
    const [editingSwagger, setEditingSwagger] = useState<SwaggerData | null>(null);
    const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
    const [activeProject, setActiveProject] = useState<string | null>(null);
    const [projects, setProjects] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [settings, setSettings] = useState<ExtendedSettings>({
        ...DEFAULT_SETTINGS,
        projects: []
    });

    // Storage Manager Instance
    const storageManager = useMemo(() => StorageManager.getInstance(), []);

    // Initialize data from localStorage
    useEffect(() => {
        const data = storageManager.getData();
        
        if (data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }));
        }
        
        if (data.cookies) {
            setCookiesState(sortByOrder(data.cookies));
        }
        
        if (data.swaggers) {
            setSwaggersState(sortByOrder(data.swaggers));
        }
    }, [storageManager]);

    // Settings Management
    const updateSettings = useCallback((newSettings: Partial<ExtendedSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            storageManager.saveData({ settings: updated });
            return updated;
        });
    }, [storageManager]);

    // Data Management Utilities
    const setCookies = useCallback((newCookies: CookieData[]) => {
        const sortedCookies = sortByOrder(newCookies);
        setCookiesState(sortedCookies);
        storageManager.saveData({ cookies: sortedCookies });
    }, [storageManager]);

    const setSwaggers = useCallback((newSwaggers: SwaggerData[]) => {
        const sortedSwaggers = sortByOrder(newSwaggers);
        setSwaggersState(sortedSwaggers);
        storageManager.saveData({ swaggers: sortedSwaggers });
    }, [storageManager]);

    // Project Management
    const addProject = useCallback((projectName: string) => {
        const trimmedName = projectName.trim();
        if (!trimmedName || settings.projects.includes(trimmedName)) return;
        
        const updatedProjects = [...settings.projects, trimmedName];
        updateSettings({ projects: updatedProjects });
    }, [settings.projects, updateSettings]);

    const removeProject = useCallback((projectName: string) => {
        const trimmedName = projectName.trim();
        if (!trimmedName || !settings.projects.includes(trimmedName)) return;
        
        const updatedProjects = settings.projects.filter(p => p !== trimmedName);
        updateSettings({ projects: updatedProjects });
        
        // Update cookies and swaggers to remove project reference
        const updatedCookies = cookies.map(cookie => 
            cookie.project === trimmedName ? { ...cookie, project: "" } : cookie
        );
        const updatedSwaggers = swaggers.map(swagger => 
            swagger.project === trimmedName ? { ...swagger, project: "" } : swagger
        );
        
        setCookies(updatedCookies);
        setSwaggers(updatedSwaggers);
    }, [settings.projects, updateSettings, cookies, swaggers, setCookies, setSwaggers]);

    const getAllProjects = useCallback(() => settings.projects, [settings.projects]);

    const handleDeleteProject = useCallback((projectName: string) => {
        removeProject(projectName);
        toast.success(`"${projectName}" project deleted successfully.`);
    }, [removeProject]);

    // Auto-sync projects from data
    useEffect(() => {
        const cookieProjects = cookies
            .filter(cookie => cookie.project?.trim())
            .map(cookie => cookie.project as string);
            
        const swaggerProjects = swaggers
            .filter(swagger => swagger.project?.trim())
            .map(swagger => swagger.project as string);
        
        const allProjects = [...new Set([...settings.projects, ...cookieProjects, ...swaggerProjects])];
        
        if (JSON.stringify(allProjects.sort()) !== JSON.stringify(settings.projects.sort())) {
            updateSettings({ projects: allProjects });
        }
    }, [cookies, swaggers, settings.projects, updateSettings]);

    useEffect(() => {
        setProjects(getAllProjects());
    }, [getAllProjects]);

    // Navigation Management
    const getPageGroup = useCallback((view: PageView): PageGroup => {
        for (const [group, pages] of Object.entries(PAGE_GROUPS)) {
            if (pages.includes(view)) {
                return group as PageGroup;
            }
        }
        return PageGroup.MAIN;
    }, []);

    const changeView = useCallback((newView: PageViewTypes) => {
        if (newView === null) {
            setCurrentView(null);
            return;
        }
        
        if (currentView === null) {
            setCurrentView(newView);
            return;
        }
        
        const currentGroup = getPageGroup(currentView);
        const targetGroup = getPageGroup(newView);
        
        setAnimationDirection(
            (currentGroup === PageGroup.MAIN && targetGroup !== PageGroup.MAIN) || 
            currentGroup === targetGroup ? 1 : -1
        );
        
        setCurrentView(newView);
    }, [currentView, getPageGroup]);

    // Generic Submit Handler
    const handleSubmit = useCallback(<T extends DataType>(
        data: T,
        editingData: T | null,
        setEditingData: (data: T | null) => void,
        setDataArray: (dataArray: DataArray<T>) => void,
        dataArray: DataArray<T>,
        targetView: PageViewTypes
    ) => {
        if (data.project) {
            addProject(data.project);
        }
        
        if (editingData) {
            // Update existing item
            const updatedArray = (dataArray as T[]).map(item => 
                item === editingData ? data : item
            ) as DataArray<T>;
            setDataArray(updatedArray);
            setEditingData(null);
        } else {
            // Create new item
            const updatedArray = [...dataArray as T[], data] as DataArray<T>;
            setDataArray(updatedArray);
        }

        setCurrentView(targetView);
    }, [addProject, setCurrentView]);

    // Specific Submit Handlers
    const handleCookieSubmit = useCallback((cookie: CookieData) => {
        handleSubmit(
            cookie,
            editingCookie,
            setEditingCookie,
            setCookies,
            cookies,
            PageView.LIST_COOKIES
        );
    }, [handleSubmit, editingCookie, setCookies, cookies]);

    const handleSwaggerSubmit = useCallback((swagger: SwaggerData) => {
        handleSubmit(
            swagger,
            editingSwagger,
            setEditingSwagger,
            setSwaggers,
            swaggers,
            PageView.LIST_SWAGGERS
        );
    }, [handleSubmit, editingSwagger, setSwaggers, swaggers]);

    // Edit Management
    const handleEdit = useCallback((data: DataType) => {
        if (isCookieData(data)) {
            setCurrentView(PageView.EDIT_COOKIE);
            setEditingCookie(data);
        } else {
            setEditingSwagger(data);
            setCurrentView(PageView.EDIT_SWAGGER);
        }
    }, []);

    // Delete Management
    const handleDeleteProfile = useCallback((data: DataType) => {
        if (isCookieData(data)) {
            setCookies(cookies.filter(c => c !== data));
        } else {
            setSwaggers(swaggers.filter(s => s !== data));
        }
    }, [cookies, swaggers, setCookies, setSwaggers]);

    // Apply Management
    const handleApply = useCallback(async (data: DataType) => {
        try {
            if (isCookieData(data)) {
                await useApplyCookie(data);
            } else {
                await useApplySwagger(data);
            }
        } catch (error) {
            console.error('Apply operation failed:', error.message);
            toast.error('Failed to apply configuration!');
        }
    }, []);

    // Import Management
    const handleImport = useCallback((importedData: any) => {
        try {
            if (importedData.cookies) setCookies(importedData.cookies);
            if (importedData.swaggers) setSwaggers(importedData.swaggers);
            if (importedData.settings) updateSettings(importedData.settings);

            setActiveProject(null);
            storageManager.clearGlobalProject();
            
            toast.success('Data imported successfully!');
        } catch (error) {
            console.error('Import failed:', error.message);
            toast.error('Failed to import data!');
        }
    }, [setCookies, setSwaggers, updateSettings, storageManager]);

    // Search Management
    const clearSearchTerm = useCallback(() => setSearchTerm(""), []);

    // Context Value
    const contextValue = useMemo(() => ({
        currentView,
        setCurrentView: changeView,

        cookies,
        setCookies,
        swaggers,
        setSwaggers,

        editingCookie,
        setEditingCookie,
        editingSwagger,
        setEditingSwagger,

        handleEdit,
        handleApply,

        handleCookieSubmit,
        handleDeleteProfile,
        handleSwaggerSubmit,

        animationDirection,
        setAnimationDirection,

        projects,
        setProjects,
        getAllProjects,
        addProject,
        handleDeleteProject,
        
        settings,
        updateSettings,
        
        activeProject,
        setActiveProject,
        searchTerm,
        setSearchTerm,
        clearSearchTerm,
        handleImport,
        isInitialized: true,
    }), [
        currentView, changeView, cookies, setCookies, swaggers, setSwaggers,
        editingCookie, editingSwagger, handleEdit, handleApply,
        handleCookieSubmit, handleDeleteProfile, handleSwaggerSubmit,
        animationDirection, projects, getAllProjects, addProject, handleDeleteProject,
        settings, updateSettings, activeProject, searchTerm, clearSearchTerm, handleImport
    ]);

    return (
        <GlobalContext.Provider value={contextValue}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error("useGlobalContext must be used within a GlobalContextProvider");
    }
    return context;
};


