import {Button} from "@/components/ui/button.tsx"
import {Card, CardContent} from "@/components/ui/card.tsx"
import {motion} from 'framer-motion'
import {Check, Copy, KeyRound, LogInIcon} from 'lucide-react'
import {SwaggerData} from "@/types/types.ts"
import {useGlobalContext} from "@/context/global-context.tsx";
import OptionsBtn from "@/app/components/OptionsBtn.tsx";
import toast from "react-hot-toast";
import {Separator} from "@/components/ui/Separator.tsx";

interface SwaggerItemProps {
    swagger: SwaggerData
}

export function SwaggerItem({swagger}: SwaggerItemProps) {
    const {handleApply} = useGlobalContext()
    const handleCopy = () => {
        navigator.clipboard.writeText(swagger.bearerToken || "")
        toast.success("Bearer Token copied to clipboard!")
    }

    return (
        <motion.li
            variants={{
                hidden: {opacity: 0, x: -20},
                visible: {opacity: 1, x: 0},
            }}
            transition={{duration: 0.3}}
            className="w-full"
        >
            <Card className="w-full">
                <CardContent className="flex items-center justify-between p-4 gap-4 relative min-h-[130px] ">
                    <div className="w-full">
                        <h3 className="font-bold text-lg mb-2">{swagger.alias}</h3>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2">
                            <div
                                className="col-span-2 text-sm text-gray-500 flex items-center gap-1 text-wrap w-full break-all max-h-20 overflow-hidden h-8">
                                <KeyRound className="w-4 h-4 mt-0.5 "/><strong
                                className="text-nowrap select-none">Bearer
                                Token:</strong>
                                {/*{swagger.bearerToken?.slice(0, 40) + (swagger.bearerToken?.length > 40 ? "..." : "")}*/}

                                <Button onClick={handleCopy} variant="outline" className="text-xs h-6 px-2">
                                    <Copy className="!w-3 !h-3"/>
                                    Copy

                                </Button>
                            </div>
                            <div
                                className="col-span-2 text-sm text-gray-500 flex items-center gap-1 text-wrap w-full break-all max-h-20 overflow-hidden h-8">
                                <LogInIcon className="w-4 h-4 "/><strong
                                className="text-nowrap select-none">Auto
                                Login:</strong> {swagger.autoLogin === "true" ? "Enabled" : "Disabled"}
                            </div>
                        </div>

                    </div>
                    <div className="space-x-2 flex items-center justify-end mt-auto">
                        <div className="w-full flex flex-col gap-2">
                            <OptionsBtn data={swagger}/>
                            <Button
                                className="bg-primary/90 text-white hover:bg-primary/70 hover:text-white"
                                onClick={() => handleApply(swagger)}
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

