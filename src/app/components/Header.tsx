import {GoogleDriveIcon} from "@/app/components/sync/GoogleDriveIcon";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {PageView, PageViewTypes, useGlobalContext} from "@/context/global-context";
import {motion} from 'framer-motion';
import {lastSignInText} from "@/lib/google-drive";
import {useTheme} from "@/lib/theme";
import {ChevronDown, EyeOff, LogIn, Moon, PlusCircle, Sun, UserRoundPlus} from 'lucide-react';

export function Header() {
    const {
        currentView,
        setCurrentView,
        setEditingCookie,
        setEditingSwagger,
        cookies,
        swaggers,
        googleDriveSync,
        isGoogleDriveConfigured,
        connectGoogleDrive,
        showGoogleDriveInHeader,
        setShowGoogleDriveInHeader
    } = useGlobalContext()
    const [theme, setTheme] = useTheme()

    const activePage = (view: PageViewTypes) => {
        if (view?.includes("cookie")) return "cookies";
        if (view?.includes("swagger")) return "swaggers";
        return view;
    };

    const getHeaderTitle = () => {
        if (currentView === PageView.ADD_COOKIE) return "Add New Cookie";
        if (currentView === PageView.EDIT_COOKIE) return "Edit Cookie";
        if (currentView === PageView.ADD_SWAGGER) return "Add New Swagger";
        if (currentView === PageView.EDIT_SWAGGER) return "Edit Swagger";
        return "";
    };

    const handleAddClick = () => {
        if (activePage(currentView) === "cookies") {
            setEditingCookie(null)
            setCurrentView(PageView.ADD_COOKIE)
        } else {
            setEditingSwagger(null)
            setCurrentView(PageView.ADD_SWAGGER)
        }
    }

    const openGoogleDriveSettings = () => {
        setCurrentView(PageView.SETTINGS)

        // Wait for the settings tab to become visible before scrolling to its section.
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                document.getElementById("google-drive-settings")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                })
            })
        })
    }

    const showTitle = [PageView.ADD_COOKIE, PageView.EDIT_COOKIE, PageView.ADD_SWAGGER, PageView.EDIT_SWAGGER].includes(currentView as PageView);

    const shouldShowAddButton = () => {
        if (currentView === PageView.LIST_COOKIES) {
            return cookies.length > 0;
        } else if (currentView === PageView.LIST_SWAGGERS) {
            return swaggers.length > 0;
        }
        return false;
    };

    return (
        <div className="px-2 bg-background shadow-sm">
            <motion.header
                className="flex justify-between items-center select-none py-3"
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0}}
            >
                <div className="flex items-center">
                    <motion.button
                        type="button"
                        className="shrink-0 cursor-pointer"
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        onClick={() => setCurrentView(PageView.LIST_COOKIES)}
                        aria-label="Open Cookify cookies"
                    >
                        <img src="/icon/32.png" alt="" width={32} height={32} className="mr-1 h-8 w-8" />
                    </motion.button>
                    <div className="min-w-0 leading-none">
                        <h1>
                            <motion.button
                                type="button"
                                className="w-fit cursor-pointer text-lg font-bold text-foreground"
                                whileHover={{scale: 1.05}}
                                whileTap={{scale: 0.95}}
                                onClick={() => setCurrentView(PageView.LIST_COOKIES)}
                            >
                                Cookify
                            </motion.button>
                        </h1>
                        {showGoogleDriveInHeader && (googleDriveSync.enabled ? (
                            <button
                                type="button"
                                className="mt-0.5 flex items-center max-w-[260px] justify-center gap-1 text-left text-[11px] leading-tight text-muted-foreground hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none"
                                onClick={openGoogleDriveSettings}
                                title="Open Google Drive settings"
                                aria-label={googleDriveSync.email
                                    ? `Open Google Drive settings for ${googleDriveSync.email}`
                                    : "Open Google Drive settings"}
                            >
                                {googleDriveSync.profileImageUrl ? (
                                    <img
                                        src={googleDriveSync.profileImageUrl}
                                        alt=""
                                        className="h-3.5 w-3.5 shrink-0 rounded-full"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <GoogleDriveIcon className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="shrink-0 font-medium text-muted-foreground">Google</span>
                                {googleDriveSync.email && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span className="truncate">{googleDriveSync.email}</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="mt-0.5 flex max-w-[260px]">
                                <button
                                    type="button"
                                    className="flex min-w-0 items-center gap-1 rounded-l-full rounded-r-none border border-border bg-muted/50 py-0.5 pl-1.5 pr-1 text-[11px] font-medium leading-tight text-muted-foreground hover:border-ring/40 hover:bg-accent hover:text-foreground focus-visible:z-10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!isGoogleDriveConfigured || googleDriveSync.isSyncing}
                                    onClick={() => void connectGoogleDrive()}
                                    title={isGoogleDriveConfigured
                                        ? "Connect Google Drive"
                                        : "Google Drive is not configured in this build"}
                                >
                                    {googleDriveSync.profileImageUrl ? (
                                        <img
                                            src={googleDriveSync.profileImageUrl}
                                            alt=""
                                            className="h-3.5 w-3.5 shrink-0 rounded-full"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <GoogleDriveIcon className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {googleDriveSync.isSyncing
                                            ? "Connecting…"
                                            : googleDriveSync.email
                                                ? `Sign in as ${googleDriveSync.email}`
                                                : "Sign in with Google"}
                                    </span>
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="shrink-0 rounded-l-none rounded-r-full border border-l-0 border-border bg-muted/50 px-1 py-0.5 text-muted-foreground hover:border-ring/40 hover:bg-accent hover:text-foreground focus-visible:z-10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={googleDriveSync.isSyncing}
                                            aria-label="Choose Google account"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-72">
                                        {googleDriveSync.email && (
                                            <>
                                                <DropdownMenuItem
                                                    className="cursor-pointer gap-3 py-2"
                                                    disabled={!isGoogleDriveConfigured}
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
                                            disabled={!isGoogleDriveConfigured}
                                            onClick={() => void connectGoogleDrive(true)}
                                        >
                                            <UserRoundPlus className="h-4 w-4" />
                                            Use another Google account
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="cursor-pointer gap-3 py-2"
                                            onClick={() => setShowGoogleDriveInHeader(false)}
                                        >
                                            <EyeOff className="h-4 w-4" />
                                            Hide Google sign-in from header
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>

                {showTitle && (
                    <div className="min-w-0 flex-1 truncate px-4 text-center text-sm font-medium text-muted-foreground">
                        {getHeaderTitle()}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {(currentView === PageView.LIST_COOKIES || currentView === PageView.LIST_SWAGGERS) && shouldShowAddButton() && (
                        <Button className="min-w-40" variant="outline" size="sm" onClick={handleAddClick}>
                            <PlusCircle
                                className="h-4 w-4 mr-1" /> {activePage(currentView) === "cookies" ? 'Add New Cookie' : 'Add New Swagger'}
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
                        {theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
                    </Button>
                </div>
            </motion.header>
            <div className="w-full bg-border h-[1px] my-1" />
        </div>
    )
}

