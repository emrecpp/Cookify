import {SyncSnapshot} from "@/types/types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FILE_NAME = "cookify-sync.json";
const LEGACY_DRIVE_FILE_NAME = "cookify-sync-v2.json";
const PLACEHOLDER_CLIENT_ID_PREFIX = "000000000000-";
const WEB_AUTH_SELECTION_KEY = "CookifyGoogleDriveWebAuthSelection";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive.appdata",
    "openid",
    "email",
    "profile",
];

interface WebAuthSelection {
    enabled: boolean;
    email?: string;
}

interface WebTokenCache {
    token: string;
    expiresAt: number;
}

let webTokenCache: WebTokenCache | undefined;

interface DriveFile {
    id: string;
    name: string;
    modifiedTime?: string;
}

interface DriveFileList {
    files?: DriveFile[];
}

export interface DriveSyncDocument {
    name: "cookify";
    version: 2;
    updatedAt: string;
    snapshot: SyncSnapshot;
}

export interface GoogleAccountProfile {
    email?: string;
    profileImageUrl?: string;
}

function getConfiguredClientId(): string | undefined {
    return chrome.runtime.getManifest().oauth2?.client_id;
}

function getConfiguredWebClientId(): string | undefined {
    const clientId = import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID as string | undefined;
    const trimmedClientId = clientId?.trim() || undefined;
    return trimmedClientId;
}

function readWebAuthSelection(): WebAuthSelection {
    try {
        const raw = localStorage.getItem(WEB_AUTH_SELECTION_KEY);
        return raw ? JSON.parse(raw) as WebAuthSelection : {enabled: false};
    } catch {
        return {enabled: false};
    }
}

function writeWebAuthSelection(selection: WebAuthSelection): void {
    localStorage.setItem(WEB_AUTH_SELECTION_KEY, JSON.stringify(selection));
}

export function isGoogleDriveConfigured(): boolean {
    const clientId = getConfiguredClientId();
    return !!clientId && !clientId.startsWith(PLACEHOLDER_CLIENT_ID_PREFIX);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function getChromeAccessToken(interactive: boolean): Promise<string> {
    if (!isGoogleDriveConfigured()) {
        throw new Error("Google OAuth is not configured for this build.");
    }

    const result = await chrome.identity.getAuthToken({interactive});
    if (!result.token) {
        throw new Error("Google did not return an access token.");
    }
    return result.token;
}

async function getWebAccessToken(interactive: boolean, chooseAccount = false): Promise<string> {
    if (!chooseAccount && webTokenCache && webTokenCache.expiresAt > Date.now() + 60_000) {
        return webTokenCache.token;
    }

    const clientId = getConfiguredWebClientId();
    if (!clientId || clientId === "WEB_CLIENT_ID") {
        throw new Error("Google account chooser is not configured for this build.");
    }

    const selection = readWebAuthSelection();
    const state = crypto.randomUUID();
    const redirectUri = chrome.identity.getRedirectURL("google-oauth");
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: GOOGLE_SCOPES.join(" "),
        include_granted_scopes: "true",
        state,
    });

    if (chooseAccount) {
        params.set("prompt", "select_account");
    } else if (selection.email) {
        params.set("login_hint", selection.email);
    }

    const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: `${GOOGLE_AUTH_ENDPOINT}?${params}`,
        interactive,
    });
    if (!responseUrl) throw new Error("Google did not complete account selection.");

    const response = new URL(responseUrl);
    const result = new URLSearchParams(response.hash.slice(1));
    if (result.get("state") !== state) throw new Error("Google OAuth state validation failed.");
    const oauthError = result.get("error");
    if (oauthError) throw new Error(`Google OAuth failed: ${oauthError}`);

    const token = result.get("access_token");
    if (!token) throw new Error("Google did not return an access token.");
    const expiresIn = Number(result.get("expires_in") || "3600");
    webTokenCache = {
        token,
        expiresAt: Date.now() + Math.max(expiresIn, 60) * 1000,
    };
    return token;
}

async function getAccessToken(interactive: boolean): Promise<string> {
    return readWebAuthSelection().enabled
        ? getWebAccessToken(interactive)
        : getChromeAccessToken(interactive);
}

async function invalidateAccessToken(token: string): Promise<void> {
    if (readWebAuthSelection().enabled) {
        webTokenCache = undefined;
        return;
    }
    await chrome.identity.removeCachedAuthToken({token});
}

async function authorizedFetch(
    url: string,
    init: RequestInit = {},
    interactive = false,
): Promise<Response> {
    let token = await getAccessToken(interactive);
    const request = (accessToken: string) => fetch(url, {
        ...init,
        headers: {
            ...init.headers,
            Authorization: `Bearer ${accessToken}`,
        },
    });

    let response = await request(token);
    if (response.status === 401) {
        await invalidateAccessToken(token);
        token = await getAccessToken(interactive);
        response = await request(token);
    }
    return response;
}

async function assertOk(response: Response, action: string): Promise<void> {
    if (response.ok) return;
    let detail = "";
    try {
        const body = await response.json() as {error?: {message?: string}};
        detail = body.error?.message || "";
    } catch {
        detail = await response.text().catch(() => "");
    }
    throw new Error(`${action} failed (${response.status})${detail ? `: ${detail}` : ""}`);
}

async function fetchGoogleAccountProfile(token: string): Promise<GoogleAccountProfile> {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: {Authorization: `Bearer ${token}`},
    });
    if (!response.ok) return {};
    const profile = await response.json() as {email?: string; picture?: string};
    return {
        email: profile.email,
        profileImageUrl: profile.picture,
    };
}

async function getGoogleAccountProfile(interactive: boolean): Promise<GoogleAccountProfile> {
    const token = await getAccessToken(interactive);
    const chromeProfile = await chrome.identity.getProfileUserInfo({accountStatus: "ANY"});
    try {
        const profile = await fetchGoogleAccountProfile(token);
        return {
            email: profile.email || chromeProfile.email || undefined,
            profileImageUrl: profile.profileImageUrl,
        };
    } catch {
        return {email: chromeProfile.email || undefined};
    }
}

export async function connectGoogleDrive(chooseAccount = false): Promise<GoogleAccountProfile> {
    if (chooseAccount) {
        const token = await getWebAccessToken(true, true);
        const profile = await fetchGoogleAccountProfile(token);
        if (!profile.email) throw new Error("Google did not return the selected account email.");
        writeWebAuthSelection({enabled: true, email: profile.email});
        return profile;
    }
    return getGoogleAccountProfile(true);
}

export function getCachedGoogleAccountProfile(): Promise<GoogleAccountProfile> {
    return getGoogleAccountProfile(false);
}

export async function logoutGoogleDrive(): Promise<void> {
    webTokenCache = undefined;
    try {
        await chrome.identity.clearAllCachedAuthTokens();
    } catch (error) {
        console.warn("Could not clear Google authentication tokens:", errorMessage(error));
    }
}

export async function findSyncFile(): Promise<DriveFile | undefined> {
    const params = new URLSearchParams({
        spaces: "appDataFolder",
        q: `(name = '${DRIVE_FILE_NAME}' or name = '${LEGACY_DRIVE_FILE_NAME}') and trashed = false`,
        fields: "files(id,name,modifiedTime)",
        orderBy: "modifiedTime desc",
        pageSize: "10",
    });
    const response = await authorizedFetch(`${DRIVE_API}/files?${params}`);
    await assertOk(response, "Finding the Cookify backup");
    const body = await response.json() as DriveFileList;
    return body.files?.[0];
}

export async function downloadSyncDocument(fileId: string): Promise<DriveSyncDocument> {
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
    await assertOk(response, "Downloading the Cookify backup");
    const data = await response.json() as DriveSyncDocument;
    if (data.name !== "cookify" || data.version !== 2 || !data.snapshot) {
        throw new Error("The Google Drive backup has an unsupported format.");
    }
    return data;
}

async function createSyncFile(document: DriveSyncDocument): Promise<string> {
    const boundary = `cookify-${crypto.randomUUID()}`;
    const metadata = JSON.stringify({
        name: DRIVE_FILE_NAME,
        mimeType: "application/json",
        parents: ["appDataFolder"],
    });
    const body = [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        metadata,
        `--${boundary}`,
        "Content-Type: application/json",
        "",
        JSON.stringify(document),
        `--${boundary}--`,
        "",
    ].join("\r\n");
    const response = await authorizedFetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`, {
        method: "POST",
        headers: {"Content-Type": `multipart/related; boundary=${boundary}`},
        body,
    });
    await assertOk(response, "Creating the Cookify backup");
    const file = await response.json() as Pick<DriveFile, "id">;
    return file.id;
}

export async function uploadSyncDocument(
    snapshot: SyncSnapshot,
    existingFileId?: string,
): Promise<{fileId: string; document: DriveSyncDocument}> {
    const document: DriveSyncDocument = {
        name: "cookify",
        version: 2,
        updatedAt: new Date().toISOString(),
        snapshot,
    };
    if (!existingFileId) {
        const fileId = await createSyncFile(document);
        return {fileId, document};
    }

    const fileId = existingFileId;
    const response = await authorizedFetch(
        `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`,
        {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(document),
        },
    );
    await assertOk(response, "Uploading the Cookify backup");
    return {fileId, document};
}
