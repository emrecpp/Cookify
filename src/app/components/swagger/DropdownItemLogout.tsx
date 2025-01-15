import React from 'react';
import {DropdownMenuItem} from "@/components/ui/dropdown-menu.tsx";
import {SwaggerData} from "@/types/types.ts";
import {LogOutIcon} from "lucide-react";
import {useLogoutSwagger} from "@/hooks/useSwagger.ts";


const DropdownItemLogout = ({data}: { data: SwaggerData }) => {
    const handleClick = async () => {
        await useLogoutSwagger(data)
    }

    return (
        <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={handleClick}
            variant="outline"
            size="sm"
        >
            <LogOutIcon className="h-4 w-4"/> Logout Swagger
        </DropdownMenuItem>
    );
};

export default DropdownItemLogout;