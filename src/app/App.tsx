import React, {useEffect, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {CookieList} from './components/CookieList'
import {Header} from './components/Header'
import {Settings} from './components/Settings'
import {CookieForm} from './components/CookieForm'
import {CookieData} from "@/types/types"
import {useGlobalContext} from "@/context/global-context"
import {exportToFile} from "@/lib/utils.ts";

const STORAGE_KEY = 'kurabiye'

export default function App() {
    const {currentView, setCurrentView, cookies, setCookies} = useGlobalContext()
    const [editingCookie, setEditingCookie] = useState<CookieData | null>(null)

    useEffect(() => {
        const savedCookies = localStorage.getItem(STORAGE_KEY)
        if (savedCookies) {
            setCookies(JSON.parse(savedCookies)["cookies"])
        }
    }, [])

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, exportToFile(cookies))
    }, [cookies])


    const renderView = () => {
        switch (currentView) {
            case 'list':
                return (
                    <CookieList/>
                )
            case 'settings':
                return (
                    <Settings/>
                )
            case 'add':
            case 'edit':
                return (
                    <CookieForm
                        initialData={editingCookie || undefined}
                        onBack={() => {
                            setCurrentView('list')
                            setEditingCookie(null)
                        }}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="min-w-[600px] max-w-[700px] min-h-[350px] mx-auto p-4">
            <Header
                onSettingsClick={() => setCurrentView('settings')}
                onAddClick={() => {
                    setEditingCookie(null)
                    setCurrentView('add')
                }}
            />
            <div className="w-full bg-gray-300 h-[1px] my-2 mb-6"/>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{opacity: 0, x: currentView === 'list' ? 0 : 100}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: currentView === 'list' ? -100 : 200}}
                    transition={{duration: 0.3}}
                >
                    {renderView()}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
