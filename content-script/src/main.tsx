import {hasSwaggerRoot, showClassicUi, swaggerGuard, waitForSwagger} from "@/swagger-ui/detect";

// Runs on every page, so only the small check lives here: the Cookify view (React, the editor, the styles) is
// loaded on Swagger UI pages only, and every other page is left untouched.
if (window.top === window) {
    // Synchronously: the guard gives the page its classic UI back by itself when nobody claims it in time.
    const guard = swaggerGuard();
    if (guard) guard.claimed = true;
    // Started before the wait when the page already shows Swagger UI, which is the usual case at document_end.
    const view = hasSwaggerRoot() ? import("@/swagger-ui/mount") : null;
    void waitForSwagger().then(async (found) => {
        if (!found) return;
        try {
            const {bootstrapSwaggerUi} = await (view ?? import("@/swagger-ui/mount"));
            await bootstrapSwaggerUi();
        } catch (error) {
            console.warn("[Cookify] Could not load the Cookify view", error);
            showClassicUi();
        }
    });
}
