// Drives the classic Swagger UI's Authorize dialog: sets or removes a bearer token as a user would.

export const isSwagger = () => Boolean(document.getElementById("swagger-ui"));

const click = (selector: string) => {
    const button = document.querySelector<HTMLElement>(selector);
    button?.click();
    return Boolean(button);
};

const openAuthorizeDialog = () => click(".auth-wrapper button");
const closeAuthorizeDialog = () => click(".btn.modal-btn.auth.btn-done.button");
/** Lets Swagger UI render the dialog that was just opened. */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function swaggerBearerLogin(bearerToken: string): Promise<boolean> {
    if (!isSwagger()) return false;
    openAuthorizeDialog();
    await nextTask();
    const input = document.getElementById("auth-bearer-value") as HTMLInputElement | null;
    input?.setAttribute("value", bearerToken);
    input?.dispatchEvent(new Event("change", {bubbles: true}));
    click(".btn.modal-btn.auth.authorize.button");
    closeAuthorizeDialog();
    return Boolean(input);
}

export async function swaggerLogout(): Promise<boolean> {
    if (!isSwagger()) return false;
    openAuthorizeDialog();
    await nextTask();
    if (!click(".btn.modal-btn.auth.button")) return false;
    closeAuthorizeDialog();
    return true;
}
