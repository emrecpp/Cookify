import {useEffect, useMemo, useRef, useState} from "react";
import {Copy, Eye, EyeOff, LogOut, RefreshCw} from "lucide-react";
import {useSpec} from "../context";
import {decodeJwt, oauthPasswordLogin, tokenInfo} from "../request";
import {actions, apiStore, notify} from "../state";
import {useStore} from "../store";
import {loginOperation, relogin} from "../session";
import {openAuthDialog} from "./AuthDialog";
import {listenEverywhere} from "../view-root";

function usePasswordFlow() {
    const {spec} = useSpec();
    return useMemo(() => {
        for (const scheme of Object.values(spec.securitySchemes)) {
            const tokenUrl = scheme?.flows?.password?.tokenUrl ?? (scheme?.type === "oauth2" && scheme?.flow === "password" ? scheme.tokenUrl : undefined);
            if (tokenUrl) return {tokenUrl: new URL(tokenUrl, spec.servers[0] + "/").href};
        }
        return null;
    }, [spec]);
}

/** Re-renders every 30s so the remaining time in the header stays current. */
function useTick(enabled: boolean) {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, [enabled]);
}

function formatTime(seconds: number) {
    const date = new Date(seconds * 1000);
    const sameDay = date.toDateString() === new Date().toDateString();
    return sameDay
        ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
        : date.toLocaleString([], {day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"});
}

const GENERIC_LABELS = new Set(["Custom", "Cookify"]);

/** Header session indicator: who is signed in, when the token expires, switch token and log out. */
export function AuthMenu() {
    const token = useStore(apiStore, (s) => s.token);
    const tokenLabel = useStore(apiStore, (s) => s.tokenLabel);
    const loginRecipe = useStore(apiStore, (s) => s.login);
    const autoRelogin = useStore(apiStore, (s) => s.autoRelogin);
    const {spec} = useSpec();
    const passwordFlow = usePasswordFlow();
    useTick(!!token);

    const [open, setOpen] = useState(false);
    const [reveal, setReveal] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !e.composedPath().includes(ref.current)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const offDown = listenEverywhere("mousedown", onDown);
        const offKey = listenEverywhere("keydown", onKey);
        return () => {
            offDown();
            offKey();
        };
    }, [open]);

    const info = token ? tokenInfo(token, tokenLabel) : null;
    /** Labels given by Cookify itself ("Custom" for a pasted token, "Cookify" from the popup) aren't aliases. */
    const alias = tokenLabel && !GENERIC_LABELS.has(tokenLabel) ? tokenLabel : "";
    const owner = info && alias && alias !== info.name ? info.name : "";
    const payload = token ? decodeJwt(token) : null;

    const switchToken = () => {
        setOpen(false);
        openAuthDialog();
    };
    // logging out also forgets the remembered login, otherwise auto re-login would sign straight back in
    const logout = () => {
        actions.setToken("");
        actions.setLogin(undefined);
        setOpen(false);
        notify("Signed out", "info");
    };
    const login = async () => {
        if (!passwordFlow) return;
        setLoggingIn(true);
        try {
            const value = await oauthPasswordLogin(passwordFlow.tokenUrl, username, password);
            actions.setToken(value, username);
            notify(`Signed in as ${tokenInfo(value, username).name}`, "ok");
            setOpen(false);
        } catch (error) {
            notify((error as Error).message, "err");
        } finally {
            setLoggingIn(false);
        }
    };

    const loginOp = loginRecipe ? loginOperation(spec) : undefined;
    const loginName = loginOp ? `${loginOp.method.toUpperCase()} ${loginOp.path}` : "";
    const reloginNow = () => {
        setOpen(false);
        void relogin(spec);
    };
    const expiresAt = typeof payload?.exp === "number" ? formatTime(payload.exp) : "";
    const issuedAt = typeof payload?.iat === "number" ? formatTime(payload.iat) : "";

    const oauthForm = passwordFlow && (
        <>
            <div className="cf-popover-title">OAuth2 password login</div>
            <div className="cf-login">
                <input className="cf-input" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                <input className="cf-input" placeholder="password" type="password" value={password}
                       onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()}/>
                <button className="cf-btn" onClick={login} disabled={loggingIn || !username}>{loggingIn ? "…" : "Login"}</button>
            </div>
        </>
    );

    return (
        <div className="cf-auth" ref={ref}>
            {info ? (
                <button className={`cf-session is-${info.state} ${owner ? "has-owner" : ""}`} onClick={() => setOpen(!open)}
                        title={owner ? `${alias} · ${owner}` : info.name}>
                    <span className="cf-session-dot"/>
                    {/* The token's alias from Cookify when it has one, with who the token belongs to below it. */}
                    <span className="cf-session-text">
                        <span className="cf-session-name">{alias || info.name}</span>
                        {owner && <span className="cf-session-owner">{owner}</span>}
                    </span>
                    {info.expiry && <span className="cf-session-exp">{info.expiry}</span>}
                </button>
            ) : (
                // without an OAuth password flow there is nothing else to show: go straight to the token picker
                <button className="cf-session is-none" onClick={() => (passwordFlow || loginRecipe ? setOpen(!open) : openAuthDialog())} title="Choose a token">
                    <span className="cf-session-dot"/>
                    <span className="cf-session-name">Not signed in</span>
                    <span className="cf-session-action">Sign in</span>
                </button>
            )}

            {open && (
                <div className="cf-popover is-session">
                    {info ? (
                        <>
                            <div className="cf-sess-head">
                                <span className={`cf-sess-dot is-${info.state}`}/>
                                <div className="cf-sess-who">
                                    <div className="cf-sess-name">{info.name}</div>
                                    <div className="cf-sess-sub" title={issuedAt ? `Issued ${issuedAt}` : undefined}>
                                        {tokenLabel && tokenLabel !== info.name && <><span>{tokenLabel}</span><span className="cf-sess-sep">·</span></>}
                                        {expiresAt
                                            ? <span className={`is-${info.state}`}>{info.state === "expired" ? "expired" : "expires"} {expiresAt} ({info.expiry})</span>
                                            : <span>opaque token, no expiry</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="cf-sess-body">
                                <div className="cf-token-view">
                                    <code>{reveal ? token : `${token.slice(0, 14)}…${token.slice(-6)}`}</code>
                                    <button className="cf-icon-btn" title={reveal ? "Hide token" : "Show token"} onClick={() => setReveal(!reveal)}>
                                        {reveal ? <EyeOff size={13}/> : <Eye size={13}/>}
                                    </button>
                                    <button className="cf-icon-btn" title="Copy token" onClick={async () => {
                                        await navigator.clipboard.writeText(token).catch(() => undefined);
                                        notify("Token copied", "ok");
                                    }}><Copy size={13}/></button>
                                </div>
                                {loginOp && (
                                    <div className="cf-sess-relogin">
                                        <label className="cf-check" title="Replays the remembered login request when the token expires or is rejected">
                                            <input type="checkbox" checked={autoRelogin} onChange={(e) => actions.setAutoRelogin(e.target.checked)}/>
                                            Auto re-login via <code>{loginName}</code>
                                        </label>
                                        <span className="cf-flex"/>
                                        <button className="cf-text-btn" title="Run the login request now" onClick={reloginNow}>
                                            <RefreshCw size={12}/>&nbsp;Now
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="cf-sess-foot">
                                <button className="cf-btn" onClick={switchToken}>Switch token…</button>
                                <span className="cf-flex"/>
                                <button className="cf-btn is-danger" title="Clear the token and forget the remembered login" onClick={logout}>
                                    <LogOut size={13}/> Log out
                                </button>
                            </div>
                            {oauthForm && <div className="cf-sess-body is-bordered">{oauthForm}</div>}
                        </>
                    ) : (
                        <div className="cf-sess-body">
                            <div className="cf-sess-name">Not signed in</div>
                            <div className="cf-row-gap">
                                <button className="cf-btn" onClick={switchToken}>Choose token…</button>
                                {loginOp && <button className="cf-btn" onClick={reloginNow}><RefreshCw size={13}/> Login via {loginName}</button>}
                            </div>
                            {oauthForm}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
