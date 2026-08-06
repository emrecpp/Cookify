import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalContext } from "@/context/global-context";
import { GoogleDriveIcon } from "@/app/components/sync/GoogleDriveIcon";
import { useEffect, useState } from "react";

const GOOGLE_DRIVE_ONBOARDING_KEY = "CookifyGoogleDriveOnboardingSeen";

export function GoogleDriveOnboardingDialog() {
    const {
        isInitialized,
        isGoogleDriveConfigured,
        googleDriveSync,
        connectGoogleDrive,
    } = useGlobalContext();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!isInitialized || !isGoogleDriveConfigured) return;
        const hasSeenOnboarding = localStorage.getItem(GOOGLE_DRIVE_ONBOARDING_KEY) === "true";
        if (hasSeenOnboarding) return;

        if (googleDriveSync.enabled) {
            localStorage.setItem(GOOGLE_DRIVE_ONBOARDING_KEY, "true");
            return;
        }
        setOpen(true);
    }, [googleDriveSync.enabled, isGoogleDriveConfigured, isInitialized]);

    const dismiss = () => {
        localStorage.setItem(GOOGLE_DRIVE_ONBOARDING_KEY, "true");
        setOpen(false);
    };

    const importFromGoogleDrive = () => {
        dismiss();
        void connectGoogleDrive();
    };

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GoogleDriveIcon /> Google Drive
                    </DialogTitle>
                    <DialogDescription>
                        Restore or merge your Cookify data from Google Drive.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={dismiss}>Not now</Button>
                    <Button type="button" onClick={importFromGoogleDrive}>
                        <GoogleDriveIcon /> Import from Google Drive
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
