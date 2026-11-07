// "Apply" on a saved token: hands it to the Swagger page in the active tab (the Cookify view, or the classic
// Swagger UI's Authorize dialog; see src/runtime/router.ts).
import {sendMessage} from "@/lib/utils.ts";
import {SwaggerData} from "@/types/types.ts";
import toast from "react-hot-toast";

export async function logoutSwaggerToken(showToast = true): Promise<void> {
    try {
        await sendMessage("logoutSwagger");
        if (showToast) toast.success("Swagger Token removed successfully!");
    } catch (error) {
        console.error("Error removing the Swagger token:", (error as Error).message);
        toast.error((error as Error).message);
    }
}

export async function applySwaggerToken(swagger: SwaggerData): Promise<void> {
    try {
        await logoutSwaggerToken(false);
        const {isSwagger} = await sendMessage<{ isSwagger: boolean }>("loginSwagger", {bearerToken: swagger.bearerToken});
        if (!isSwagger) {
            toast.error("No Swagger Docs Page found!");
            return;
        }
        toast.success("Swagger Token applied successfully!");
    } catch (error) {
        console.error("Error applying the Swagger token:", (error as Error).message);
        toast.error((error as Error).message);
    }
}
