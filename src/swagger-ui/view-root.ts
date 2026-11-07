// The closed shadow root the Cookify view renders into. Closed roots can't be reached from the DOM,
// so code that needs a node inside the view (and not in the page) gets it from here.
let root: ShadowRoot | null = null;

export function setViewRoot(shadow: ShadowRoot) {
    root = shadow;
}

export function viewRoot(): ShadowRoot | null {
    return root;
}

/**
 * Listens for an event inside the view and on the page around it. A listener on window can't see into a
 * closed shadow root (the target is the host and composedPath() stops there), so events from inside the view
 * are taken on the shadow root, where their full path is visible, and window only gets the others.
 * Synthetic events (dispatched by the page's own scripts) are ignored.
 */
export function listenEverywhere<K extends keyof WindowEventMap>(type: K, handler: (e: WindowEventMap[K]) => void, capture = true): () => void {
    const shadow = root;
    const inner = (e: Event) => {
        if (e.isTrusted) handler(e as WindowEventMap[K]);
    };
    const outer = (e: Event) => {
        if (e.isTrusted && !(shadow && e.target === shadow.host)) handler(e as WindowEventMap[K]);
    };
    window.addEventListener(type, outer, capture);
    shadow?.addEventListener(type, inner, capture);
    return () => {
        window.removeEventListener(type, outer, capture);
        shadow?.removeEventListener(type, inner, capture);
    };
}
