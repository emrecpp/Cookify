"use client"
import React, {createContext, ReactNode, useContext, useState} from 'react';
import {CookieData, isCookieData, PageViewTypes, SwaggerData} from "@/types/types.ts";
import {useApplyCookie} from "@/hooks/useCookie.ts";
import {useApplySwagger} from "@/hooks/useSwagger.ts";


interface GlobalContextState {
    currentView: PageViewTypes;
    setCurrentView: React.Dispatch<React.SetStateAction<PageViewTypes>>;

    cookies: CookieData[];
    setCookies: React.Dispatch<React.SetStateAction<CookieData[]>>;

    swaggers: SwaggerData[];
    setSwaggers: React.Dispatch<React.SetStateAction<SwaggerData[]>>;

    editingCookie: CookieData | null;
    setEditingCookie: React.Dispatch<React.SetStateAction<CookieData | null>>;

    editingSwagger: SwaggerData | null;
    setEditingSwagger: React.Dispatch<React.SetStateAction<SwaggerData | null>>;

    handleEditCookie: (cookie: CookieData) => void;
    handleCookieSubmit: (cookie: CookieData) => void;
    handleDeleteProfile: (data: CookieData | SwaggerData) => void;

    handleSwaggerSubmit: (swagger: SwaggerData) => void;

}

export const GlobalContext = createContext<GlobalContextState | any>(undefined);

interface GlobalContextProps {
    children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({children}) => {
    const [currentView, setCurrentView] = useState<PageViewTypes>('list-cookies')

    const [cookies, setCookies] = useState<CookieData[]>([])
    const [swaggers, setSwaggers] = useState<SwaggerData[]>([])

    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null)
    const [editingSwagger, setEditingSwagger] = useState<SwaggerData | null>(null)


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
            setCookies(prevCookies => prevCookies.map(c => c.alias === editingCookie.alias ? cookie : c))
        else
            setCookies(prevCookies => [...prevCookies, cookie])

        setCurrentView('list-cookies')
        setEditingCookie(null)
    }

    const handleSwaggerSubmit = (swagger: SwaggerData) => {
        if (editingSwagger)
            setSwaggers(prevSwaggers => prevSwaggers.map(s => s.alias === editingSwagger.alias ? swagger : s))
        else
            setSwaggers(prevSwaggers => [...prevSwaggers, swagger])

        setCurrentView('list-swaggers')
        setEditingSwagger(null)
    }

    const handleDeleteProfile = (data: CookieData | SwaggerData) => {
        if (isCookieData(data))
            setCookies(prevCookies => prevCookies.filter(c => c !== data))
        else
            setSwaggers(prevSwaggers => prevSwaggers.filter(s => s !== data))
    }
    const handleApply = async (data: CookieData | SwaggerData) => {
        if (isCookieData(data))
            await useApplyCookie(data)
        else
            await useApplySwagger(data)
    }



    // const useApplyCookie = (cookie: CookieData) => {
    //     chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    //         const isDomainDynamic = !cookie.domain
    //
    //         if (tabs.length === 0)
    //             return toast.error("No active tab found!")
    //
    //
    //         const url = new URL(tabs[0].url);
    //         const protocol = url.protocol; // 'http:' or 'https:'
    //         const domain = url.hostname;
    //
    //
    //         console.log("protocol: ", protocol, "domain: ", domain, "isDomainDynamic: ", isDomainDynamic)
    //
    //         chrome.cookies.set({
    //             url: isDomainDynamic ? `${protocol}//${domain}` : cookie.domain,
    //             name: cookie.name,
    //             value: cookie.value,
    //             expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    //             secure: protocol === "https:",
    //             path: "/",
    //             sameSite: protocol === 'https:' ? "strict" : "lax"
    //         }, function (cookie) {
    //             if (cookie) {
    //                 console.log("Cookie set successfully:", cookie);
    //                 toast.success("Cookie applied successfully!")
    //             } else {
    //                 toast.error("Failed to set cookie!")
    //             }
    //         });
    //     });
    //
    // }

    return (
        <GlobalContext.Provider
            value={{
                currentView, setCurrentView,

                cookies, setCookies,
                swaggers, setSwaggers,

                editingCookie, setEditingCookie,
                editingSwagger, setEditingSwagger,

                handleEdit, handleApply,

                handleCookieSubmit, handleDeleteProfile,
                handleSwaggerSubmit
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


