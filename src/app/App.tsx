import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CookieList } from './components/CookieList'
import { Header } from './components/Header'
import { Settings } from './components/Settings'
import { CookieForm } from './components/CookieForm'
import {CookieData} from "@/types/types.ts";


export default function App() {
    const [cookies, setCookies] = useState<CookieData[]>([])
    const [currentView, setCurrentView] = useState<'list' | 'settings' | 'add'>('list')

    useEffect(() => {
        const savedCookies = localStorage.getItem('kurabiyeCookies')
        if (savedCookies) {
            setCookies(JSON.parse(savedCookies))
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('kurabiyeCookies', JSON.stringify(cookies))
    }, [cookies])

    const addCookie = (cookie: CookieData) => {
        setCookies([...cookies, cookie])
        setCurrentView('list')
    }

    const removeCookie = (alias: string) => {
        setCookies(cookies.filter(c => c.alias !== alias))
    }

    const applyCookie = (cookie: CookieData) => {
        document.cookie = `${cookie.name}=${cookie.value}`
    }

    return (
        <div className="min-w-[500px] mx-auto p-4 ">
            <Header
                onSettingsClick={() => setCurrentView('settings')}
                onAddClick={() => setCurrentView('add')}
            />
            <div className="w-full bg-gray-300 h-[1px] my-2 mb-6"></div>
            <AnimatePresence mode="wait">
                {currentView === 'list' && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CookieList
                            cookies={cookies}
                            onRemoveCookie={removeCookie}
                            onApplyCookie={applyCookie}
                        />
                    </motion.div>
                )}
                {currentView === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 200 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Settings
                            cookies={cookies}
                            setCookies={setCookies}
                            onBack={() => setCurrentView('list')}
                        />
                    </motion.div>
                )}
                {currentView === 'add' && (
                    <motion.div
                        key="add"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 200 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CookieForm
                            onAddCookie={addCookie}
                            onBack={() => setCurrentView('list')}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

