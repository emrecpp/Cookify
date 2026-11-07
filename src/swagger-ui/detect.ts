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

/**
 * Set on <html> once the page is known to be a Swagger UI page, by the guard (it held back Swagger UI's scripts)
 * or by the content script. public/swagger-preload.css shows the loading skeleton only then.
 */
export const SWAGGER_PAGE_CLASS = "cookify-swagger";

/** The element Swagger UI renders into. */
function swaggerRoot(): Element | null {
    return document.getElementById("swagger-ui") ?? document.querySelector(".swagger-ui");
}

const SWAGGER_FILE = /swagger-ui[\w.-]*\.(js|css)(\?|#|$)/i;
const SWAGGER_INIT = /\b(SwaggerUIBundle|SwaggerUIStandalonePreset)\b|\bSwaggerUI\s*\(/;
/** Markup Swagger UI renders (swagger-ui-react apps bundle it, so there is no file to recognize). */
const SWAGGER_MARKUP = ".swagger-container, .information-container, .scheme-container, .opblock, .loading-container";

/** Whether the page's own files and scripts load Swagger UI. */
export function loadsSwaggerUi(files: string[], inlineScripts: string[]): boolean {
    return files.some((file) => SWAGGER_FILE.test(file)) || inlineScripts.some((text) => SWAGGER_INIT.test(text));
}

/**
 * True when the page really runs Swagger UI: an element named swagger-ui is not enough on its own, since any site
 * can have one (a search result, a post, a class name). The page must also load Swagger UI, or show its markup.
 */
export function isSwaggerPage(): boolean {
    const root = swaggerRoot();
    if (!root) return false;
    if (swaggerGuard()?.blocked.length) return true;
    if (root.querySelector(SWAGGER_MARKUP)) return true;
    const files = [
        ...[...document.scripts].map((script) => script.src),
        ...[...document.querySelectorAll<HTMLLinkElement>("link[rel~=stylesheet]")].map((link) => link.href),
    ].filter(Boolean);
    const inline = [...document.scripts].filter((script) => !script.src).map((script) => script.textContent ?? "");
    return loadsSwaggerUi(files, inline);
}

/** Waits a short while for the page to show Swagger UI: pages that render it themselves add it after load. */
export function waitForSwagger(timeoutMs = 4000): Promise<boolean> {
    if (isSwaggerPage()) return Promise.resolve(true);
    return new Promise((resolve) => {
        let done = false;
        const finish = (found: boolean) => {
            if (done) return;
            done = true;
            observer.disconnect();
            clearTimeout(timer);
            resolve(found);
        };
        const observer = new MutationObserver(() => {
            if (isSwaggerPage()) finish(true);
        });
        observer.observe(document.documentElement, {childList: true, subtree: true});
        const timer = setTimeout(() => finish(isSwaggerPage()), timeoutMs);
    });
}

/** The view could not be loaded (extension updated or reloaded under the page): give the page its classic UI back. */
export function showClassicUi() {
    document.documentElement.classList.add("cookify-off");
    void swaggerGuard()?.restore();
}
