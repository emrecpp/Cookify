import { CookieItem } from './CookieItem'
import { motion } from 'framer-motion'
import {CookieData} from "@/types/types.ts";

interface CookieListProps {
    cookies: CookieData[]
    onRemoveCookie: (alias: string) => void
    onApplyCookie: (cookie: CookieData) => void
}

export function CookieList({ cookies, onRemoveCookie, onApplyCookie }: CookieListProps) {
    return (
        <div>
            <motion.h2
                className="text-2xl font-semibold mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                Kurabiye Listesi
            </motion.h2>
            {cookies.length === 0 ? (
                <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    Henüz kurabiye yok.
                </motion.p>
            ) : (
                <motion.ul
                    className="space-y-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.1 } },
                    }}
                >
                    {cookies.map((cookie, index) => (
                        <CookieItem
                            key={cookie.alias}
                            cookie={cookie}
                            onRemove={onRemoveCookie}
                            onApply={onApplyCookie}
                            index={index}
                        />
                    ))}
                </motion.ul>
            )}
        </div>
    )
}

