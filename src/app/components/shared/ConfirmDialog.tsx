import { Button } from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { ReactNode, useState } from 'react';

interface ConfirmDialogProps {
    title: string;
    content: ReactNode;
    actionText: string;
    actionIcon: ReactNode;
    triggerElement: ReactNode;
    onConfirm: () => void;
    actionButtonClassName?: string;
}

export const ConfirmDialog = ({
    title,
    content,
    actionText,
    actionIcon,
    triggerElement,
    onConfirm,
    actionButtonClassName = ""
}: ConfirmDialogProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleAction = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {triggerElement}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="gap-4">
                    <div className="space-y-2 text-center">
                        <DialogTitle>
                            {title}
                        </DialogTitle>
                        <div className="text-base flex justify-center items-center gap-4 w-full">
                            {content}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            className={actionButtonClassName}
                            onClick={handleAction}
                        >
                            {actionIcon}
                            {actionText}
                        </Button>
                    </DialogFooter>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}; 