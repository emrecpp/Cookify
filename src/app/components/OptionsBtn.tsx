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
} from "@/components/ui/dropdown-menu.tsx"

import {useGlobalContext} from "@/context/global-context.tsx";

import {CookieData, isCookieData, SwaggerData} from "@/types/types.ts";
import DeleteBtn from "@/app/components/DeleteBtn.tsx";
import DropdownItemDeleteCookie from "@/app/components/cookie/DropdownItemDeleteCookie.tsx";
import DropdownItemLogout from "@/app/components/swagger/DropdownItemLogout.tsx";

const OptionsBtn = ({data}: { data: CookieData | SwaggerData }) => {
    const {handleEdit} = useGlobalContext()
    const isCookie = isCookieData(data)
    const isSwagger = !isCookie

    return (

        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button
                    className="w-full"
                    onClick={() => handleEdit(data)}
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
                    onClick={() => handleEdit(data)}
                    variant="outline"
                    size="sm"
                >
                    <Edit className="h-4 w-4"/> Edit
                </DropdownMenuItem>
                {isCookie && <DropdownItemDeleteCookie data={data as CookieData}/>}
                {isSwagger && <DropdownItemLogout data={data as SwaggerData}/>}
                <DropdownMenuItem
                    onClick={(e) =>
                        e.preventDefault()}
                    className="bg-red-500 hover:bg-red-500/80 focus:bg-red-500/80 active:bg-red-500/70
                text-white focus:text-white active:text-white cursor-pointer">
                    <DeleteBtn data={data}/>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

    );
};

export default OptionsBtn;