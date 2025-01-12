import {isSwagger, swaggerBearerLogin} from "@/runtime/helpers/swagger.ts";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "loginSwagger") {

        const { bearerToken } = message.params; // Gönderilen parametreleri alıyoruz

        if (isSwagger())
            swaggerBearerLogin(bearerToken);
        sendResponse({ isSwagger: isSwagger });
    }
});