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

/** An underlined link at the end of a row (e.g. an environment of an API); it acts on its own. */
export interface MenuLink {
    label: string;
    title?: string;
    /** The one in use: shown without underline and does nothing. */
    active?: boolean;
    onClick: () => void;
}

export interface MenuItem {
    label: string;
    /** Shown before the label, e.g. its position in the list. */
    prefix?: string;
    /** A color dot before the label (e.g. a color palette). */
    swatch?: string;
    /** The item that is in use. */
    active?: boolean;
    side?: MenuSideButton[];
    /** Links shown on the right instead of the hint. */
    links?: MenuLink[];
    /** Keyboard hint shown on the right. */
    hint?: string;
    danger?: boolean;
    disabled?: boolean;
    /** Draws a separator above this item. */
    separator?: boolean;
    /**
     * A text box instead of a button (one per menu), e.g. a value that is not in the list: typing while the menu is
     * open goes into it, Enter hands the text to onSubmit.
     */
    input?: MenuInput;
    onSelect: () => void;
}

export interface MenuInput {
    placeholder: string;
    initial?: string;
    onSubmit: (text: string) => void;
}

interface MenuState {
    items: MenuItem[] | null;
    x: number;
    y: number;
    /** Align the right edge of the menu to x (dropdowns opened from a right-aligned button). */
    alignRight?: boolean;
    /** Open with the active item under the keyboard cursor (a list of values with the current one marked). */
    startAtActive?: boolean;
    /** As wide as its items (a short list of values), not the usual minimum width. */
    compact?: boolean;
    root?: Element | null;
}

const menuStore = createStore<MenuState>({items: null, x: 0, y: 0});

export function openMenu(state: Omit<MenuState, "root">, from: Element) {
    menuStore.set({alignRight: false, startAtActive: false, compact: false, ...state, root: from.closest(".cf-root")});
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
    const {items, x, y, alignRight, startAtActive, compact, root} = useStore(menuStore, (s) => s);
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const [cursor, setCursor] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState("");
    const inputAt = items ? items.findIndex((item) => item.input) : -1;

    const submitInput = (item: MenuItem) => {
        const value = text.trim();
        if (!item.input || !value) return;
        closeMenu();
        item.input.onSubmit(value);
    };
    // the key handler is set up once per menu; it submits with the text typed since
    const submitRef = useRef(submitInput);
    submitRef.current = submitInput;

    useLayoutEffect(() => {
        setCursor(items && startAtActive ? items.findIndex((item) => item.active) : -1);
        setText(items?.find((item) => item.input)?.input?.initial ?? "");
        if (!items || !ref.current) return setPos(null);
        const box = ref.current.getBoundingClientRect();
        const left = Math.max(4, Math.min(alignRight ? x - box.width : x, window.innerWidth - box.width - 4));
        const top = y + box.height > window.innerHeight - 4 ? Math.max(4, y - box.height) : y;
        setPos({left, top});
    }, [items, x, y, alignRight, startAtActive]);

    // the cursor on the text box puts the typing there
    useEffect(() => {
        if (cursor >= 0 && cursor === inputAt) inputRef.current?.focus();
    }, [cursor, inputAt]);

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
                        if (items[c].input) {
                            submitRef.current(items[c]);
                        } else {
                            closeMenu();
                            items[c].onSelect();
                        }
                    }
                    return c;
                });
            } else if (inputAt >= 0 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && inputRef.current && !e.composedPath().includes(inputRef.current)) {
                // typing while the menu is open: into its text box (focused now, the key lands there)
                e.stopPropagation();
                inputRef.current.focus();
                setCursor(inputAt);
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
    }, [items, inputAt]);

    if (!items || !root) return null;
    return createPortal(
        <div ref={ref} className={`cf-menu ${compact ? "is-compact" : ""}`} role="menu" style={pos ?? {left: -9999, top: 0}} onContextMenu={(e) => e.preventDefault()}>
            {items.map((item, i) => (
                <Fragment key={i}>
                    {item.separator && <div className="cf-menu-sep"/>}
                    {item.input ? (
                        <div className={`cf-menu-row is-input ${i === cursor ? "is-cursor" : ""}`} onMouseEnter={() => setCursor(i)}>
                            <input ref={inputRef} className="cf-menu-input" placeholder={item.input.placeholder} title="Type a value, then press Enter" value={text} spellCheck={false}
                                   aria-label={item.label} onChange={(e) => setText(e.target.value)} onFocus={() => setCursor(i)}/>
                        </div>
                    ) : (
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
                                    {item.swatch && <span className="cf-swatch" style={{background: item.swatch}}/>}
                                    {item.label}
                                </span>
                                {item.hint && <span className="cf-menu-hint">{item.hint}</span>}
                            </button>
                            {item.links?.length ? (
                                <span className="cf-menu-links">
                                    {item.links.map((link, n) => (
                                        <button key={n} className={`cf-menu-link ${link.active ? "is-active" : ""}`} title={link.title} aria-label={link.title ?? link.label}
                                                aria-current={link.active || undefined} onMouseEnter={() => setCursor(i)}
                                                onClick={() => {
                                                    if (link.active) return;
                                                    closeMenu();
                                                    link.onClick();
                                                }}>
                                            {link.label}
                                        </button>
                                    ))}
                                </span>
                            ) : null}
                            {item.side?.map((button) => (
                                <button key={button.title} className="cf-menu-side" title={button.title} aria-label={button.title} disabled={button.disabled}
                                        onMouseEnter={() => setCursor(i)} onClick={button.onClick}>
                                    {button.icon}
                                </button>
                            ))}
                        </div>
                    )}
                </Fragment>
            ))}
        </div>,
        root,
    );
}
