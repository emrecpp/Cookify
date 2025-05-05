import { SwaggerList } from "@/app/components/swagger/SwaggerList.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { AnimatePresence, motion } from "framer-motion";

const SwaggerMainPage = () => {
    const {currentView, animationDirection} = useGlobalContext()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.3}}
                className="w-full overflow-hidden min-h-[300px]"
            >
                <SwaggerList/>
            </motion.div>
        </AnimatePresence>
    );
};

export default SwaggerMainPage;