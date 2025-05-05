import { ConfirmDeleteDialog } from "@/app/components/shared/ConfirmDeleteDialog.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { SwaggerData } from "@/types/types.ts";
import toast from "react-hot-toast";

interface SwaggerDeleteBtnProps {
    swagger: SwaggerData;
}

export const SwaggerDeleteBtn = ({ swagger }: SwaggerDeleteBtnProps) => {
    const { handleDeleteSwagger } = useGlobalContext();

    const handleDeleteClick = () => {
        handleDeleteSwagger(swagger);
        toast.success("Swagger deleted successfully!");
    };

    return (
        <ConfirmDeleteDialog
            itemName={swagger.alias}
            itemType="swagger"
            onConfirm={handleDeleteClick}
            triggerText="Delete Swagger"
        />
    );
}; 