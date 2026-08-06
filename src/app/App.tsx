import TabPages from "@/app/pages/TabPages.tsx";
import {PageView, useGlobalContext} from "@/context/global-context";
import {sendMessage} from "@/lib/utils.ts";
import { isSyncConflictPage } from "@/lib/sync-conflict-page";
import {useEffect, useRef} from 'react';
import {Header} from './components/Header';
import { SyncConflictDialog } from "./components/sync/SyncConflictDialog";
import { GoogleDriveOnboardingDialog } from "./components/sync/GoogleDriveOnboardingDialog";
import { SyncConflictPage } from "./pages/SyncConflictPage";
import "@fontsource/inter";

export default function App() {
    const {setCurrentView, googleDriveSync} = useGlobalContext()
    const conflictPage = isSyncConflictPage()
    const setInitialView = useRef(setCurrentView)


    useEffect(() => {
        const initializeExtension = async () => {
            if (conflictPage) return
            try {
                const {isSwagger} = await sendMessage("isSwagger", {})
                setInitialView.current(isSwagger ? PageView.LIST_SWAGGERS : PageView.LIST_COOKIES)
            } catch (error) {
                console.error('Initialization error:', error.message)
                setInitialView.current(PageView.LIST_COOKIES)
            }
        }

        initializeExtension()
    }, [conflictPage])

    if (conflictPage) {
        return <SyncConflictPage />
    }



    return (
        <div className="min-w-[600px] max-w-[700px] h-[600px] mx-auto flex flex-col p-2">
            {googleDriveSync.isSyncing && (
                <div className="google-drive-progress fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-muted" role="progressbar" aria-label="Syncing with Google Drive" />
            )}
            <GoogleDriveOnboardingDialog />
            <SyncConflictDialog />
            <div className="fixed top-0 left-0 right-0 z-50 bg-background max-w-[700px] mx-auto ">
                <Header/>
            </div>
            <div className="flex-grow overflow-auto flex flex-col pt-[56px] h-full">
                <TabPages/>
            </div>
        </div>
    )
}
