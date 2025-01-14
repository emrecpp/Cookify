import React, {useEffect, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {CookieList} from './components/CookieList'
import {Header} from './components/Header'
import {Settings} from './components/Settings'
import {CookieForm} from './components/CookieForm'
import {CookieData} from "@/types/types"
import {useGlobalContext} from "@/context/global-context"
import {exportToFile} from "@/lib/utils.ts";
import TabPages from "@/app/components/TabPages.tsx";

const STORAGE_KEY = 'kurabiye'

export default function App() {
    const {currentView, setCurrentView, cookies, setCookies, editingCookie, setEditingCookie} = useGlobalContext()

    useEffect(() => {
        const savedCookies = localStorage.getItem(STORAGE_KEY)
        if (savedCookies) {
            setCookies(JSON.parse(savedCookies)["cookies"])
        }
    }, [])

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, exportToFile(cookies))
    }, [cookies])




    return (
        <div className="min-w-[600px] max-w-[700px] min-h-[350px] mx-auto p-4 flex flex-col justify-between">

            <Header
                onSettingsClick={() => setCurrentView('settings')}
                onAddClick={() => {
                    setEditingCookie(null)
                    setCurrentView('add')
                }}
            />


            <TabPages/>
        </div>
    )
}
