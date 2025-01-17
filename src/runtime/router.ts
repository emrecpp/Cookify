import {isSwagger, swaggerBearerLogin, swaggerLogout} from "@/runtime/helpers/swagger.ts";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "isSwagger") {
        sendResponse({isSwagger: isSwagger()});
    } else if (message.action === "loginSwagger") {
        const {bearerToken} = message.params;
        swaggerBearerLogin(bearerToken);
        sendResponse({isSwagger: isSwagger()});
    } else if (message.action === "logoutSwagger") {
        swaggerLogout();
        sendResponse({isSwagger: isSwagger()});
    }
});