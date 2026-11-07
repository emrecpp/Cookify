// Token renewal through a remembered login request, and spec change detection.
import {Operation, ParsedSpec} from "./openapi";
import {buildRequest, defaultDraft, findTokenPath, sendRequest, tokenInfo, valueAtPath} from "./request";
import {actions, apiStore, LoginRecipe, notify} from "./state";
import {createStore} from "./store";

// ---------------------------------------------------------------------------
// Login recipe

/** Remembers the login request behind a token picked with "Use token", so it can be replayed later. */
export function rememberLogin(spec: ParsedSpec, opKey: string, bodyText: string | undefined, token: string): LoginRecipe | undefined {
    const op = spec.operations.find((o) => o.key === opKey);
    const found = findTokenPath(bodyText);
    if (!op || !found || found.token !== token) return undefined;
    const state = apiStore.get();
    const draft = structuredClone(state.drafts[opKey] ?? defaultDraft(spec, op, state.paramMemory));
    const login: LoginRecipe = {opKey, draft, tokenPath: found.path, label: tokenInfo(token).name};
    actions.setLogin(login);
    return login;
}

let pending: Promise<string | null> | null = null;

/** Replays the remembered login request and applies the new token. Concurrent calls share one request. */
export function relogin(spec: ParsedSpec, {silent = false} = {}): Promise<string | null> {
    if (pending) return pending;
    pending = (async () => {
        const {login, baseUrl} = apiStore.get();
        if (!login) return null;
        const op = spec.operations.find((o) => o.key === login.opKey);
        if (!op) {
            notify("The remembered login endpoint no longer exists", "err");
            return null;
        }
        const request = buildRequest(spec, op, login.draft, {baseUrl: baseUrl || spec.servers[0], token: ""});
        const response = await sendRequest("cookify:relogin", request);
        const token = valueAtPath(response.bodyText, login.tokenPath);
        if (response.status >= 400 || typeof token !== "string" || !token) {
            notify(`Re-login failed (${response.status || response.error || "no token"})`, "err");
            return null;
        }
        actions.setToken(token, login.label ?? tokenInfo(token).name);
        if (!silent) notify(`Signed in again via ${op.method.toUpperCase()} ${op.path}`, "ok");
        return token;
    })().finally(() => {
        pending = null;
    });
    return pending;
}

export function loginOperation(spec: ParsedSpec): Operation | undefined {
    const login = apiStore.get().login;
    return login ? spec.operations.find((o) => o.key === login.opKey) : undefined;
}

// ---------------------------------------------------------------------------
// Spec changes (new / changed / removed endpoints since the user last looked)

export interface SpecDiff {
    added: Set<string>;
    changed: Set<string>;
    removed: string[];
    signatures: Record<string, string>;
}

export const specDiffStore = createStore<{ diff: SpecDiff | null }>({diff: null});

function hash(text: string): string {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

export function operationSignature(op: Operation): string {
    return hash(JSON.stringify({
        p: op.parameters.map((p) => [p.in, p.name, p.required, p.schema]),
        b: op.requestBody ? [op.requestBody.required, op.requestBody.content] : null,
        r: op.responses.map((r) => [r.status, r.schema]),
        d: op.deprecated,
    }));
}

/** Compares the spec with what the user saw last time. The first visit only records the baseline. */
export function detectSpecChanges(spec: ParsedSpec) {
    const signatures: Record<string, string> = {};
    for (const op of spec.operations) signatures[op.key] = operationSignature(op);
    const seen = apiStore.get().seenOps;
    if (!Object.keys(seen).length) {
        actions.markOpsSeen(signatures);
        specDiffStore.set({diff: null});
        return;
    }
    const added = new Set<string>();
    const changed = new Set<string>();
    for (const [key, sig] of Object.entries(signatures)) {
        if (!(key in seen)) added.add(key);
        else if (seen[key] !== sig) changed.add(key);
    }
    const removed = Object.keys(seen).filter((key) => !(key in signatures));
    specDiffStore.set({diff: added.size || changed.size || removed.length ? {added, changed, removed, signatures} : null});
}

export function acknowledgeSpecChanges() {
    const diff = specDiffStore.get().diff;
    if (diff) actions.markOpsSeen(diff.signatures);
    specDiffStore.set({diff: null});
}
