import React, {useEffect, useState} from 'react'
import {Header} from './components/Header'
import {useGlobalContext} from "@/context/global-context"
import {exportToFile} from "@/lib/utils.ts";
import TabPages from "@/app/pages/TabPages.tsx";

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

            <Header />


            <TabPages/>
        </div>
    )
}
