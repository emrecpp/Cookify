import {CookieItem} from './CookieItem.tsx'
import {motion} from 'framer-motion'
import {useGlobalContext} from "@/context/global-context.tsx";
import {Cookie} from "lucide-react";
import {CookieData} from "@/types/types.ts";



export function CookieList() {
    const {cookies} = useGlobalContext()

    return (
        <div className="">

            {/*<Button onClick={handleClick}>test</Button>*/}
            {cookies.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-muted-foreground text-center text-sm select-none flex items-center gap-2 justify-center items-center"
                >
                    <Cookie className="w-4 h-4 "/>
                    No Cookies have been added yet...
                </motion.p>
            ) : (
                <motion.ul
                    className="space-y-2 w-full"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {transition: {staggerChildren: 0.1}},
                    }}
                >
                    {cookies.map((cookie: CookieData, index: number) => (
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

