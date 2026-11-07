import {useMemo, useRef, useState} from "react";
import {ChevronsDownUp, ChevronsUpDown, CircleAlert, CircleCheck, Copy, CornerUpRight, Search, ServerCrash, WifiOff, X} from "lucide-react";
import {actions, notify, SentResponse} from "../state";
import {useSpec} from "../context";
import {prettyBody} from "../pretty";
import {authProblem, findTokenInResponse, formatBytes, tokenInfo} from "../request";
import {rememberLogin} from "../session";
import {AuthQuickPick} from "./AuthDialog";
import {copyText} from "../clipboard";
import {IconLabel, JsonCode, JsonCodeHandle} from "./JsonCode";
import {useDelayed, WaitingResponse} from "./SnakeLoader";

export function statusClass(status: number): string {
    if (!status) return "is-err";
    if (status < 300) return "is-ok";
    if (status < 400) return "is-info";
    return "is-err";
}

/** Status glyph: success, redirect, client error, server error, or no response at all (network / CORS). */
export function StatusIcon({status, size = 15}: { status: number; size?: number }) {
    const Icon = !status ? WifiOff : status < 300 ? CircleCheck : status < 400 ? CornerUpRight : status < 500 ? CircleAlert : ServerCrash;
    return <Icon size={size} strokeWidth={2.25} className="cf-status-icon"/>;
}

const SNAKE_DELAY = 250;

export function ResponseView({opKey, response, loading, onRetry}: {
    opKey: string; response: SentResponse; loading?: boolean; onRetry: (token: string) => void;
}) {
    const {spec} = useSpec();
    const [tab, setTab] = useState<"body" | "headers">("body");
    const code = useRef<JsonCodeHandle>(null);
    const pretty = useMemo(() => prettyBody(response.bodyText ?? "", response.contentType), [response.bodyText, response.contentType]);
    const token = useMemo(() => findTokenInResponse(response.bodyText), [response.bodyText]);
    const isImage = /^image\//i.test(response.contentType);
    const problem = useMemo(() => authProblem(response.status, response.bodyText), [response.status, response.bodyText]);
    // A slow request swaps the old body for the snake, so the previous answer is not mistaken for the new one.
    const waiting = useDelayed(!!loading, SNAKE_DELAY);
    if (waiting) return <WaitingResponse waited={SNAKE_DELAY}/>;

    return (
        <div className="cf-response">
            <div className="cf-response-bar">
                <span className={`cf-status is-lg ${statusClass(response.status)}`}>
                    <StatusIcon status={response.status}/>
                    {response.status || "Error"}{response.statusText ? ` ${response.statusText}` : ""}
                </span>
                <span className="cf-metric">{response.ms} ms</span>
                <span className="cf-metric">{formatBytes(response.size)}</span>
                {loading && <span className="cf-metric">Sending…</span>}
                <span className="cf-flex"/>
                {token && (
                    <button className="cf-btn is-accent" title="Use the token from this response for all secured endpoints" onClick={() => {
                        const login = rememberLogin(spec, opKey, response.bodyText, token);
                        actions.setToken(token, login?.label ?? tokenInfo(token).name);
                        notify(login ? "Signed in. This login is remembered and replayed when the token expires." : "Token applied to secured endpoints", "ok");
                    }}>
                        Use token
                    </button>
                )}
                {response.bodyText !== undefined && (
                    <button className="cf-text-btn" title="Copy the response body" onClick={async () => {
                        if (await copyText(response.bodyText ?? "")) notify("Response copied", "ok");
                    }}>
                        <IconLabel icon={<Copy size={12}/>}>Copy</IconLabel>
                    </button>
                )}
                <button className="cf-text-btn is-danger" title="Clear the response" onClick={() => actions.setResponse(opKey, undefined)}>
                    <IconLabel icon={<X size={13}/>}>Clear</IconLabel>
                </button>
            </div>
            {problem && <AuthQuickPick reason={problem} onRetry={onRetry}/>}
            <div className="cf-response-tools">
                <div className="cf-seg">
                    <button className={tab === "body" ? "is-on" : ""} onClick={() => setTab("body")}>Body</button>
                    <button className={tab === "headers" ? "is-on" : ""} onClick={() => setTab("headers")}>Headers ({response.headers.length})</button>
                </div>
                <span className="cf-flex"/>
                {tab === "body" && !response.error && !response.blobUrl && pretty.text && (
                    <>
                        {pretty.isJson && (
                            <>
                                <button className="cf-text-btn" title="Fold the deepest open level; click again to fold more" onClick={() => code.current?.collapseStep()}>
                                    <IconLabel icon={<ChevronsDownUp size={13}/>}>Collapse</IconLabel>
                                </button>
                                <button className="cf-text-btn" title="Unfold everything" onClick={() => code.current?.expandAll()}>
                                    <IconLabel icon={<ChevronsUpDown size={13}/>}>Expand</IconLabel>
                                </button>
                            </>
                        )}
                        <button className="cf-text-btn" title="Find in the response (Ctrl+F)" onClick={() => code.current?.openSearch()}>
                            <IconLabel icon={<Search size={13}/>}>Find</IconLabel>
                        </button>
                    </>
                )}
            </div>
            {response.error && <div className="cf-error">{response.error}</div>}
            {tab === "body" && !response.error && (
                response.blobUrl ? (
                    <div className="cf-blob">
                        {isImage && <img src={response.blobUrl} alt="response"/>}
                        <a className="cf-btn" href={response.blobUrl} download>Download {response.contentType}</a>
                    </div>
                ) : (
                    pretty.text
                        ? <JsonCode ref={code} value={pretty.text} language={pretty.isJson ? "json" : "text"} readOnly lineNumbers fill externalTools
                                    error={response.status >= 400}/>
                        : <div className="cf-placeholder">(empty body)</div>
                )
            )}
            {tab === "headers" && (
                <div className="cf-kv">
                    {response.headers.map(([k, v]) => (
                        <div key={k} className="cf-kv-row">
                            <span>{k}</span>
                            <span>{v}</span>
                            <button className="cf-kv-copy" title={`Copy the value of ${k}`} onClick={async () => {
                                if (await copyText(v)) notify(`Copied ${k}`, "ok");
                            }}>
                                <Copy size={12}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
