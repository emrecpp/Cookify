import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Edit, MoreHorizontal } from "lucide-react";

import { useGlobalContext } from "@/context/global-context.tsx";

import DeleteBtn from "@/app/components/DeleteBtn.tsx";
import DropdownItemDeleteCookie from "@/app/components/cookie/DropdownItemDeleteCookie.tsx";
import DropdownItemLogout from "@/app/components/swagger/DropdownItemLogout.tsx";
import { CookieData, isCookieData, SwaggerData } from "@/types/types.ts";

const OptionsBtn = ({data}: { data: CookieData | SwaggerData }) => {
    const {handleEdit} = useGlobalContext()
    const isCookie = isCookieData(data)
    const isSwagger = !isCookie


    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div
                    className="w-full shadow-sm font-medium text-xs px-3 border-input border rounded-md whitespace-nowrap gap-2 justify-center items-center h-8 inline-flex select-none"
                    onClick={() => handleEdit(data)}
                >
                    <MoreHorizontal className="h-4 w-4"/> Options
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="select-none">
                <DropdownMenuLabel>Options</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuItem
                    className="w-full cursor-pointer"
                    onClick={() => handleEdit(data)}
                >
                    <Edit className="h-4 w-4 mr-1.5"/> Edit
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