// Runs on every page (content-script/src/main.tsx), so it stays tiny: the Cookify view itself (mount.tsx and
// everything it imports) is only loaded once a page turns out to be a Swagger UI page.

export interface SwaggerGuard {
    claimed: boolean;
    skipped?: boolean;
    blocked: unknown[];
    restore(): Promise<void>;
}

/** Installed by public/swagger-guard.js (document_start); it holds back Swagger UI's own scripts. */
export const swaggerGuard = () => (window as unknown as { __cookifySwaggerGuard?: SwaggerGuard }).__cookifySwaggerGuard;

/** True when the current page looks like a Swagger UI docs page. */
export function hasSwaggerRoot(): boolean {
    return Boolean(document.getElementById("swagger-ui") || document.querySelector(".swagger-ui"));
}

export function waitForSwagger(timeoutMs = 4000): Promise<boolean> {
    if (hasSwaggerRoot()) return Promise.resolve(true);
    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (hasSwaggerRoot()) {
                observer.disconnect();
                resolve(true);
            }
        });
        observer.observe(document.documentElement, {childList: true, subtree: true});
        setTimeout(() => {
            observer.disconnect();
            resolve(hasSwaggerRoot());
        }, timeoutMs);
    });
}

/** The view could not be loaded (extension updated or reloaded under the page): give the page its classic UI back. */
export function showClassicUi() {
    document.documentElement.classList.add("cookify-off");
    void swaggerGuard()?.restore();
}
