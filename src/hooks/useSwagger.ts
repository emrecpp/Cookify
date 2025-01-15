import {SwaggerData} from "@/types/types.ts";
import {sendMessage} from "@/lib/utils.ts";
import toast from "react-hot-toast";

export const useApplySwagger = async (swagger: SwaggerData) => {
    try {
        await useLogoutSwagger(false)
        const {isSwagger} = await sendMessage("loginSwagger", {
            bearerToken: swagger.bearerToken
        });
        if (!isSwagger)
            return toast.error("No Swagger Docs Page found!");

        toast.success("Swagger Token applied successfully!");
    } catch (error) {
        console.error("Error in useApplySwagger:", error);
        toast.error(error.message);
    }
};

export const useLogoutSwagger = async (showToast: boolean = true) => {
    try {
        await sendMessage("logoutSwagger", {});
        if (showToast)
            toast.success("Swagger Token removed successfully!");
    } catch (error) {
        console.error("Error in useLogoutSwagger:", error);
        toast.error(error.message);
    }
};