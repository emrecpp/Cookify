import { Button } from "@/components/ui/button"
import { Settings, PlusCircle, Cookie } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeaderProps {
    onSettingsClick: () => void
    onAddClick: () => void
}

export function Header({ onSettingsClick, onAddClick }: HeaderProps) {
    return (
        <motion.header
            className="flex justify-between items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.h1
                className="text-lg font-bold flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Cookie className="mr-1 h-4 w-4" /> Kurabiye
            </motion.h1>

            <div className="space-x-2">
                <Button variant="ghost" size="icon" onClick={onAddClick}>
                    <PlusCircle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                    <Settings className="h-5 w-5" />
                </Button>
            </div>
        </motion.header>
    )
}

