import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {motion} from 'framer-motion'
import {Check, Cookie, FilePen, Globe, GlobeLock} from 'lucide-react'
import {CookieData} from "@/types/types.ts"
import {useGlobalContext} from "@/context/global-context.tsx";
import OptionsBtn from "@/app/components/OptionsBtn.tsx";
import {handleApplyCookie} from "@/hooks/useCookie.ts";

interface CookieItemProps {
    cookie: CookieData
    index: number
}

export function CookieItem({cookie, index}: CookieItemProps) {
    const {handleEditCookie} = useGlobalContext()


    return (
        <motion.li
            variants={{
                hidden: {opacity: 0, x: -20},
                visible: {opacity: 1, x: 0},
            }}
            transition={{duration: 0.3}}
        >
            <Card>
                <CardContent className="flex items-center justify-between p-4 gap-4 relative min-h-[130px]">
                    <div>
                        <h3 className="font-bold text-lg mb-2">{cookie.alias}</h3>
                        <div className="grid grid-cols-2">
                            <div className="col-span-2 text-sm text-gray-500 flex items-center gap-1"><Cookie
                                className="w-4 h-4"/><strong>Name:</strong> {cookie.name}</div>
                            <div
                                className="col-span-2 text-sm text-gray-500 flex items-center gap-1 text-wrap w-full break-all max-h-20 overflow-hidden">
                                <FilePen className="w-4 h-4 mb-auto"/><strong
                                className="text-nowrap mb-auto">Value:</strong> {cookie.value.slice(0, 60) + (cookie.value.length > 60 && "...")}
                            </div>
                            <div className="col-span-2 text-sm text-gray-500 flex items-center gap-1"><Globe
                                className="w-4 h-4"/><strong>URL:</strong> {cookie.url ? cookie.url : "auto (current URL)"}
                            </div>
                            <div className="col-span-2 text-sm text-gray-500 flex items-center gap-1"><GlobeLock
                                className="w-4 h-4"/><strong>Domain:</strong> {cookie.domain ? cookie.domain : "auto (current domain)"}
                            </div>
                        </div>

                    </div>
                    <div className="space-x-2 flex items-center justify-end mt-auto">
                        <div className="w-full flex flex-col gap-2">
                            <OptionsBtn cookie={cookie}/>
                            <Button
                                className="bg-primary/90 text-white hover:bg-primary/70 hover:text-white"
                                onClick={async () => await handleApplyCookie(cookie)}
                                variant="outline"
                                size="sm"
                            >
                                <Check className="h-4 w-4"/> Apply
                            </Button>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </motion.li>
    )
}

