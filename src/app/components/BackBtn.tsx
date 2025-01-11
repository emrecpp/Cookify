import React from 'react';
import {Button} from "@/components/ui/button.tsx";
import {ArrowLeft} from "lucide-react";
import {useGlobalContext} from "@/context/global-context.tsx";

const BackBtn = () => {
    const {setCurrentView, setEditingCookie} = useGlobalContext()

    const handleClick = () => {
        setCurrentView('list')

        setTimeout(() => { // Since it slides to the previous form with an animation, if the text changes instantly, the new text becomes visible. To prevent this...
            setEditingCookie(null)
        }, 200)
    }

    return (
        <div className="absolute left-0 top-0 select-none">
            <Button type="button" variant="ghost" onClick={handleClick}>
                <ArrowLeft className="mr-2 h-4 w-4"/> Back
            </Button>
        </div>
    );
};

export default BackBtn;