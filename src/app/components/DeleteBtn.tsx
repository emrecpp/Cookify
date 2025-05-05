import { ConfirmDeleteDialog } from "@/app/components/shared/ConfirmDeleteDialog.tsx";
import { useGlobalContext } from "@/context/global-context.tsx";
import { CookieData, isCookieData, SwaggerData } from "@/types/types.ts";
import toast from "react-hot-toast";

interface DeleteBtnProps {
    data: CookieData | SwaggerData,
}

const DeleteBtn = ({data}: DeleteBtnProps) => {
    const {handleDeleteProfile} = useGlobalContext()

    const handleDeleteClick = () => {
        handleDeleteProfile(data)
        toast.success("Profile deleted successfully!")
    }

    const itemType = isCookieData(data) ? "cookie" : "swagger";

    return (
        <ConfirmDeleteDialog
            itemName={data.alias}
            itemType={itemType}
            onConfirm={handleDeleteClick}
        />
    );
};

export default DeleteBtn;