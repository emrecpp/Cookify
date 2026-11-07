// Drag handles between panes. While dragging, the size is written straight to the DOM (no re-render per
// mouse move); the final value is handed to `onCommit`, which persists it. Double click resets.

/** Tracks a mouse drag from `e`, calling `onMove` with the offset from the start point. */
export function trackDrag(e: React.MouseEvent, cursor: string, onMove: (dx: number, dy: number) => void, onEnd: () => void) {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const handle = e.currentTarget as HTMLElement;
    const body = document.body.style;
    const previous = {cursor: body.cursor, userSelect: body.userSelect};
    body.cursor = cursor;
    body.userSelect = "none";
    handle.classList.add("is-dragging");
    const move = (ev: MouseEvent) => onMove(ev.clientX - startX, ev.clientY - startY);
    const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        body.cursor = previous.cursor;
        body.userSelect = previous.userSelect;
        handle.classList.remove("is-dragging");
        onEnd();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
