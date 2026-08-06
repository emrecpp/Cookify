import { GoogleDriveIcon } from "@/app/components/sync/GoogleDriveIcon";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalContext } from "@/context/global-context";
import { openSyncConflictPage } from "@/lib/sync-conflict-page";
import { ExternalLink, ShieldAlert } from "lucide-react";

export function SyncConflictDialog() {
    const { googleDriveSync } = useGlobalContext();
    const conflicts = googleDriveSync.conflicts;

    const openResolver = async () => {
        await openSyncConflictPage(true);
        window.close();
    };

    return (
        <Dialog open={conflicts.length > 0}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" /> Sync conflicts found
                    </DialogTitle>
                    <DialogDescription>
                        Compare {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} in the full-page resolver.
                    </DialogDescription>
                </DialogHeader>
                <Button className="w-full" onClick={() => void openResolver()}>
                    <GoogleDriveIcon /> Open conflict resolver <ExternalLink className="ml-auto" />
                </Button>
            </DialogContent>
        </Dialog>
    );
}
