import {GoogleDriveIcon} from "@/app/components/sync/GoogleDriveIcon";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {PageView, useGlobalContext} from "@/context/global-context";
import {applyImport, buildExport, ImportedFile, parseImport, summarize} from "@/lib/backup";
import {isEncryptedBackup, openBackup, packBackup} from "@/lib/backup-file";
import {lastSignInText} from "@/lib/google-drive";
import {getSwaggerUiPrefs, setSwaggerUiEnabled} from "@/lib/swagger-bridge";
import {cn} from "@/lib/utils";
import {FormEvent, ReactNode, useEffect, useState} from "react";
import {
    ChevronDown,
    Download,
    GithubIcon,
    LogIn,
    LogOut,
    LucideIcon,
    MousePointerClick,
    PanelsTopLeft,
    RefreshCw,
    Upload,
    UserRound,
    UserRoundPlus,
} from 'lucide-react';
import toast from "react-hot-toast";
import packageInfo from "../../../package.json";

const syncTime = (value: string) => new Date(value).toLocaleString([], {dateStyle: "medium", timeStyle: "short"});

const GroupLabel = ({children}: { children: ReactNode }) => (
    <h2 className="px-1 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">{children}</h2>
);

const IconTile = ({icon: Icon}: { icon: LucideIcon }) => (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4"/>
    </span>
);

function SwitchRow({id, icon, title, description, checked, onChange}: {
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label htmlFor={id} className="flex cursor-pointer items-center gap-3 px-1 py-2">
            <IconTile icon={icon}/>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-5">{title}</span>
                <span className="block truncate text-xs leading-4 text-muted-foreground">{description}</span>
            </span>
            <Switch id={id} checked={checked} onCheckedChange={onChange}/>
        </label>
    );
}

function ActionTile({icon: Icon, title, description, onClick}: { icon: LucideIcon; title: string; description: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-md bg-muted/60 px-3 py-2 text-left hover:bg-accent">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground"/>
            <span className="min-w-0">
                <span className="block text-sm font-medium leading-5">{title}</span>
                <span className="block truncate text-xs leading-4 text-muted-foreground">{description}</span>
            </span>
        </button>
    );
}

function SyncState({tone, children}: { tone: "ok" | "busy" | "warn"; children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", tone === "ok" && "bg-emerald-500", tone === "busy" && "bg-sky-500", tone === "warn" && "bg-amber-500")}/>
            {children}
        </span>
    );
}

function GoogleDriveSection() {
    const {googleDriveSync: sync, isGoogleDriveConfigured, connectGoogleDrive, logoutGoogleDrive, syncGoogleDriveNow} = useGlobalContext();
    const conflicts = sync.conflicts.length;
    const lastSynced = sync.lastSyncedAt ? `Last synced ${syncTime(sync.lastSyncedAt)}` : "Waiting for first sync";

    const state = sync.isSyncing ? <SyncState tone="busy">Syncing…</SyncState>
        : conflicts ? <SyncState tone="warn">{conflicts} {conflicts === 1 ? "conflict" : "conflicts"}</SyncState>
            : sync.error ? <SyncState tone="warn">Sync failed</SyncState>
                : <SyncState tone="ok">{lastSynced}</SyncState>;

    return (
        <div id="google-drive-settings" className="scroll-mt-2">
            <div className="flex items-center gap-3 px-1 py-1">
                {sync.profileImageUrl
                    ? <img src={sync.profileImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full" referrerPolicy="no-referrer"/>
                    : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><GoogleDriveIcon className="h-5 w-5"/></span>}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5">{sync.email || (sync.enabled ? "Google Drive" : "Google Drive sync")}</p>
                    <p className="truncate text-xs leading-4 text-muted-foreground">
                        {sync.enabled ? state : sync.email ? lastSignInText(sync.lastConnectedAt || sync.lastSyncedAt) : "Continue on any computer with the same account"}
                    </p>
                </div>
                {sync.enabled ? (
                    <>
                        <Button size="sm" disabled={sync.isSyncing} onClick={() => void syncGoogleDriveNow()}>
                            <RefreshCw/> {sync.isSyncing ? "Syncing…" : "Sync now"}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" title="Log out of Google Drive" aria-label="Log out of Google Drive" onClick={() => void logoutGoogleDrive()}>
                            <LogOut/>
                        </Button>
                    </>
                ) : (
                    <div className="flex shrink-0">
                        <Button size="sm" className="rounded-r-none" disabled={!isGoogleDriveConfigured || sync.isSyncing} onClick={() => void connectGoogleDrive()}>
                            {sync.isSyncing ? "Connecting…" : "Connect"}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/25 px-2" disabled={!isGoogleDriveConfigured || sync.isSyncing} aria-label="Choose Google account">
                                    <ChevronDown/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72">
                                {sync.email && (
                                    <>
                                        <DropdownMenuItem className="cursor-pointer gap-3 py-2" onClick={() => void connectGoogleDrive()}>
                                            {sync.profileImageUrl
                                                ? <img src={sync.profileImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full" referrerPolicy="no-referrer"/>
                                                : <LogIn className="h-4 w-4"/>}
                                            <span className="min-w-0 leading-tight">
                                                <span className="block truncate font-medium">{sync.email}</span>
                                                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                    {lastSignInText(sync.lastConnectedAt || sync.lastSyncedAt)}
                                                </span>
                                            </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                    </>
                                )}
                                <DropdownMenuItem className="cursor-pointer gap-3 py-2" onClick={() => void connectGoogleDrive(true)}>
                                    <UserRoundPlus className="h-4 w-4"/>
                                    Use another Google account
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {!isGoogleDriveConfigured && (
                <p className="px-1 pt-1 text-xs text-amber-700 dark:text-amber-300">
                    Google OAuth is not configured in this build. Set <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code> before building Cookify.
                </p>
            )}
            {sync.error && <p className="px-1 pt-1 text-xs text-destructive dark:text-red-300">{sync.error}</p>}
        </div>
    );
}

function ExportDialog({onClose}: { onClose: () => void }) {
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [busy, setBusy] = useState(false);
    const mismatch = !!password && password !== repeat;

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (mismatch || busy) return;
        setBusy(true);
        try {
            const blob = new Blob([await packBackup(await buildExport(), password)], {type: "application/octet-stream"});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cookify-export-${new Date().toISOString().slice(0, 10)}.cookify`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            onClose();
        } catch (error) {
            toast.error(`Export failed: ${(error as Error).message}`);
            setBusy(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Cookify data</DialogTitle>
                    <DialogDescription>Everything goes into one compressed file, including tokens, cookie values and saved logins.</DialogDescription>
                </DialogHeader>
                <form id="export-form" className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
                    <div className="space-y-1.5">
                        <Label htmlFor="export-password">Password (optional)</Label>
                        <Input id="export-password" type="password" autoComplete="new-password" autoFocus value={password}
                               placeholder="Leave empty for no password" onChange={(event) => setPassword(event.target.value)}/>
                    </div>
                    {password && (
                        <div className="space-y-1.5">
                            <Label htmlFor="export-password-repeat">Repeat password</Label>
                            <Input id="export-password-repeat" type="password" autoComplete="new-password" value={repeat}
                                   onChange={(event) => setRepeat(event.target.value)}/>
                        </div>
                    )}
                    <p className={cn("text-xs", repeat && mismatch ? "text-destructive dark:text-red-300" : "text-muted-foreground")}>
                        {repeat && mismatch
                            ? "The passwords don't match."
                            : password
                                ? "The file will be encrypted. If you forget the password, it can't be opened."
                                : "Without a password, anyone who has this file can read your tokens and cookies."}
                    </p>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="export-form" disabled={mismatch || busy}>{busy ? "Exporting…" : "Export"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UnlockDialog({file, onUnlock, onClose}: {
    file: Uint8Array;
    onUnlock: (text: string) => void;
    onClose: () => void;
}) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!password || busy) return;
        setBusy(true);
        setError("");
        try {
            onUnlock(await openBackup(file, password));
        } catch (reason) {
            setError((reason as Error).message);
            setBusy(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Enter the file's password</DialogTitle>
                    <DialogDescription>This export is encrypted.</DialogDescription>
                </DialogHeader>
                <form id="unlock-form" className="space-y-1.5" onSubmit={(event) => void handleSubmit(event)}>
                    <Label htmlFor="import-password">Password</Label>
                    <Input id="import-password" type="password" autoComplete="off" autoFocus value={password}
                           aria-invalid={!!error} onChange={(event) => setPassword(event.target.value)}/>
                    {error && <p className="text-xs text-destructive dark:text-red-300">{error}</p>}
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" form="unlock-form" disabled={!password || busy}>{busy ? "Opening…" : "Open"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BackupSection() {
    const {setCurrentView} = useGlobalContext();
    const [exporting, setExporting] = useState(false);
    const [locked, setLocked] = useState<Uint8Array | null>(null);
    const [importing, setImporting] = useState<ImportedFile | null>(null);

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.cookify,.json,application/json';
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                if (isEncryptedBackup(bytes)) setLocked(bytes);
                else setImporting(parseImport(await openBackup(bytes)));
            } catch (error) {
                toast.error((error as Error).message);
            }
        };
        input.click();
    };

    const handleUnlock = (text: string) => {
        setLocked(null);
        try {
            setImporting(parseImport(text));
        } catch (error) {
            toast.error((error as Error).message);
        }
    };

    const confirmImport = async (mode: "merge" | "replace") => {
        if (!importing) return;
        try {
            await applyImport(importing, mode);
            toast.success(mode === "merge" ? 'Data merged' : 'Data replaced');
            setImporting(null);
            setCurrentView(PageView.LIST_COOKIES);
        } catch (error) {
            toast.error(`Import failed: ${(error as Error).message}`);
        }
    };

    const counts = importing ? summarize(importing.snapshot) : null;

    return (
        <>
            <GroupLabel>Backup</GroupLabel>
            <div className="grid grid-cols-2 gap-2 px-1 pb-1">
                <ActionTile icon={Download} title="Export" description="Save your data to a file" onClick={() => setExporting(true)}/>
                <ActionTile icon={Upload} title="Import" description="Merge or restore from a file" onClick={handleImport}/>
            </div>

            {exporting && <ExportDialog onClose={() => setExporting(false)}/>}
            {locked && <UnlockDialog file={locked} onUnlock={handleUnlock} onClose={() => setLocked(null)}/>}

            <Dialog open={!!importing} onOpenChange={(open) => !open && setImporting(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import Cookify data</DialogTitle>
                        <DialogDescription>
                            {counts && `${counts.cookies} cookies, ${counts.tokens} tokens, ${counts.apis} Swagger APIs`}
                            {importing && !importing.snapshot.swaggerUi && " · no Swagger view data (older file)"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Merge</span> adds what the file has; where both have the same item, {importing?.hasSecrets === false ? "yours is kept (the file has no tokens)" : "the file's version wins"}.</p>
                        <p><span className="font-medium">Replace</span> drops your current data and uses the file's.</p>
                        {importing?.hasSecrets === false && <p className="text-muted-foreground">This file was exported without tokens, cookie values and saved logins.</p>}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setImporting(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => void confirmImport("replace")}>Replace</Button>
                        <Button onClick={() => void confirmImport("merge")}>Merge</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function PreferencesSection() {
    const {settings, updateSettings, showGoogleDriveInHeader, setShowGoogleDriveInHeader} = useGlobalContext();
    const [swaggerUiEnabled, setSwaggerUiEnabledState] = useState(true);
    useEffect(() => {
        void getSwaggerUiPrefs().then((prefs) => setSwaggerUiEnabledState(prefs.enabled));
    }, []);

    return (
        <>
            <GroupLabel>Preferences</GroupLabel>
            <SwitchRow
                id="swagger-ui"
                icon={PanelsTopLeft}
                title="Cookify Swagger UI"
                description="Replace Swagger docs pages with the compact Cookify view"
                checked={swaggerUiEnabled}
                onChange={(checked) => {
                    setSwaggerUiEnabledState(checked);
                    void setSwaggerUiEnabled(checked);
                }}
            />
            <SwitchRow
                id="apply-on-click"
                icon={MousePointerClick}
                title="Apply on click"
                description="Clicking a table row applies the cookie or swagger"
                checked={settings.applyOnClick}
                onChange={(checked) => updateSettings({applyOnClick: checked})}
            />
            <SwitchRow
                id="google-in-header"
                icon={UserRound}
                title="Google account in header"
                description="Show your account or the sign-in button next to the logo"
                checked={showGoogleDriveInHeader}
                onChange={setShowGoogleDriveInHeader}
            />
        </>
    );
}

export function SettingsPage() {
    return (
        <div className="flex w-full select-none flex-col px-2">
            <GoogleDriveSection/>
            <BackupSection/>
            <PreferencesSection/>
            <footer className="flex items-center justify-between px-1 pt-2 text-xs text-muted-foreground">
                <span>Cookify v{packageInfo.version}</span>
                <a href="https://github.com/emrecpp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <GithubIcon className="h-3.5 w-3.5"/> Emre Demircan (emrecpp)
                </a>
            </footer>
        </div>
    );
}
