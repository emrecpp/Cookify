import { CookieList } from "@/app/components/cookie/CookieList.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { AnimatePresence, motion } from "framer-motion";

const CookiesMainPage = () => {
    const {currentView, animationDirection} = useGlobalContext()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                className="w-full overflow-hidden min-h-[300px] h-full"
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.3}}
            >
                <CookieList/>
            </motion.div>
        </AnimatePresence>
    );
};

export default CookiesMainPage;