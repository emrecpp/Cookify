import React from 'react';
import {DropdownMenuItem} from "@/components/ui/dropdown-menu.tsx";
import {Cookie} from "lucide-react";
import {CookieData} from "@/types/types.ts";
import {useDeleteCookie} from "@/hooks/useCookie.ts";


const DropdownItemDeleteCookie = ({data}: { data: CookieData }) => {
    const handleClick = async () => {
        await useDeleteCookie(data)
    }

    return (
        <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={handleClick}
            variant="outline"
            size="sm"
        >
            <Cookie className="h-4 w-4"/> Delete Cookie
        </DropdownMenuItem>
    );
};

export default DropdownItemDeleteCookie;