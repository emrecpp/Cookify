import React from 'react';
import {useGlobalContext} from "@/context/global-context.tsx";
import {CookieList} from "@/app/components/CookieList.tsx";
import {CookieForm} from "@/app/components/CookieForm.tsx";
import {AnimatePresence, motion} from "framer-motion";
import {SettingsPage} from "@/app/components/SettingsPage.tsx";

const CookiesMainPage = () => {
    const {currentView, setCurrentView, cookies, setCookies, editingCookie, setEditingCookie} = useGlobalContext()
    const renderView = () => {
        switch (currentView) {
            case 'list-cookies':
                return (
                    <CookieList/>
                )
            case 'settings':
                return (
                    <SettingsPage/>
                )
            case 'add':
            case 'edit':
                return (
                    <CookieForm
                        initialData={editingCookie || undefined}
                        onBack={() => {
                            setCurrentView('list-cookies')
                            setEditingCookie(null)
                        }}
                    />
                )
            default:
                return null
        }
    }
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0, x: currentView === 'list-cookies' ? 0 : 100}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: currentView === 'list-cookies' ? -100 : 200}}
                transition={{duration: 0.3}}
            >
                {renderView()}
            </motion.div>
        </AnimatePresence>
    );
};

export default CookiesMainPage;