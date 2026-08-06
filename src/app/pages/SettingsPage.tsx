import {GoogleDriveIcon} from "@/app/components/sync/GoogleDriveIcon";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Label} from "@/components/ui/label";
import {Separator} from "@/components/ui/separator";
import {Switch} from "@/components/ui/switch";
import {PageView, useGlobalContext} from "@/context/global-context";
import {exportToFile} from "@/lib/utils";
import {AnimatePresence, motion} from 'framer-motion';
import {ChevronDown, Download, Eye, GithubIcon, LogIn, LogOut, RefreshCw, Upload, UserRoundPlus} from 'lucide-react';
import toast from "react-hot-toast";
import packageInfo from "../../../package.json";

function lastSignInText(value?: string): string {
    return value
        ? `Last signed in ${new Date(value).toLocaleString()}`
        : "Previously connected";
}

export function SettingsPage() {
    const {
        cookies,
        swaggers,
        currentView,
        settings,
        updateSettings,
        setCurrentView,
        handleImport: globalHandleImport,
        googleDriveSync,
        isGoogleDriveConfigured,
        connectGoogleDrive,
        disconnectGoogleDrive,
        syncGoogleDriveNow,
        showGoogleDriveInHeader,
        setShowGoogleDriveInHeader,
    } = useGlobalContext();

    const handleExport = () => {
        const dataStr = exportToFile(cookies, swaggers, settings);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'cookify-export.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target?.result as string);
                        globalHandleImport(data);
                        setCurrentView(PageView.LIST_COOKIES);
                    } catch (error) {
                        console.error('Error parsing JSON file:', (error as Error).message);
                        toast.error('File import failed!');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleApplyOnClickChange = (checked: boolean) => {
        updateSettings({applyOnClick: checked});
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.25}}
                className="w-full overflow-hidden select-none"
            >
                <div className="container mx-auto px-2 pb-4 flex flex-col gap-3">
                    <h1 className="text-2xl font-bold">Settings</h1>

                    <Card className="">
                        <CardHeader>
                            <CardTitle>Behavior</CardTitle>
                            <CardDescription>
                                Configure how the application behaves
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between gap-1">
                                <div>
                                    <Label htmlFor="apply-on-click" className="text-base">Apply on click</Label>
                                    <p className="text-sm text-muted-foreground ">
                                        When enabled, clicking on a row in the table will automatically apply the cookie or swagger
                                    </p>
                                </div>
                                <Switch
                                    id="apply-on-click"
                                    checked={settings.applyOnClick}
                                    onCheckedChange={handleApplyOnClickChange}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border mb-6">
                        <CardHeader>
                            <CardTitle>Data Management</CardTitle>
                            <CardDescription>
                                Import, export, or sync your Cookify data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleImport} className="w-full">
                                    <Upload className="h-4 w-4" /> Import File
                                </Button>
                                <Button variant="outline" onClick={handleExport} className="w-full">
                                    <Download className="h-4 w-4" /> Export File
                                </Button>
                            </div>

                            <Separator />

                            <div className="flex items-start gap-3">
                                <GoogleDriveIcon className="mt-0.5 h-5 w-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">Google Drive Sync</p>
                                    <p className="text-xs text-muted-foreground">
                                        Back up and sync across computers.
                                    </p>
                                </div>
                            </div>

                            {!showGoogleDriveInHeader && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-fit"
                                    onClick={() => setShowGoogleDriveInHeader(true)}
                                >
                                    <Eye className="h-4 w-4" />
                                    {googleDriveSync.enabled
                                        ? "Show Google account in header"
                                        : "Show Google sign-in in header"}
                                </Button>
                            )}

                            {!isGoogleDriveConfigured && (
                                <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                                    Google OAuth is not configured in this build. Set <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code> before building Cookify.
                                </p>
                            )}

                            {googleDriveSync.enabled ? (
                                <>
                                    <div className="flex items-center gap-2 text-sm">
                                        {googleDriveSync.profileImageUrl && (
                                            <img
                                                src={googleDriveSync.profileImageUrl}
                                                alt="Google account"
                                                className="h-8 w-8 rounded-full"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{googleDriveSync.email || "Connected Google account"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {googleDriveSync.lastSyncedAt
                                                    ? `Last synced ${new Date(googleDriveSync.lastSyncedAt).toLocaleString()}`
                                                    : "Waiting for first sync"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={googleDriveSync.isSyncing}
                                            onClick={() => void syncGoogleDriveNow()}
                                        >
                                            <RefreshCw className={googleDriveSync.isSyncing ? "animate-spin" : ""} />
                                            {googleDriveSync.isSyncing ? "Syncing…" : "Sync now"}
                                        </Button>
                                        <Button variant="destructive" className="w-full" onClick={() => void disconnectGoogleDrive()}>
                                            <LogOut /> Disconnect
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex w-full">
                                    <Button
                                        className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-r-none px-3 py-2"
                                        disabled={!isGoogleDriveConfigured || googleDriveSync.isSyncing}
                                        onClick={() => void connectGoogleDrive()}
                                    >
                                        {googleDriveSync.profileImageUrl ? (
                                            <img
                                                src={googleDriveSync.profileImageUrl}
                                                alt=""
                                                className="h-8 w-8 shrink-0 rounded-full"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <GoogleDriveIcon className="h-6 w-6 shrink-0" />
                                        )}
                                        <span className="min-w-0 text-left leading-tight">
                                            <span className="block truncate font-semibold">
                                                {googleDriveSync.isSyncing
                                                    ? "Connecting…"
                                                    : googleDriveSync.email || "Connect Google Drive"}
                                            </span>
                                            {googleDriveSync.email && (
                                                <span className="mt-0.5 block truncate text-[11px] font-normal text-white/60">
                                                    {lastSignInText(googleDriveSync.lastConnectedAt || googleDriveSync.lastSyncedAt)}
                                                </span>
                                            )}
                                        </span>
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="h-auto self-stretch rounded-l-none border-l border-white/25 px-3"
                                                disabled={!isGoogleDriveConfigured || googleDriveSync.isSyncing}
                                                aria-label="Choose Google account"
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-72">
                                            {googleDriveSync.email && (
                                                <>
                                                    <DropdownMenuItem className="cursor-pointer gap-3 py-2" onClick={() => void connectGoogleDrive()}>
                                                        {googleDriveSync.profileImageUrl ? (
                                                            <img
                                                                src={googleDriveSync.profileImageUrl}
                                                                alt=""
                                                                className="h-8 w-8 shrink-0 rounded-full"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <LogIn className="h-4 w-4" />
                                                        )}
                                                        <span className="min-w-0 leading-tight">
                                                            <span className="block truncate font-medium">{googleDriveSync.email}</span>
                                                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                                                {lastSignInText(googleDriveSync.lastConnectedAt || googleDriveSync.lastSyncedAt)}
                                                            </span>
                                                        </span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                </>
                                            )}
                                            <DropdownMenuItem
                                                className="cursor-pointer gap-3 py-2"
                                                onClick={() => void connectGoogleDrive(true)}
                                            >
                                                <UserRoundPlus className="h-4 w-4" />
                                                Use another Google account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}

                            {googleDriveSync.error && (
                                <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{googleDriveSync.error}</p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="-mt-6 text-center text-sm text-muted-foreground flex flex-col gap-0.5">
                        <p className="font-semibold select-none">Author</p>
                        <p className="select-text">Emre Demircan</p>
                        <p className="flex items-center justify-center gap-2">

                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-2"
                                asChild
                            >
                                <a
                                    href="https://github.com/emrecpp"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <GithubIcon className="h-3.5 w-3.5" /> emrecpp
                                </a>
                            </Button>
                        </p>
                        <p className="text-xs select-none mt-2">v{packageInfo.version}</p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

