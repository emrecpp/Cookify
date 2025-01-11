import React from 'react';
import {Edit, Grip} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {useGlobalContext} from "@/context/global-context.tsx";

import {CookieData} from "@/types/types.ts";
import DeleteBtn from "@/app/components/DeleteBtn.tsx";
import RemoveCookie from "@/app/components/RemoveCookie.tsx";

const OptionsBtn = ({cookie}: { cookie: CookieData }) => {
    const {handleEditCookie} = useGlobalContext()

    return (

        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button
                    className="w-full"
                    onClick={() => handleEditCookie(cookie)}
                    variant="outline"
                    size="sm"
                >
                    <Grip className="h-4 w-4"/> Options
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="select-none">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuItem
                    className="w-full cursor-pointer"
                    onClick={() => handleEditCookie(cookie)}
                    variant="outline"
                    size="sm"
                >
                    <Edit className="h-4 w-4"/> Edit
                </DropdownMenuItem>
              <RemoveCookie cookie={cookie}/>
                <DropdownMenuItem
                    onClick={(e) =>
                        e.preventDefault()}
                    className="bg-red-500 hover:bg-red-500/80 focus:bg-red-500/80 active:bg-red-500/70
                text-white focus:text-white active:text-white cursor-pointer">
                    <DeleteBtn cookie={cookie}/>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

    );
};

export default OptionsBtn;