import React, {useState} from 'react';
import {Trash2} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog.tsx"
import {useGlobalContext} from "@/context/global-context.tsx";
import {CookieData, SwaggerData} from "@/types/types.ts";
import toast from "react-hot-toast";

interface DeleteBtnProps {
    data: CookieData | SwaggerData,
}

const DeleteBtn = ({data}: DeleteBtnProps) => {
    const {handleDeleteProfile} = useGlobalContext()
    const [isOpen, setIsOpen] = useState<boolean>(false)

    const handleDeleteClick = () => {
        setIsOpen(false)
        handleDeleteProfile(data)
        toast.success("Profile deleted successfully!")
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div
                    className="w-full flex items-center gap-2 "
                >
                    <Trash2 className="h-4 w-4"/> Delete Profile
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="gap-4">

                    <div className="space-y-2 text-center">
                        <DialogTitle>
                            Are you sure?
                        </DialogTitle>
                        <div className="text-base flex justify-center items-center gap-4 w-full">
                            <div
                                className="flex items-center justify-center bg-red-100 p-3 rounded-full aspect-square ">
                                <Trash2 className="h-5 w-5 text-red-600"/>
                            </div>
                            <div className="text-left">
                                You are about to delete <span
                                className="font-medium text-foreground">{data.alias}</span> cookie.
                                <br/>
                                This action cannot be undone.
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-red-500 hover:bg-red-500/80"
                            onClick={handleDeleteClick}
                        >
                            <Trash2 className="h-4 w-4"/>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogHeader>
            </DialogContent>
        </Dialog>

    );
};

export default DeleteBtn;