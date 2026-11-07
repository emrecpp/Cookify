import TabPages from "@/app/pages/TabPages.tsx";
import {PageView, useGlobalContext} from "@/context/global-context";
import {sendMessage} from "@/lib/utils.ts";
import { isSyncConflictPage } from "@/lib/sync-conflict-page";
import {useEffect, useRef} from 'react';
import {Header} from './components/Header';
import { SyncConflictDialog } from "./components/sync/SyncConflictDialog";
import { GoogleDriveOnboardingDialog } from "./components/sync/GoogleDriveOnboardingDialog";
import { SyncConflictPage } from "./pages/SyncConflictPage";
import "@fontsource/inter/index.css";

/** The active tab may never answer (busy, frozen or still loading): the popup must not stay empty until it does. */
const TAB_ANSWER_MS = 500

export default function App() {
    const {currentView, setCurrentView, googleDriveSync} = useGlobalContext()
    const conflictPage = isSyncConflictPage()
    const setInitialView = useRef(setCurrentView)
    const viewRef = useRef(currentView)
    viewRef.current = currentView


    useEffect(() => {
        if (conflictPage) return
        // Only the first view: a late answer doesn't replace the page the user went to meanwhile.
        const show = (view: PageView) => {
            if (viewRef.current === null) setInitialView.current(view)
        }
        const fallback = setTimeout(() => show(PageView.LIST_COOKIES), TAB_ANSWER_MS)
        const initializeExtension = async () => {
            try {
                const {isSwagger} = await sendMessage<{ isSwagger: boolean }>("isSwagger")
                show(isSwagger ? PageView.LIST_SWAGGERS : PageView.LIST_COOKIES)
            } catch (error) {
                console.error('Initialization error:', (error as Error).message)
                show(PageView.LIST_COOKIES)
            } finally {
                clearTimeout(fallback)
            }
        }

        initializeExtension()
        return () => clearTimeout(fallback)
    }, [conflictPage])

    if (conflictPage) {
        return <SyncConflictPage />
    }



    return (
        <div className="min-w-[600px] max-w-[700px] h-[600px] mx-auto flex flex-col p-2">
            {googleDriveSync.showProgress && (
                <div className="google-drive-progress fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-muted" role="progressbar" aria-label="Syncing with Google Drive" />
            )}
            <GoogleDriveOnboardingDialog />
            <SyncConflictDialog />
            <div className="relative z-50 shrink-0 bg-background">
                <Header/>
            </div>
            <div className="flex-grow overflow-auto flex flex-col h-full">
                <TabPages/>
            </div>
        </div>
    )
}
