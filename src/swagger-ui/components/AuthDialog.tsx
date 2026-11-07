import {KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ShieldAlert} from "lucide-react";
import {useSpec} from "../context";
import {tokenInfo} from "../request";
import {loginOperation, relogin} from "../session";
import {actions, apiStore, notify, SavedToken, sessionStore, setTokenSiteAccess} from "../state";
import {createStore, useStore} from "../store";
import {methodLabel} from "./Sidebar";

interface DialogState {
    open: boolean;
    /** Why the dialog was opened automatically (e.g. "Not authenticated"). */
    reason?: string;
    /** Re-sends the failed request with the picked token. */
    retry?: (token: string) => void;
    /** Product tab to open on. */
    product?: string;
}

export const authDialogStore = createStore<DialogState>({open: false});

export function openAuthDialog(options: Omit<DialogState, "open"> = {}) {
    authDialogStore.set({open: true, ...options});
}

function closeAuthDialog() {
    authDialogStore.set({open: false, reason: undefined, retry: undefined, product: undefined});
}

export const ALL = "\u0000all";
export const NONE = "\u0000none";
const LOGIN_PATH = /(^|\/)(login|signin|sign-in|token)(\/|$)/i;
const NOT_LOGIN = /refresh|invite|register|signup|sign-up|forgot|reset|logout|google|verify|data/i;

function byOrder(a: SavedToken, b: SavedToken) {
    if (a.order === b.order) return 0;
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    return a.order - b.order;
}

/** Saved Cookify tokens grouped by product, in Cookify's product and token order. */
export function useTokenGroups() {
    const token = useStore(apiStore, (s) => s.token);
    const saved = useStore(sessionStore, (s) => s.savedTokens);
    const projectOrder = useStore(sessionStore, (s) => s.projects);
    const activeProject = useStore(sessionStore, (s) => s.activeProject);

    const tabs = useMemo(() => {
        const used = new Set(saved.map((t) => t.project || NONE));
        const ordered = [...projectOrder, ...saved.map((t) => t.project).filter((p): p is string => !!p)]
            .filter((p, i, list) => list.indexOf(p) === i && used.has(p));
        const list = ordered.map((p) => ({id: p, label: p, count: saved.filter((t) => t.project === p).length}));
        const loose = saved.filter((t) => !t.project).length;
        if (loose) list.push({id: NONE, label: "No product", count: loose});
        if (list.length > 1) list.unshift({id: ALL, label: "All", count: saved.length});
        return list;
    }, [saved, projectOrder]);

    /** The product of the current token, else the product active in the Cookify popup. */
    const preferred = useMemo(() => {
        const current = saved.find((t) => t.bearerToken.trim() === token)?.project;
        const want = current ?? activeProject;
        return tabs.find((t) => t.id === want)?.id ?? tabs.find((t) => t.id !== ALL)?.id ?? ALL;
    }, [saved, token, activeProject, tabs]);

    const tokensOf = useCallback((tab: string) => {
        const list = tab === ALL ? saved : tab === NONE ? saved.filter((t) => !t.project) : saved.filter((t) => t.project === tab);
        return [...list].sort(byOrder).map((t) => ({...t, info: tokenInfo(t.bearerToken, t.alias)}));
    }, [saved]);

    return {token, tabs, preferred, tokensOf};
}

const QUICK_LIMIT = 6;

/** Any page can look like Swagger UI: saved tokens stay hidden until the user allows the site. */
function TokenConsent({className}: { className: string }) {
    const hidden = useStore(sessionStore, (s) => s.hiddenTokens);
    const allow = (e: MouseEvent<HTMLButtonElement>) => {
        if (e.nativeEvent.isTrusted) void setTokenSiteAccess(true);
    };
    return (
        <div className={`${className} cf-token-consent`}>
            <span>{hidden} saved token{hidden === 1 ? " is" : "s are"} hidden on <b>{location.host}</b>. Show them only if you trust this site.</span>
            <button className="cf-btn" onClick={allow}>Show on this site</button>
        </div>
    );
}

/**
 * Shown above a 401/403 response: the tokens of the current product as one-click buttons that apply the
 * token and re-send the request. "Show all" opens the full token dialog.
 */
export function AuthQuickPick({reason, onRetry}: { reason: string; onRetry: (token: string) => void }) {
    const {spec} = useSpec();
    const login = useStore(apiStore, (s) => s.login);
    const {token, tabs, preferred, tokensOf} = useTokenGroups();
    const hidden = useStore(sessionStore, (s) => s.hiddenTokens);
    const [tab, setTab] = useState(preferred);
    const [relogging, setRelogging] = useState(false);
    const products = tabs.filter((t) => t.id !== ALL);
    const current = products.some((t) => t.id === tab) ? tab : preferred;
    const items = tokensOf(current);
    const loginOp = login ? loginOperation(spec) : undefined;

    const use = (value: string, label: string) => {
        actions.setToken(value.trim(), label);
        onRetry(value.trim());
    };

    return (
        <div className="cf-authpick">
            <div className="cf-authpick-head">
                <ShieldAlert size={15} className="cf-authpick-icon"/>
                <b>Authorization required</b>
                <span className="cf-authpick-reason" title={reason}>{reason}</span>
                <span className="cf-flex"/>
                {loginOp && (
                    <button className="cf-btn" disabled={relogging} title={`Run ${loginOp.method.toUpperCase()} ${loginOp.path} again and re-send`} onClick={async () => {
                        setRelogging(true);
                        const fresh = await relogin(spec);
                        setRelogging(false);
                        if (fresh) onRetry(fresh);
                    }}>{relogging ? "Signing in…" : "Re-login & retry"}</button>
                )}
                <button className="cf-btn" onClick={() => openAuthDialog({reason, retry: onRetry, product: current})}>Show all…</button>
            </div>
            {products.length > 1 && (
                <div className="cf-authpick-products">
                    {products.map((t) => (
                        <button key={t.id} className={t.id === current ? "is-on" : ""} onClick={() => setTab(t.id)}>
                            {t.label}<span className="cf-modal-tab-count">{t.count}</span>
                        </button>
                    ))}
                </div>
            )}
            {items.length > 0 ? (
                <div className="cf-authpick-list">
                    {items.slice(0, QUICK_LIMIT).map((t, i) => {
                        const active = t.bearerToken.trim() === token;
                        return (
                            <button key={`${t.alias}-${i}`} className={`cf-authpick-token is-${t.info.state} ${active ? "is-active" : ""}`}
                                    title={`Use ${t.alias}${t.info.name !== t.alias ? ` (${t.info.name})` : ""} and re-send`}
                                    onClick={() => use(t.bearerToken, t.alias)}>
                                <span className="cf-token-state"/>
                                <span className="cf-authpick-alias">{t.alias}</span>
                                {t.info.name !== t.alias && <span className="cf-authpick-who">{t.info.name}</span>}
                                <span className="cf-flex"/>
                                <span className="cf-authpick-exp">{active ? "current" : t.info.expiry ?? ""}</span>
                            </button>
                        );
                    })}
                    {items.length > QUICK_LIMIT && (
                        <button className="cf-authpick-token is-more" onClick={() => openAuthDialog({reason, retry: onRetry, product: current})}>
                            +{items.length - QUICK_LIMIT} more…
                        </button>
                    )}
                </div>
            ) : hidden > 0 ? (
                <TokenConsent className="cf-authpick-empty"/>
            ) : (
                <div className="cf-authpick-empty">No tokens saved in Cookify. Use "Show all…" to paste one or open the login endpoint.</div>
            )}
        </div>
    );
}

/**
 * Token picker. Products (Cookify projects) are tabs in the same order as in the Cookify popup and
 * tokens keep their Cookify order. Opens automatically when a request fails with an auth error.
 */
export function AuthDialog() {
    const {open, reason, retry, product} = useStore(authDialogStore, (s) => s);
    if (!open) return null;
    return <DialogBody reason={reason} retry={retry} product={product}/>;
}

function DialogBody({reason, retry, product}: { reason?: string; retry?: (token: string) => void; product?: string }) {
    const {spec} = useSpec();
    const login = useStore(apiStore, (s) => s.login);
    const [relogging, setRelogging] = useState(false);
    const {token, tabs, preferred, tokensOf} = useTokenGroups();
    const hidden = useStore(sessionStore, (s) => s.hiddenTokens);
    const access = useStore(sessionStore, (s) => s.tokenAccess);

    const [tab, setTab] = useState(() => tabs.find((t) => t.id === product)?.id ?? preferred);
    const items = useMemo(() => tokensOf(tab), [tokensOf, tab]);

    const [cursor, setCursor] = useState(0);
    const [paste, setPaste] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    useEffect(() => setCursor(Math.max(0, items.findIndex((t) => t.bearerToken.trim() === token))), [items, token]);
    useEffect(() => boxRef.current?.focus(), []);
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({block: "nearest"});
    }, [cursor]);

    const loginOps = useMemo(
        () => spec.operations.filter((op) => op.method === "post" && LOGIN_PATH.test(op.path) && !NOT_LOGIN.test(op.path) && !op.secured).slice(0, 3),
        [spec],
    );

    const choose = (value: string, label: string) => {
        const clean = value.trim();
        if (!clean) return;
        actions.setToken(clean, label);
        closeAuthDialog();
        if (retry) retry(clean);
        else notify(`Signed in as ${tokenInfo(clean, label).name}`, "ok");
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target instanceof HTMLInputElement) {
            if (e.key === "Escape") closeAuthDialog();
            return;
        }
        const index = tabs.findIndex((t) => t.id === tab);
        if (e.key === "Escape") closeAuthDialog();
        else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const next = tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
            if (next) setTab(next.id);
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(0, Math.min(items.length - 1, c + (e.key === "ArrowDown" ? 1 : -1))));
        } else if (e.key === "Enter" && items[cursor]) {
            e.preventDefault();
            choose(items[cursor].bearerToken, items[cursor].alias);
        } else if (/^[1-9]$/.test(e.key) && tabs[Number(e.key) - 1]) {
            setTab(tabs[Number(e.key) - 1].id);
        }
    };

    return (
        <div className="cf-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeAuthDialog()}>
            <div className="cf-modal" ref={boxRef} tabIndex={-1} onKeyDown={onKeyDown} role="dialog" aria-label="Choose token">
                <div className="cf-modal-head">
                    <span className="cf-modal-title">{reason ? "Authorization required" : "Choose token"}</span>
                    {reason && <span className="cf-modal-reason">{reason}</span>}
                    <span className="cf-flex"/>
                    <button className="cf-modal-close" onClick={closeAuthDialog} title="Close (Esc)">×</button>
                </div>

                {login && (() => {
                    const op = loginOperation(spec);
                    return op ? (
                        <div className="cf-relogin">
                            <span>Sign in again as <b>{login.label ?? "the last user"}</b> via <code>{op.method.toUpperCase()} {op.path}</code></span>
                            <span className="cf-flex"/>
                            <button className="cf-btn is-primary" disabled={relogging} onClick={async () => {
                                setRelogging(true);
                                const fresh = await relogin(spec);
                                setRelogging(false);
                                if (!fresh) return;
                                closeAuthDialog();
                                retry?.(fresh);
                            }}>{relogging ? "Signing in…" : retry ? "Re-login & retry" : "Re-login"}</button>
                        </div>
                    ) : null;
                })()}

                {tabs.length > 0 ? (
                    <>
                        <div className="cf-modal-tabs">
                            {tabs.map((t, i) => (
                                <button key={t.id} className={`cf-modal-tab ${tab === t.id ? "is-active" : ""}`} onClick={() => setTab(t.id)}
                                        title={i < 9 ? `Key ${i + 1}` : undefined}>
                                    {t.label}<span className="cf-modal-tab-count">{t.count}</span>
                                </button>
                            ))}
                        </div>
                        <div className="cf-modal-list" ref={listRef}>
                            {items.map((t, i) => {
                                const active = t.bearerToken.trim() === token;
                                return (
                                    <button
                                        key={`${t.alias}-${i}`}
                                        data-index={i}
                                        className={`cf-token-row ${i === cursor ? "is-cursor" : ""} ${active ? "is-active" : ""} is-${t.info.state}`}
                                        onMouseMove={() => setCursor(i)}
                                        onClick={() => choose(t.bearerToken, t.alias)}
                                    >
                                        <span className="cf-token-state"/>
                                        <span className="cf-token-alias">{t.alias}</span>
                                        <span className="cf-token-who">{t.info.name !== t.alias ? t.info.name : ""}</span>
                                        {tab === ALL && t.project && <span className="cf-token-project">{t.project}</span>}
                                        <span className="cf-flex"/>
                                        {active && <span className="cf-token-current">current</span>}
                                        <span className="cf-token-exp">{t.info.expiry ?? "no expiry"}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : hidden > 0 ? (
                    <TokenConsent className="cf-modal-empty"/>
                ) : (
                    <div className="cf-modal-empty">No tokens saved in Cookify yet. Add them in the Cookify popup (Swagger tab) and they appear here grouped by product.</div>
                )}

                <div className="cf-modal-foot">
                    <input
                        className="cf-input"
                        placeholder="Or paste a token"
                        value={paste}
                        spellCheck={false}
                        onChange={(e) => setPaste(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && choose(paste, "Custom")}
                    />
                    <button className="cf-btn is-primary" disabled={!paste.trim()} onClick={() => choose(paste, "Custom")}>
                        {retry ? "Apply & retry" : "Apply"}
                    </button>
                </div>
                {loginOps.length > 0 && (
                    <div className="cf-modal-login">
                        <span className="cf-muted">Log in:</span>
                        {loginOps.map((op) => (
                            <button key={op.key} className="cf-text-btn" onClick={() => {
                                closeAuthDialog();
                                actions.openTab(op.key, true);
                            }}>
                                {methodLabel(op.method)} {op.path}
                            </button>
                        ))}
                    </div>
                )}
                {access === "site" && (
                    <div className="cf-modal-login">
                        <span className="cf-muted">Saved tokens are shown on {location.host}.</span>
                        <button className="cf-text-btn" onClick={() => void setTokenSiteAccess(false)}>Hide them on this site</button>
                    </div>
                )}
                <div className="cf-modal-hint">
                    <span><kbd>←</kbd><kbd>→</kbd> product</span>
                    <span><kbd>↑</kbd><kbd>↓</kbd> token</span>
                    <span><kbd>Enter</kbd> {retry ? "use & retry" : "use"}</span>
                    <span><kbd>Esc</kbd> close</span>
                </div>
            </div>
        </div>
    );
}
