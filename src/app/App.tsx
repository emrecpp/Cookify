import React, {useEffect} from 'react'
import {Header} from './components/Header'
import {useGlobalContext} from "@/context/global-context"
import {exportToFile, getTabInfo, sendMessage} from "@/lib/utils.ts";
import TabPages from "@/app/pages/TabPages.tsx";
import {useEffectAfterMount} from "@/hooks/useEffectAfterMount.ts";


const STORAGE_KEY = 'Cookify'

export default function App() {
    const {cookies, setCookies, swaggers, setSwaggers, setCurrentView} = useGlobalContext()


    useEffect(() => {
        const handleAutoLogin = async (tabId: number, swagger: any) => {
            const key = `hasRun_${tabId}`
            const result = await chrome.storage.local.get([key])

            if (!result[key]) {
                await chrome.storage.local.set({[key]: true})
                await sendMessage("loginSwagger", {bearerToken: swagger.bearerToken})

                chrome.tabs.onRemoved.addListener((closedTabId) => {
                    if (closedTabId === tabId)
                        chrome.storage.local.remove(key)
                })
            }
        }

        const initializeExtension = async () => {
            const savedCookies = localStorage.getItem(STORAGE_KEY)
            if (!savedCookies) return

            const {tabs} = await getTabInfo()
            const data = JSON.parse(savedCookies)

            // Update global state
            setCookies(data.cookies)
            setSwaggers(data.swaggers)

            // Handle Swagger specific logic
            const {isSwagger} = await sendMessage("isSwagger", {})
            setCurrentView(isSwagger ? "list-swaggers" : "list-cookies")


            if (isSwagger && data.swaggers.length > 0) {
                const autoLoginSwagger = data.swaggers.find(swagger => swagger.autoLogin)
                if (autoLoginSwagger)
                    await handleAutoLogin(tabs[0].id, autoLoginSwagger)

            }
        }

        const handlePageLoad = async (details: chrome.webNavigation.NavFrameDetails) => {
            if (details.frameId === 0) { // Main frame only
                const {tabs} = await getTabInfo()
                chrome.storage.local.remove(`hasRun_${tabs[0].id}`)
                initializeExtension().catch(console.error)
            }
        }

        // Set up listeners
        chrome.webNavigation.onCompleted.addListener(handlePageLoad) // "When the page is refreshed, if the Swagger docs are open, ensure the user can automatically log in again when the extension is clicked."


        initializeExtension().catch(console.error)

        return () => {
            chrome.webNavigation.onCompleted.removeListener(handlePageLoad)
        }
    }, [])

    useEffectAfterMount(() => {
        localStorage.setItem(STORAGE_KEY, exportToFile(cookies, swaggers))
    }, [cookies, swaggers])


    return (
        <div className="min-w-[600px] max-w-[700px] min-h-[375px] mx-auto p-4 flex flex-col justify-between">
            <Header/>
            <TabPages/>
        </div>
    )
}
