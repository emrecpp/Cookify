import {viewRoot} from "./view-root";

/** Copies text to the clipboard; false when the browser refused. */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        // Inside the view: a textarea in the page's DOM would show the copied text (it may be a token) to the page.
        (viewRoot() ?? document.body).appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
    }
}
