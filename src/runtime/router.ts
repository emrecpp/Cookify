// Messages from the popup to the page in the active tab: is it a Swagger page, and apply / remove a token in the
// classic Swagger UI (the Cookify view takes the token itself, see swagger-ui/mount.tsx).
import {isSwagger, swaggerBearerLogin, swaggerLogout} from "@/runtime/helpers/swagger.ts";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "isSwagger") {
        sendResponse({isSwagger: isSwagger()});
    } else if (message?.action === "loginSwagger") {
        const token = message.params?.bearerToken;
        if (typeof token === "string") void swaggerBearerLogin(token);
        sendResponse({isSwagger: isSwagger()});
    } else if (message?.action === "logoutSwagger") {
        void swaggerLogout();
        sendResponse({isSwagger: isSwagger()});
    }
});
