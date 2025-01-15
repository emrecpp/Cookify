import React from 'react';
import {DropdownMenuItem} from "@/components/ui/dropdown-menu.tsx";
import {Cookie} from "lucide-react";
import {CookieData} from "@/types/types.ts";
import {handleRemoveCookie} from "@/hooks/useCookie.ts";


const RemoveCookie = ({cookie}: { cookie: CookieData }) => {
    return (
        <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={async () => await handleRemoveCookie(cookie)}
            variant="outline"
            size="sm"
        >
            <Cookie className="h-4 w-4"/> Remove Cookie
        </DropdownMenuItem>
    );
};

export default RemoveCookie;