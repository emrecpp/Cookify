import {Fragment, ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {createStore, useStore} from "../store";
import {listenEverywhere} from "../view-root";

/** A small button at the end of a row; the menu stays open when it is used. */
export interface MenuSideButton {
    icon: ReactNode;
    title: string;
    disabled?: boolean;
    onClick: () => void;
}

export interface MenuItem {
    label: string;
    /** Shown before the label, e.g. its position in the list. */
    prefix?: string;
    /** The item that is in use. */
    active?: boolean;
    side?: MenuSideButton[];
    /** Keyboard hint shown on the right. */
    hint?: string;
    danger?: boolean;
    disabled?: boolean;
    /** Draws a separator above this item. */
    separator?: boolean;
    onSelect: () => void;
}

interface MenuState {
    items: MenuItem[] | null;
    x: number;
    y: number;
    /** Align the right edge of the menu to x (dropdowns opened from a right-aligned button). */
    alignRight?: boolean;
    root?: Element | null;
}

const menuStore = createStore<MenuState>({items: null, x: 0, y: 0});

export function openMenu(state: Omit<MenuState, "root">, from: Element) {
    menuStore.set({alignRight: false, ...state, root: from.closest(".cf-root")});
}

/** Opens a dropdown under a button. */
export function openDropdown(items: MenuItem[], button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    openMenu({items, x: rect.right, y: rect.bottom + 2, alignRight: true}, button);
}

/** Replaces the items of the open menu. */
export function updateMenu(items: MenuItem[]) {
    menuStore.set({items});
}

function closeMenu() {
    menuStore.set({items: null});
}

/** Single shared popup menu (dropdowns and context menus), rendered once in the app. */
export function MenuHost() {
    const {items, x, y, alignRight, root} = useStore(menuStore, (s) => s);
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const [cursor, setCursor] = useState(-1);

    useLayoutEffect(() => {
        setCursor(-1);
        if (!items || !ref.current) return setPos(null);
        const box = ref.current.getBoundingClientRect();
        const left = Math.max(4, Math.min(alignRight ? x - box.width : x, window.innerWidth - box.width - 4));
        const top = y + box.height > window.innerHeight - 4 ? Math.max(4, y - box.height) : y;
        setPos({left, top});
    }, [items, x, y, alignRight]);

    useEffect(() => {
        if (!items) return;
        const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);
        const onDown = (e: MouseEvent) => {
            if (ref.current && !e.composedPath().includes(ref.current)) closeMenu();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
            } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                setCursor((c) => {
                    const at = enabled.indexOf(c);
                    const next = e.key === "ArrowDown" ? (at + 1) % enabled.length : (at <= 0 ? enabled.length - 1 : at - 1);
                    return enabled[next] ?? -1;
                });
            } else if (e.key === "Enter") {
                setCursor((c) => {
                    if (c >= 0 && items[c]) {
                        e.preventDefault();
                        e.stopPropagation();
                        closeMenu();
                        items[c].onSelect();
                    }
                    return c;
                });
            }
        };
        const offDown = listenEverywhere("mousedown", onDown);
        const offKey = listenEverywhere("keydown", onKey);
        window.addEventListener("blur", closeMenu);
        window.addEventListener("resize", closeMenu);
        return () => {
            offDown();
            offKey();
            window.removeEventListener("blur", closeMenu);
            window.removeEventListener("resize", closeMenu);
        };
    }, [items]);

    if (!items || !root) return null;
    return createPortal(
        <div ref={ref} className="cf-menu" role="menu" style={pos ?? {left: -9999, top: 0}} onContextMenu={(e) => e.preventDefault()}>
            {items.map((item, i) => (
                <Fragment key={i}>
                    {item.separator && <div className="cf-menu-sep"/>}
                    <div className="cf-menu-row">
                        <button
                            role="menuitem"
                            className={`cf-menu-item ${item.danger ? "is-danger" : ""} ${item.active ? "is-active" : ""} ${i === cursor ? "is-cursor" : ""}`}
                            disabled={item.disabled}
                            onMouseEnter={() => setCursor(i)}
                            onClick={() => {
                                closeMenu();
                                item.onSelect();
                            }}
                        >
                            <span className="cf-menu-label">
                                {item.prefix && <span className="cf-menu-prefix">{item.prefix}</span>}
                                {item.label}
                            </span>
                            {item.hint && <span className="cf-menu-hint">{item.hint}</span>}
                        </button>
                        {item.side?.map((button) => (
                            <button key={button.title} className="cf-menu-side" title={button.title} aria-label={button.title} disabled={button.disabled}
                                    onMouseEnter={() => setCursor(i)} onClick={button.onClick}>
                                {button.icon}
                            </button>
                        ))}
                    </div>
                </Fragment>
            ))}
        </div>,
        root,
    );
}
