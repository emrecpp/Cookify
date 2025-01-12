export const isSwagger = () => Boolean(document.getElementById("swagger-ui"));

export async function swaggerBearerLogin(bearerToken: string) {
    if (!isSwagger())
        return;


    clickAuthorizeBtn()
    await new Promise(resolve => setTimeout(resolve, 0))
    setInputBearerToken(bearerToken, true)
    clickAuthorizeBtnInModal()
    clickCloseBtn()
}


// helper functions
function clickAuthorizeBtn() {
    const authBtn = document.querySelector('.auth-wrapper button');
    authBtn?.click();
    return Boolean(authBtn);
}

function setInputBearerToken(token: string) {
    const input = document.getElementById("auth-bearer-value") as HTMLInputElement
    input?.setAttribute("value", token);


    let changeEvent = new Event('change', {bubbles: true});
    input?.dispatchEvent(changeEvent)
    return Boolean(input);
}

function clickAuthorizeBtnInModal() {
    const authBtnInModal = document.querySelector('.btn.modal-btn.auth.authorize.button');
    authBtnInModal?.click();
    return Boolean(authBtnInModal);
}

function clickCloseBtn() {
    const authBtnInModal = document.querySelector('.btn.modal-btn.auth.btn-done.button');
    authBtnInModal?.click();
    return Boolean(authBtnInModal);
}