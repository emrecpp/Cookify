import React from 'react';
import {useGlobalContext} from "@/context/global-context.tsx";
import {CookieList} from "@/app/components/cookie/CookieList.tsx";
import {CookieForm} from "@/app/components/cookie/CookieForm.tsx";
import {AnimatePresence, motion} from "framer-motion";
import {SwaggerList} from "@/app/components/swagger/SwaggerList.tsx";

const SwaggerMainPage = () => {
    const {currentView, setCurrentView, swaggers, setSwaggers, editingCookie, setEditingCookie} = useGlobalContext()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0, x: currentView === 'list-swaggers' ? 0 : 100}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: currentView === 'list-swaggers' ? -100 : 200}}
                transition={{duration: 0.3}}
            >
                <SwaggerList/>

            </motion.div>
        </AnimatePresence>
    );
};

export default SwaggerMainPage;