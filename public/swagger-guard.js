// Cookify Swagger guard.
// Registered by the background worker with chrome.scripting at document_start (plain script, no bundler)
// so it runs before the page parser reaches Swagger UI's <script> tags.
//
// On Swagger UI pages it prevents swagger-ui-bundle.js (and the inline SwaggerUIBundle(...) init script)
// from executing: the hidden classic UI would otherwise render thousands of DOM nodes and block the
// main thread for seconds while the Cookify view is loading.
//
// The Cookify content script calls `restore()` when the classic UI is needed (classic mode, extension
// disabled, no OpenAPI document found). Restoring reloads the page once with the guard skipped, so
// Swagger's own scripts run untouched (re-injecting them from a content script does not reliably execute
// them in the page). Pages the user switched to classic are remembered in the page's localStorage so they
// are never held back. If the content script never claims the page, the guard restores it by itself.
//
// It also shortens the blank page while a Swagger page opens (switching environment is a full navigation):
// Swagger UI's stylesheet blocks the first paint and the Cookify view doesn't use it, so it is held back too;
// and a page that was seen as Cookify left a note of how it looked (theme, sidebar width, endpoint tabs open; see
// rememberBoot in mount.tsx), read here synchronously so the skeleton matches the view before the page has any content.
(() => {
    if (window.top !== window || window.__cookifySwaggerGuard) return;

    const SKIP_KEY = "cookify:guard-skip";
    const CLASSIC_KEY = "cookify:classic:" + location.pathname;
    const BOOT_KEY = "cookify:boot:" + location.pathname;
    let skip = false;
    let boot = null;
    try {
        skip = sessionStorage.getItem(SKIP_KEY) === "1" || localStorage.getItem(CLASSIC_KEY) === "1";
        sessionStorage.removeItem(SKIP_KEY);
        const note = localStorage.getItem(BOOT_KEY);
        // "dark": written by older versions
        boot = note === "dark" ? {theme: "dark"} : note ? JSON.parse(note) : null;
    } catch {
        // storage can be unavailable (sandboxed frames, privacy settings), or the note unreadable
    }
    if (skip) {
        // Show the classic UI right away (swagger-preload.css only hides it without this class).
        document.documentElement.classList.add("cookify-off");
        window.__cookifySwaggerGuard = {blocked: [], claimed: true, skipped: true, restore: () => Promise.resolve()};
        return;
    }

    const BOOT_CLASSES = ["cookify-boot", "cookify-boot-light", "cookify-boot-tabs"];
    const BOOT_COLORS = ["bg", "surface", "bar", "input", "border", "accent"];
    if (boot && typeof boot === "object") {
        const root = document.documentElement;
        root.classList.add("cookify-boot");
        if (boot.theme === "light") root.classList.add("cookify-boot-light");
        if (boot.tabs === true) root.classList.add("cookify-boot-tabs");
        if (Number.isFinite(boot.side) && boot.side >= 150 && boot.side <= 1200) root.style.setProperty("--cookify-side", Math.round(boot.side) + "px");
        // colors of the chosen color palette (none for the default one, whose colors swagger-preload.css has)
        if (boot.colors && typeof boot.colors === "object") {
            for (const name of BOOT_COLORS) {
                const value = boot.colors[name];
                if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) root.style.setProperty("--ck-" + name, value);
            }
        }
    }

    const SWAGGER_SRC = /swagger-ui(-bundle|-standalone-preset|-es-bundle)?(\.min)?\.js(\?|#|$)/i;
    const SWAGGER_CSS = /swagger-ui(\.min)?\.css(\?|#|$)/i;
    const SWAGGER_INLINE = /SwaggerUIBundle|SwaggerUIStandalonePreset/;
    const blocked = [];
    const heldStyles = [];
    const handled = new WeakSet();
    let restoring = null;

    const guard = {
        blocked,
        claimed: false,
        skipped: false,
        restore,
    };
    window.__cookifySwaggerGuard = guard;

    const hasSwaggerRoot = () => !!document.getElementById("swagger-ui");

    function block(script, entry) {
        entry.type = script.getAttribute("type");
        entry.attrs = [...script.attributes]
            .filter((a) => a.name !== "type" && a.name !== "src")
            .map((a) => [a.name, a.value]);
        script.type = "javascript/blocked";
        handled.add(script);
        blocked.push(entry);
        // Swagger UI's own script next to its root: this is a Swagger UI page, show the skeleton (swagger-preload.css).
        document.documentElement.classList.add("cookify-swagger");
    }

    function inspect(script) {
        if (restoring || handled.has(script)) return;
        if (script.src) {
            handled.add(script);
            if (SWAGGER_SRC.test(script.src) && hasSwaggerRoot()) block(script, {src: script.src});
        } else if (blocked.length && SWAGGER_INLINE.test(script.textContent || "")) {
            block(script, {text: script.textContent});
        }
    }

    function holdStyle(link) {
        if (restoring || link.rel !== "stylesheet" || !SWAGGER_CSS.test(link.href)) return;
        heldStyles.push(link);
        link.remove();
    }

    /** The classic UI stays on this page after all (no reload brings the stylesheet back). */
    function releaseStyles() {
        for (const link of heldStyles.splice(0)) (document.head ?? document.documentElement).appendChild(link);
    }

    // Mutation callbacks run in the microtask checkpoint before a parser-inserted script executes,
    // so changing `type` here stops it from running.
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.target.nodeName === "SCRIPT") inspect(record.target);
            for (const node of record.addedNodes) {
                if (node.nodeName === "SCRIPT") inspect(node);
                else if (node.nodeName === "LINK") holdStyle(node);
            }
        }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    document.addEventListener("DOMContentLoaded", () => {
        observer.disconnect();
        if (hasSwaggerRoot()) return;
        // Not a Swagger page (any more): the skeleton must not cover it.
        releaseStyles();
        document.documentElement.classList.remove(...BOOT_CLASSES);
        document.documentElement.style.removeProperty("--cookify-side");
        for (const name of BOOT_COLORS) document.documentElement.style.removeProperty("--ck-" + name);
        try {
            localStorage.removeItem(BOOT_KEY);
        } catch {
            // ignore
        }
    }, {once: true});

    setTimeout(() => {
        if (!guard.claimed) restore();
    }, 6000);

    function restore() {
        if (restoring) return restoring;
        restoring = new Promise(() => {
            if (!blocked.length) return;
            try {
                sessionStorage.setItem(SKIP_KEY, "1");
            } catch {
                return;
            }
            location.reload();
        });
        if (!blocked.length) {
            releaseStyles();
            restoring = Promise.resolve();
        }
        return restoring;
    }
})();
