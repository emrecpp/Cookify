"use client"
import { useApplyCookie } from "@/hooks/useCookie.ts";
import { useApplySwagger } from "@/hooks/useSwagger.ts";
import { sortByOrder } from "@/lib/utils.ts";
import { CookieData, DEFAULT_SETTINGS, isCookieData, PageViewTypes, Settings, SwaggerData } from "@/types/types.ts";
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const SETTINGS_STORAGE_KEY = 'Cookify_Settings';
const PROJECTS_STORAGE_KEY = 'Cookify_Projects';

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
    addProject: (projectName: string) => void;
    handleDeleteProject: (projectName: string) => void;
    
    settings: Settings;
    updateSettings: (settings: Partial<Settings>) => void;

    activeProject: string | null;
    setActiveProject: (project: string | null) => void;
}

export const GlobalContext = createContext<GlobalContextState | any>(undefined);

interface GlobalContextProps {
    children: ReactNode;
}

interface ExtendedSettings extends Settings {
    projects: string[];
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({children}) => {
    const [currentView, setCurrentView] = useState<PageViewTypes>('list-cookies')

    const [cookies, setCookiesState] = useState<CookieData[]>([])
    const [swaggers, setSwaggersState] = useState<SwaggerData[]>([])

    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null)
    const [editingSwagger, setEditingSwagger] = useState<SwaggerData | null>(null)

    const [animationDirection, setAnimationDirection] = useState<1 | -1>(1);
    const [activeProject, setActiveProject] = useState<string | null>(null);
    
    const [settings, setSettings] = useState<ExtendedSettings>({
        ...DEFAULT_SETTINGS,
        projects: []
    });
    
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
        
        const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (savedProjects) {
            try {
                const projectsList = JSON.parse(savedProjects);
                setSettings(prev => ({...prev, projects: projectsList}));
            } catch (error) {
                console.error('Failed to parse projects from localStorage', error);
            }
        }
    }, []);
    
    const updateSettings = (newSettings: Partial<ExtendedSettings>) => {
        setSettings(prev => {
            const updated = {...prev, ...newSettings};
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const setCookies = (newCookies: CookieData[]) => {
        const sortedCookies = sortByOrder(newCookies);
        setCookiesState(sortedCookies);
    };

    const setSwaggers = (newSwaggers: SwaggerData[]) => {
        const sortedSwaggers = sortByOrder(newSwaggers);
        setSwaggersState(sortedSwaggers);
    };
    
    useEffect(() => {
        const cookieProjects = cookies
            .filter(cookie => cookie.project && cookie.project.trim() !== '')
            .map(cookie => cookie.project as string);
            
        const swaggerProjects = swaggers
            .filter(swagger => swagger.project && swagger.project.trim() !== '')
            .map(swagger => swagger.project as string);
        
        const allProjects = [...new Set([...settings.projects, ...cookieProjects, ...swaggerProjects])];
        
        if (JSON.stringify(allProjects) !== JSON.stringify(settings.projects)) {
            updateSettings({ projects: allProjects });
            localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));
        }
    }, [cookies, swaggers]);
    
    const addProject = (projectName: string) => {
        if (!projectName.trim() || settings.projects.includes(projectName)) {
            return;
        }
        
        const updatedProjects = [...settings.projects, projectName];
        updateSettings({ projects: updatedProjects });
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
    };
    
    const removeProject = (projectName: string) => {
        if (!projectName.trim() || !settings.projects.includes(projectName)) {
            return;
        }
        
        const updatedProjects = settings.projects.filter(p => p !== projectName);
        updateSettings({ projects: updatedProjects });
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
        
        const updatedCookies = cookies.map(cookie => {
            if (cookie.project === projectName) {
                return { ...cookie, project: "" };
            }
            return cookie;
        });
        
        const updatedSwaggers = swaggers.map(swagger => {
            if (swagger.project === projectName) {
                return { ...swagger, project: "" };
            }
            return swagger;
        });
        
        setCookies(updatedCookies);
        setSwaggers(updatedSwaggers);
    };
    
    const getAllProjects = () => {
        return settings.projects;
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
        if (cookie.project) {
            addProject(cookie.project);
        }
        
        if (editingCookie)
            setCookies(cookies.map(c => c.alias === editingCookie.alias ? cookie : c))
        else
            setCookies([...cookies, cookie])

        setCurrentView('list-cookies')
        setEditingCookie(null)
    }

    const handleSwaggerSubmit = (swagger: SwaggerData) => {
        if (swagger.project) {
            addProject(swagger.project);
        }
        
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

    const pageGroups = {
        main: ["list-cookies", "list-swaggers", "settings"],
        cookieDetail: ["add-cookie", "edit-cookie"],
        swaggerDetail: ["add-swagger", "edit-swagger"]
    };

    const getPageGroup = (view: string) => {
        for (const [group, pages] of Object.entries(pageGroups)) {
            if (pages.includes(view)) return group;
        }
        return "main";
    };

    const changeView = (newView: PageViewTypes) => {
        const currentGroup = getPageGroup(currentView);
        const targetGroup = getPageGroup(newView);
        
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

    const handleDeleteProject = (projectName: string) => {
        removeProject(projectName);
        toast.success(`"${projectName}" project deleted`);
    };

    const handleImport = (importedData: any) => {
        if (importedData.cookies) setCookies(importedData.cookies);
        if (importedData.swaggers) setSwaggers(importedData.swaggers);
        if (importedData.settings) updateSettings(importedData.settings);
        
        setActiveProject(null);
        localStorage.removeItem("cookify_selected_global_project");
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
                addProject,
                handleDeleteProject,
                
                settings, updateSettings,
                
                activeProject, setActiveProject,
                handleImport
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


