
import {motion} from 'framer-motion'
import {useGlobalContext} from "@/context/global-context.tsx";
import SwaggerSVG from "@/svg/swagger.tsx";
import {SwaggerItem} from "@/app/components/swagger/SwaggerItem.tsx";
import {SwaggerData} from "@/types/types.ts";



export function SwaggerList() {
    const {swaggers} = useGlobalContext()

    return (
        <div className="w-full flex justify-center items-center">
            {swaggers.length === 0 ? (
                <motion.p
                    initial={{opacity: 0, x: 0, y: -20}}
                    animate={{opacity: 1, x: 0, y: 0}}
                    transition={{duration: 0.3, delay: 0.2}}
                    className="text-muted-foreground text-center text-sm select-none flex items-center gap-2"
                >
                    <SwaggerSVG className="w-4 h-4 "/>
                    No Swaggers have been added yet...
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
                    {swaggers.map((swagger: SwaggerData, index: number) => (
                        <SwaggerItem
                            key={swagger.alias + "-" + index}
                            swagger={swagger}
                            index={index}
                        />
                    ))}
                </motion.ul>
            )}


        </div>
    )
}

