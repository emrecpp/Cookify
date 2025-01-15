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

import {SwaggerData} from "@/types/types.ts";

const SwaggerOptionsBtn = ({Swagger}: { Swagger: SwaggerData }) => {
    const {handleEditSwagger} = useGlobalContext()

    return (

        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button
                    className="w-full"
                    onClick={() => handleEditSwagger(Swagger)}
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
                    onClick={() => handleEditSwagger(Swagger)}
                    variant="outline"
                    size="sm"
                >
                    <Edit className="h-4 w-4"/> Edit
                </DropdownMenuItem>
                <RemoveSwagger Swagger={Swagger}/>
                <DropdownMenuItem
                    onClick={(e) =>
                        e.preventDefault()}
                    className="bg-red-500 hover:bg-red-500/80 focus:bg-red-500/80 active:bg-red-500/70
                text-white focus:text-white active:text-white cursor-pointer">
                    <SwaggerDeleteBtn Swagger={Swagger}/>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

    );
};

export default SwaggerOptionsBtn;