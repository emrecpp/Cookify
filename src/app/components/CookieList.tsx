import {CookieItem} from './CookieItem'
import {motion} from 'framer-motion'
import {useGlobalContext} from "@/context/global-context.tsx";


export function CookieList() {
    const {cookies} = useGlobalContext()

    return (
        <div>
            {cookies.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-gray-500 text-center"
                >
                    No cookies have been added yet...
                </motion.p>
            ) : (
                <motion.ul
                    className="space-y-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {transition: {staggerChildren: 0.1}},
                    }}
                >
                    {cookies.map((cookie, index) => (
                        <CookieItem
                            key={cookie.alias}
                            cookie={cookie}
                            index={index}
                        />
                    ))}
                </motion.ul>
            )}
        </div>
    )
}

