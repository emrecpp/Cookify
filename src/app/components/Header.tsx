import {Button} from "@/components/ui/button"
import {PlusCircle} from 'lucide-react'
import {motion} from 'framer-motion'
import {useGlobalContext} from "@/context/global-context.tsx";
import React from "react";

interface HeaderProps {
    onSettingsClick: () => void
    onAddClick: () => void
}

export function Header({onSettingsClick, onAddClick}: HeaderProps) {
    const {currentView, setCurrentView} = useGlobalContext()
    return (
        <div>
            <motion.header
                className="flex justify-between items-center select-none "
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}>
                <motion.h1
                    className="text-lg font-bold flex items-center cursor-pointer"
                    whileHover={{scale: 1.05}}
                    whileTap={{scale: 0.95}}
                    onClick={() => setCurrentView('list-cookies')}
                >
                    <img src="/icon.png" alt="Kurabiye" width={24} height={24} className="mr-1 h-4 w-4"/>
                    Kurabiye
                </motion.h1>

                <div className="space-x-2">
                    {!["add", "edit"].includes(currentView) && (
                        <Button variant="outline" size="sm" onClick={onAddClick}>
                            <PlusCircle className="h-4 w-4"/> Add New Cookie
                        </Button>
                    )}
                </div>
            </motion.header>
            <div className="w-full bg-gray-300 h-[1px] my-2 mb-6"/>
        </div>
    )
}

