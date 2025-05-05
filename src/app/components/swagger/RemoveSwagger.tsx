import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { SwaggerData } from "@/types/types.ts";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";

interface RemoveSwaggerProps {
    swagger: SwaggerData;
}

export const RemoveSwagger = ({ swagger }: RemoveSwaggerProps) => {
    const { handleRemoveSwagger } = useGlobalContext();

    const handleClick = () => {
        handleRemoveSwagger(swagger);
        toast.success("Swagger removed successfully!");
    };

    return (
        <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={handleClick}
        >
            <LogOut className="h-4 w-4 mr-1.5"/> Logout
        </DropdownMenuItem>
    );
}; 