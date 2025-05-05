import { ConfirmDialog } from "@/app/components/shared/ConfirmDialog.tsx";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
    title?: string;
    itemName: string;
    itemType: string;
    onConfirm: () => void;
    triggerText?: string;
}

export const ConfirmDeleteDialog = ({
    title = "Are you sure?",
    itemName,
    itemType,
    onConfirm,
    triggerText = "Delete Profile"
}: ConfirmDeleteDialogProps) => {
    const dialogContent = (
        <>
            <div className="flex items-center justify-center bg-red-100 p-3 rounded-full aspect-square">
                <Trash2 className="h-5 w-5 text-red-600"/>
            </div>
            <div className="text-left">
                You are about to delete <span className="font-medium text-foreground">{itemName}</span> {itemType}.
                <br/>
                This action cannot be undone.
            </div>
        </>
    );

    return (
        <ConfirmDialog
            title={title}
            content={dialogContent}
            actionText="Delete"
            actionIcon={<Trash2 className="h-4 w-4 mr-1.5"/>}
            actionButtonClassName="bg-red-500 hover:bg-red-500/80"
            onConfirm={onConfirm}
            triggerElement={
                <div className="w-full flex items-center gap-2">
                    <Trash2 className="h-4 w-4 mr-1.5"/> {triggerText}
                </div>
            }
        />
    );
}; 