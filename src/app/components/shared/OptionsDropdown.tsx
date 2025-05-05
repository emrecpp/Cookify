import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { CookieData, SwaggerData } from "@/types/types.ts";
import { Edit, MoreHorizontal } from "lucide-react";
import { ReactNode } from "react";

interface OptionsDropdownProps {
    data: CookieData | SwaggerData;
    onEdit: (data: CookieData | SwaggerData) => void;
    customMenuItems?: ReactNode;
    deleteButton: ReactNode;
}

export const OptionsDropdown = ({ data, onEdit, customMenuItems, deleteButton }: OptionsDropdownProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div
                    className="w-full shadow-sm font-medium text-xs px-3 border-input border rounded-md whitespace-nowrap gap-2 justify-center items-center h-8 inline-flex select-none"
                >
                    <MoreHorizontal className="h-4 w-4"/> Options
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="select-none">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                
                <DropdownMenuItem
                    className="w-full cursor-pointer"
                    onClick={() => onEdit(data)}
                >
                    <Edit className="h-4 w-4 mr-1.5"/> Edit
                </DropdownMenuItem>
                
                {customMenuItems}
                
                <DropdownMenuItem
                    onClick={(e) => e.preventDefault()}
                    className="bg-red-500 hover:bg-red-500/80 focus:bg-red-500/80 active:bg-red-500/70
                    text-white focus:text-white active:text-white cursor-pointer"
                >
                    {deleteButton}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}; 