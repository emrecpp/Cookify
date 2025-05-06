import TabPages from "@/app/pages/TabPages.tsx";
import { useGlobalContext } from "@/context/global-context";
import { useEffectAfterMount } from "@/hooks/useEffectAfterMount.ts";
import { exportToFile, getTabInfo, sendMessage } from "@/lib/utils.ts";
import { useEffect } from 'react';
import { Header } from './components/Header';

/* Temporary solution for react-beautiful-dnd with React 18 */
import React from 'react';
// @ts-ignore
window.React = React;

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

            setCookies(data.cookies)
            setSwaggers(data.swaggers)

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

        /* When the page is refreshed, ensure automatic login on extension click */
        chrome.webNavigation.onCompleted.addListener(handlePageLoad)

        initializeExtension().catch(console.error)

        return () => {
            chrome.webNavigation.onCompleted.removeListener(handlePageLoad)
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
            <div className="flex-grow overflow-auto flex flex-col pt-[56px]">
                <TabPages/>
            </div>
        </div>
    )
}
