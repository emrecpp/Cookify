import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { useDeleteCookie } from "@/hooks/useCookie.ts";
import { CookieData } from "@/types/types.ts";
import { Cookie } from "lucide-react";


const DropdownItemDeleteCookie = ({data}: { data: CookieData }) => {
    const handleClick = async () => {
        await useDeleteCookie(data)
    }

    return (
        <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={handleClick}
        >
            <Cookie className="h-4 w-4 mr-1.5"/> Delete Cookie
        </DropdownMenuItem>
    );
};

export default DropdownItemDeleteCookie;