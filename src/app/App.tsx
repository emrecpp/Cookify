import TabPages from "@/app/pages/TabPages.tsx";
import { useGlobalContext } from "@/context/global-context";
import { useEffectAfterMount } from "@/hooks/useEffectAfterMount.ts";
import {cn, exportToFile, getTabInfo, sendMessage} from "@/lib/utils.ts";
import { useEffect } from 'react';
import { Header } from './components/Header';
import "@fontsource/inter";

const STORAGE_KEY = 'Cookify'
export default function App() {
    const {cookies, setCookies, swaggers, setSwaggers, setCurrentView} = useGlobalContext()


    useEffect(() => {
        const initializeExtension = async () => {
            const savedCookies = localStorage.getItem(STORAGE_KEY)
            if (!savedCookies) return

            const {tabs} = await getTabInfo()
            const data = JSON.parse(savedCookies)

            setCookies(data.cookies)
            setSwaggers(data.swaggers)

            const {isSwagger} = await sendMessage("isSwagger", {})
            setCurrentView(isSwagger ? "list-swaggers" : "list-cookies")

        }

        initializeExtension().catch(console.error)

        return () => {
        }
    }, [])

    useEffectAfterMount(() => {
        localStorage.setItem(STORAGE_KEY, exportToFile(cookies, swaggers))
    }, [cookies, swaggers])


    return (
        <div className="min-w-[600px] max-w-[700px] h-[600px] mx-auto flex flex-col p-2">
            <div className="fixed top-0 left-0 right-0 z-50 bg-background max-w-[700px] mx-auto ">
                <Header/>
            </div>
            <div className="flex-grow overflow-auto flex flex-col pt-[56px] h-full">
                <TabPages/>
            </div>
        </div>
    )
}
