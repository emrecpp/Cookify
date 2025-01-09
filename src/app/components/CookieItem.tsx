import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from 'framer-motion'
import { Check, Trash2 } from 'lucide-react'
import {CookieData} from "@/types/types.ts";

interface CookieItemProps {
    cookie: CookieData
    onRemove: (alias: string) => void
    onApply: (cookie: CookieData) => void
    index: number
}

export function CookieItem({ cookie, onRemove, onApply, index }: CookieItemProps) {
    return (
        <motion.li
            variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.3 }}
        >
            <Card>
                <CardContent className="flex items-center justify-between p-4 gap-4 relative">
                    <div>
                        <h3 className="font-bold">{cookie.alias}</h3>
                        <div className="text-sm text-gray-500"><strong>Key:</strong> {cookie.name}</div>
                        <div className="text-sm text-gray-500 text-wrap w-full break-all"><strong>Value:</strong> {cookie.value}</div>
                    </div>
                    <div className="space-x-2 flex items-center justify-end mt-auto">
                        <Button

                            className="absolute top-2 right-2 text-red-500 hover:text-red-500/90"
                            onClick={() => onRemove(cookie.alias)}
                            variant="ghost"
                            size="sm"
                        >
                            <Trash2 size={4} className="!h-4 !w-4" />
                        </Button>

                        <Button
                            onClick={() => onApply(cookie)}
                            variant="outline"
                            size="sm"
                        >
                            <Check className="h-4 w-4" /> Uygula
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.li>
    )
}

