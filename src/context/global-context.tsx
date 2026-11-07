"use client"
import {applyCookie} from "@/lib/apply-cookie.tsx";
import {useGoogleDriveSync} from "@/hooks/useGoogleDriveSync.ts";
import {applySwaggerToken} from "@/lib/apply-swagger.ts";
import {DATA_KEY, PopupData} from "@/lib/cloud-data.ts";
import {stableJson} from "@/lib/values.ts";
import {loadPopupData, savePopupData} from "@/lib/popup-storage.ts";
import {normalizeSnapshot, prepareCookiesForSave, prepareSwaggersForSave} from "@/lib/sync.ts";
import {sortByOrder} from "@/lib/utils.ts";
import {
    ConflictResolution,
    CookieData,
    DEFAULT_SETTINGS,
    GoogleDriveSyncStatus,
    isCookieData,
    Settings,
    SwaggerData,
} from "@/types/types.ts";
import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import toast from 'react-hot-toast';

// Constants
const GOOGLE_DRIVE_HEADER_VISIBILITY_KEY = 'CookifyShowGoogleDriveHeader' as const;

function normalizeActiveProject(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

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

// Storage Utilities: popup data lives in chrome.storage.local (DATA_KEY), cached here once loaded.
class StorageManager {
    private static instance: StorageManager;
    private data: StorageData | null = null;

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    async load(): Promise<StorageData> {
        this.data = await loadPopupData() as StorageData;
        return this.data;
    }

    getData(): StorageData {
        return this.data ?? {};
    }

    /** Takes data written by someone else (Google Drive sync, import); false when it is what we have. */
    receive(data: StorageData): boolean {
        if (stableJson(data) === stableJson(this.data)) return false;
        this.data = data;
        return true;
    }

    saveData(data: Partial<StorageData>): void {
        // Nothing is written before the stored data is loaded (it would overwrite it with defaults).
        if (!this.data) return;
        this.data = {...this.data, ...data};
        savePopupData(this.data as PopupData).catch((error) => {
            console.error('Failed to save data:', (error as Error).message);
            toast.error('Failed to save data!');
        });
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
    showGoogleDriveInHeader: boolean;
    setShowGoogleDriveInHeader(show: boolean): void;

    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    clearSearchTerm(): void;

    isInitialized: boolean;

    googleDriveSync: GoogleDriveSyncStatus;
    isGoogleDriveConfigured: boolean;
    connectGoogleDrive(chooseAccount?: boolean): Promise<void>;
    logoutGoogleDrive(): Promise<void>;
    syncGoogleDriveNow(): Promise<void>;
    resolveGoogleDriveConflicts(resolutions: Record<string, ConflictResolution>): Promise<void>;
}

export const GlobalContext = createContext<GlobalContextState | null>(null);

interface GlobalContextProps {
    children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({children}) => {
    // State
    const [currentView, setCurrentView] = useState<PageViewTypes>(null);
    const [cookies, setCookiesState] = useState<CookieData[]>([]);
    const [swaggers, setSwaggersState] = useState<SwaggerData[]>([]);
    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null);
    const [editingSwagger, setEditingSwagger] = useState<SwaggerData | null>(null);
    const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
    const [activeProject, setActiveProjectState] = useState<string | null>(null);
    const [showGoogleDriveInHeader, setShowGoogleDriveInHeaderState] = useState(
        () => localStorage.getItem(GOOGLE_DRIVE_HEADER_VISIBILITY_KEY) !== "false",
    );
    const [projects, setProjects] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInitialized, setIsInitialized] = useState(false);
    const [settings, setSettings] = useState<ExtendedSettings>({...DEFAULT_SETTINGS, projects: []});

    // Storage Manager Instance
    const storageManager = useMemo(() => StorageManager.getInstance(), []);

    const applyData = useCallback((data: StorageData) => {
        const normalized = normalizeSnapshot({
            cookies: data.cookies,
            swaggers: data.swaggers,
            settings: {...DEFAULT_SETTINGS, ...data.settings},
        });
        setCookiesState(sortByOrder(normalized.cookies));
        setSwaggersState(sortByOrder(normalized.swaggers));
        setSettings(normalized.settings);
        setActiveProjectState(normalized.settings.activeProject);
        return normalized;
    }, []);

    // Load the stored data, then follow changes from Google Drive sync or an import.
    useEffect(() => {
        let active = true;
        void storageManager.load().then((data) => {
            if (!active) return;
            const normalized = applyData(data);
            storageManager.saveData(normalized);
            setIsInitialized(true);
        }).catch((error) => {
            console.error('Failed to load data:', (error as Error).message);
            toast.error('Failed to load data!');
        });
        const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
            if (area !== "local" || !changes[DATA_KEY]) return;
            const next = (changes[DATA_KEY].newValue ?? {}) as StorageData;
            if (storageManager.receive(next)) applyData(next);
        };
        chrome.storage.onChanged.addListener(onChange);
        return () => {
            active = false;
            chrome.storage.onChanged.removeListener(onChange);
        };
    }, [storageManager, applyData]);

    // Settings Management
    const updateSettings = useCallback((newSettings: Partial<ExtendedSettings>) => {
        setSettings(prev => {
            const updated = {...prev, ...newSettings, updatedAt: new Date().toISOString()};
            storageManager.saveData({settings: updated});
            return updated;
        });
    }, [storageManager]);

    const setActiveProject = useCallback((projectName: string | null) => {
        const normalizedProject = normalizeActiveProject(projectName);
        setActiveProjectState(normalizedProject);
        setSettings(previous => {
            if (previous.activeProject === normalizedProject) return previous;
            const updated = {
                ...previous,
                activeProject: normalizedProject,
                updatedAt: new Date().toISOString(),
            };
            storageManager.saveData({settings: updated});
            return updated;
        });
    }, [storageManager]);

    const setShowGoogleDriveInHeader = useCallback((show: boolean) => {
        setShowGoogleDriveInHeaderState(show);
        localStorage.setItem(GOOGLE_DRIVE_HEADER_VISIBILITY_KEY, String(show));
    }, []);

    // Data Management Utilities
    const setCookies = useCallback((newCookies: CookieData[]) => {
        setCookiesState((previous) => {
            const sortedCookies = sortByOrder(prepareCookiesForSave(newCookies, previous));
            storageManager.saveData({cookies: sortedCookies});
            return sortedCookies;
        });
    }, [storageManager]);

    const setSwaggers = useCallback((newSwaggers: SwaggerData[]) => {
        setSwaggersState((previous) => {
            const sortedSwaggers = sortByOrder(prepareSwaggersForSave(newSwaggers, previous));
            storageManager.saveData({swaggers: sortedSwaggers});
            return sortedSwaggers;
        });
    }, [storageManager]);

    // Project Management
    const addProject = useCallback((projectName: string) => {
        const trimmedName = projectName.trim();
        if (!trimmedName || settings.projects.includes(trimmedName)) return;

        const updatedProjects = [...settings.projects, trimmedName];
        updateSettings({projects: updatedProjects});
    }, [settings.projects, updateSettings]);

    const removeProject = useCallback((projectName: string) => {
        const trimmedName = projectName.trim();
        if (!trimmedName || !settings.projects.includes(trimmedName)) return;

        const updatedProjects = settings.projects.filter(p => p !== trimmedName);
        updateSettings({projects: updatedProjects});

        // Update cookies and swaggers to remove project reference
        const updatedCookies = cookies.map(cookie =>
            cookie.project === trimmedName ? {...cookie, project: ""} : cookie
        );
        const updatedSwaggers = swaggers.map(swagger =>
            swagger.project === trimmedName ? {...swagger, project: ""} : swagger
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

        if (JSON.stringify([...allProjects].sort()) !== JSON.stringify([...settings.projects].sort())) {
            updateSettings({projects: allProjects});
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
                await applyCookie(data);
            } else {
                await applySwaggerToken(data);
            }
        } catch (error) {
            console.error('Apply operation failed:', (error as Error).message);
            toast.error('Failed to apply configuration!');
        }
    }, []);

    // Search Management
    const clearSearchTerm = useCallback(() => setSearchTerm(""), []);

    const driveSync = useGoogleDriveSync({isInitialized});

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
        showGoogleDriveInHeader,
        setShowGoogleDriveInHeader,
        searchTerm,
        setSearchTerm,
        clearSearchTerm,
        isInitialized,

        googleDriveSync: driveSync.status,
        isGoogleDriveConfigured: driveSync.isConfigured,
        connectGoogleDrive: driveSync.connect,
        logoutGoogleDrive: driveSync.logout,
        syncGoogleDriveNow: driveSync.syncNow,
        resolveGoogleDriveConflicts: driveSync.resolveConflicts,
    }), [
        currentView, changeView, cookies, setCookies, swaggers, setSwaggers,
        editingCookie, editingSwagger, handleEdit, handleApply,
        handleCookieSubmit, handleDeleteProfile, handleSwaggerSubmit,
        animationDirection, projects, getAllProjects, addProject, handleDeleteProject,
        settings, updateSettings, activeProject, setActiveProject,
        showGoogleDriveInHeader, setShowGoogleDriveInHeader,
        searchTerm, clearSearchTerm,
        isInitialized, driveSync
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


