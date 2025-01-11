"use client"
import React, {createContext, ReactNode, useContext, useState} from 'react';
import {CookieData, PageViewTypes} from "@/types/types.ts";
import toast from "react-hot-toast";


interface GlobalContextState {
    currentView: PageViewTypes;
    setCurrentView: (view: PageViewTypes) => void;
}

export const GlobalContext = createContext<GlobalContextState | any>(undefined);

interface GlobalContextProps {
    children: ReactNode;
}

export const GlobalContextProvider: React.FC<GlobalContextProps> = ({children}) => {
    const [currentView, setCurrentView] = useState<PageViewTypes>('list')
    const [cookies, setCookies] = useState<CookieData[]>([])
    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null)


    const handleEditCookie = (cookie: CookieData) => {
        setEditingCookie(cookie);
        setCurrentView("edit");
    };
    const handleCookieSubmit = (cookie: CookieData) => {

        if (editingCookie) {
            setCookies(prevCookies => prevCookies.map(c => c.alias === editingCookie.alias ? cookie : c))
        } else {
            setCookies(prevCookies => [...prevCookies, cookie])
        }
        setCurrentView('list')
        setEditingCookie(null)
    }

    const handleDeleteProfile = (cookie: CookieData) => {
        setCookies(prevCookies => prevCookies.filter(c => c !== cookie))
    }


    // const handleApplyCookie = (cookie: CookieData) => {
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
                editingCookie, setEditingCookie,
                handleEditCookie, handleCookieSubmit, handleDeleteProfile
            }}>
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
}


