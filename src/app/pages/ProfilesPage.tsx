import {ProfileList, ProfileType} from "@/app/components/shared/ProfileList.tsx";
import {useGlobalContext} from "@/context/global-context.tsx";
import {AnimatePresence, motion} from "framer-motion";

/** The Cookies and the Swaggers tab. */
const ProfilesPage = ({type}: { type: ProfileType }) => {
    const {currentView} = useGlobalContext()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                className="w-full overflow-hidden min-h-[300px] h-full"
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0}}
            >
                <ProfileList type={type}/>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProfilesPage;
