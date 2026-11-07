import { GoogleDriveIcon } from "@/app/components/sync/GoogleDriveIcon";
import { Button } from "@/components/ui/button";
import { useGlobalContext } from "@/context/global-context";
import { cn } from "@/lib/utils";
import {
    ConflictResolution,
    SwaggerData,
    SyncConflict,
    SyncEntity,
} from "@/types/types";
import { diffChars } from "diff";
import { Check, Clock3, Laptop, Save, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface DiffField {
    label: string;
    local: string;
    cloud: string;
    multiline?: boolean;
}

function formatDate(value?: string): string {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

/** A token's header and payload as indented JSON, for comparing two tokens. */
function jwtText(token?: string): string {
    if (!token) return "—";
    try {
        const [header, payload] = token.split(".");
        if (!header || !payload) return "Not a JWT";
        const decodePart = (part: string) => {
            const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
            const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        };
        return JSON.stringify({ header: decodePart(header), payload: decodePart(payload) }, null, 2);
    } catch {
        return "Not a JWT";
    }
}

function entityValue(entity: SyncEntity | null, key: string): string {
    if (!entity) return "Deleted";
    const value = entity[key as keyof SyncEntity];
    if (value === undefined || value === null || value === "") return "—";
    return String(value);
}

function getDiffFields(conflict: SyncConflict): DiffField[] {
    const { local, cloud } = conflict;
    const fields: DiffField[] = conflict.type === "cookie"
        ? [
            ["Alias", "alias"],
            ["Name", "name"],
            ["Value", "value", true],
            ["Domain", "domain"],
            ["URL", "url"],
            ["Project", "project"],
        ].map(([label, key, multiline]) => ({
            label: String(label),
            local: entityValue(local, String(key)),
            cloud: entityValue(cloud, String(key)),
            multiline: Boolean(multiline),
        }))
        : [
            ["Alias", "alias"],
            ["Project", "project"],
            ["Bearer token", "bearerToken", true],
        ].map(([label, key, multiline]) => ({
            label: String(label),
            local: entityValue(local, String(key)),
            cloud: entityValue(cloud, String(key)),
            multiline: Boolean(multiline),
        }));

    if (conflict.type === "swagger") {
        fields.push({
            label: "JWT preview",
            local: jwtText((local as SwaggerData | null)?.bearerToken),
            cloud: jwtText((cloud as SwaggerData | null)?.bearerToken),
            multiline: true,
        });
    }

    fields.push(
        { label: "Created", local: formatDate(local?.createdAt), cloud: formatDate(cloud?.createdAt) },
        { label: "Updated", local: formatDate(local?.updatedAt), cloud: formatDate(cloud?.updatedAt) },
    );
    return fields;
}

function DiffValue({ parts, side, changed, multiline }: {
    parts: { value: string; added?: boolean; removed?: boolean }[];
    side: "local" | "cloud";
    changed: boolean;
    multiline?: boolean;
}) {
    return (
        <div className={cn(
            "min-w-0 border-l px-3 py-2 text-sm",
            changed && side === "local" && "border-red-200",
            changed && side === "cloud" && "border-green-200",
        )}>
            <div className="flex gap-2">
                <span className={cn(
                    "w-3 shrink-0 select-none font-mono",
                    !changed && "invisible",
                    side === "local" ? "text-red-600" : "text-green-700",
                )}>{side === "local" ? "−" : "+"}</span>
                <pre className={cn(
                    "min-w-0 flex-1 whitespace-pre-wrap break-all font-sans",
                    multiline && "max-h-72 overflow-auto [scrollbar-gutter:stable] font-mono text-xs leading-5",
                )}>
                    {parts.map((part, index) => {
                        if (side === "local" && part.added) return null;
                        if (side === "cloud" && part.removed) return null;
                        const highlighted = side === "local" ? part.removed : part.added;
                        return (
                            <span
                                key={`${index}-${part.value.length}`}
                                className={cn(
                                    highlighted && side === "local" && "rounded-sm bg-red-200 text-red-950",
                                    highlighted && side === "cloud" && "rounded-sm bg-green-200 text-green-950",
                                )}
                            >{part.value}</span>
                        );
                    })}
                </pre>
            </div>
        </div>
    );
}

function ConflictDiff({ conflict, resolution, onResolve }: {
    conflict: SyncConflict;
    resolution?: ConflictResolution;
    onResolve: (resolution: ConflictResolution) => void;
}) {
    const fields = getDiffFields(conflict);
    const alias = conflict.local?.alias || conflict.cloud?.alias || "Unnamed profile";

    return (
        <section className="overflow-hidden rounded-lg border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{conflict.type}</span>
                    <h2 className="font-semibold">{alias}</h2>
                </div>
                <span className="text-xs text-muted-foreground">Choose the version to keep</span>
            </div>

            <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] border-b">
                <div className="bg-muted/50" />
                <div className="border-l p-3">
                    <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full", resolution === "local" && "border-red-600 bg-red-600 text-white hover:bg-red-700 hover:text-white")}
                        onClick={() => onResolve("local")}
                    >
                        <Laptop /> Keep this device {resolution === "local" && <Check className="ml-auto" />}
                    </Button>
                </div>
                <div className="border-l p-3">
                    <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full", resolution === "cloud" && "border-green-700 bg-green-700 text-white hover:bg-green-800 hover:text-white")}
                        onClick={() => onResolve("cloud")}
                    >
                        <GoogleDriveIcon /> Keep Google Drive {resolution === "cloud" && <Check className="ml-auto" />}
                    </Button>
                </div>
            </div>

            {fields.map((field) => {
                const changed = field.local !== field.cloud;
                const parts = changed ? diffChars(field.local, field.cloud) : [{ value: field.local }];
                return (
                    <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] border-b last:border-b-0" key={field.label}>
                        <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">{field.label}</div>
                        <DiffValue parts={parts} side="local" changed={changed} multiline={field.multiline} />
                        <DiffValue parts={parts} side="cloud" changed={changed} multiline={field.multiline} />
                    </div>
                );
            })}
        </section>
    );
}

export function SyncConflictPage() {
    const { googleDriveSync, resolveGoogleDriveConflicts } = useGlobalContext();
    const conflicts = googleDriveSync.conflicts;
    const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});

    useEffect(() => setResolutions({}), [conflicts]);

    const allResolved = useMemo(
        () => conflicts.length > 0 && conflicts.every((conflict) => !!resolutions[conflict.id]),
        [conflicts, resolutions],
    );

    const resolveAll = (resolution: ConflictResolution) => {
        setResolutions(Object.fromEntries(conflicts.map((conflict) => [conflict.id, resolution])));
    };

    const chooseNewest = () => {
        setResolutions(Object.fromEntries(conflicts.map((conflict) => {
            const localTime = Date.parse(conflict.local?.updatedAt || "") || 0;
            const cloudTime = Date.parse(conflict.cloud?.updatedAt || "") || 0;
            return [conflict.id, localTime >= cloudTime ? "local" : "cloud"];
        })));
    };

    if (conflicts.length === 0) {
        return (
            <main className="grid min-h-screen place-items-center bg-muted/50 p-8">
                <div className="rounded-lg border bg-background p-8 text-center shadow-sm">
                    <Check className="mx-auto mb-3 h-10 w-10 text-green-600" />
                    <h1 className="text-xl font-semibold">No sync conflicts</h1>
                    <Button className="mt-5" variant="outline" onClick={() => window.close()}><X /> Close tab</Button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-muted">
            {googleDriveSync.showProgress && <div className="google-drive-progress fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-muted" role="progressbar" />}
            <header className="sticky top-0 z-40 border-b bg-background/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-6 py-4">
                    <ShieldAlert className="h-7 w-7 text-amber-500" />
                    <div className="mr-auto">
                        <h1 className="text-xl font-semibold">Resolve sync conflicts</h1>
                        <p className="text-sm text-muted-foreground">{conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} between this device and Google Drive</p>
                    </div>
                    <Button variant="outline" onClick={() => resolveAll("local")}><Laptop /> Use this device for all</Button>
                    <Button variant="outline" onClick={() => resolveAll("cloud")}><GoogleDriveIcon /> Use Drive for all</Button>
                    <Button variant="outline" onClick={chooseNewest}><Clock3 /> Choose newest</Button>
                    <Button
                        disabled={!allResolved || googleDriveSync.isSyncing}
                        onClick={() => void resolveGoogleDriveConflicts(resolutions)}
                    >
                        <Save /> {googleDriveSync.isSyncing ? "Saving…" : "Save selected versions"}
                    </Button>
                </div>
                {googleDriveSync.error && <div className="border-t bg-red-50 px-6 py-2 text-center text-sm text-red-700">{googleDriveSync.error}</div>}
            </header>

            <div className="mx-auto max-w-[1500px] space-y-6 p-6">
                {conflicts.map((conflict) => (
                    <ConflictDiff
                        key={conflict.id}
                        conflict={conflict}
                        resolution={resolutions[conflict.id]}
                        onResolve={(resolution) => setResolutions((current) => ({ ...current, [conflict.id]: resolution }))}
                    />
                ))}
            </div>
        </main>
    );
}
