import React from 'react';
import {useGlobalContext} from "@/context/global-context.tsx";
import {CookieList} from "@/app/components/cookie/CookieList.tsx";
import {CookieForm} from "@/app/components/cookie/CookieForm.tsx";
import {AnimatePresence, motion} from "framer-motion";
import {SettingsPage} from "@/app/pages/SettingsPage.tsx";

const CookiesMainPage = () => {
    const {currentView, setCurrentView, cookies, setCookies, editingCookie, setEditingCookie} = useGlobalContext()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                className="w-full"
                key={currentView}
                initial={{opacity: 0, x: currentView === 'list-cookies' ? 0 : 100}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: currentView === 'list-cookies' ? -100 : 200}}
                transition={{duration: 0.3}}
            >
                <CookieList/>
            </motion.div>
        </AnimatePresence>
    );
};

export default CookiesMainPage;