import { describe, expect, it } from "vitest";
import { applyConflictResolutions, mergeSnapshots, normalizeSnapshot } from "./sync";
import { CookieData, SwaggerData, SyncSnapshot } from "@/types/types";

const timestamp = "2026-08-06T10:00:00.000Z";

function cookie(value: string, updatedAt = timestamp): CookieData {
    return {
        id: "cookie-1",
        alias: "Local API",
        name: "session",
        value,
        domain: "example.com",
        project: "Cookify",
        createdAt: timestamp,
        updatedAt,
    };
}

function swagger(alias: string, bearerToken: string): SwaggerData {
    return {
        id: `swagger-${alias}`,
        alias,
        bearerToken,
        project: "Cookify",
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function snapshot(cookies: CookieData[] = [], swaggers: SwaggerData[] = []): SyncSnapshot {
    return normalizeSnapshot({
        cookies,
        swaggers,
        settings: { applyOnClick: false, projects: ["Cookify"], activeProject: null, updatedAt: timestamp },
    });
}

describe("Google Drive snapshot merging", () => {
    it("merges profiles that exist only on one side", () => {
        const result = mergeSnapshots(
            snapshot([cookie("local")]),
            snapshot([], [swagger("Staging", "remote-token")]),
        );

        expect(result.conflicts).toHaveLength(0);
        expect(result.snapshot.cookies).toHaveLength(1);
        expect(result.snapshot.swaggers).toHaveLength(1);
    });

    it("reports different first-sync versions of the same profile", () => {
        const result = mergeSnapshots(snapshot([cookie("local")]), snapshot([cookie("cloud")]));

        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].local).toMatchObject({ value: "local" });
        expect(result.conflicts[0].cloud).toMatchObject({ value: "cloud" });
    });

    it("accepts a one-sided edit without prompting", () => {
        const baseline = snapshot([cookie("old")]);
        const result = mergeSnapshots(
            snapshot([cookie("local-new", "2026-08-06T11:00:00.000Z")]),
            baseline,
            baseline,
        );

        expect(result.conflicts).toHaveLength(0);
        expect(result.snapshot.cookies[0].value).toBe("local-new");
    });

    it("reports when both sides changed after the last sync", () => {
        const baseline = snapshot([cookie("old")]);
        const result = mergeSnapshots(
            snapshot([cookie("local-new")]),
            snapshot([cookie("cloud-new")]),
            baseline,
        );

        expect(result.conflicts).toHaveLength(1);
    });

    it("propagates deletion when the other side is unchanged", () => {
        const baseline = snapshot([cookie("old")]);
        const result = mergeSnapshots(snapshot(), baseline, baseline);

        expect(result.conflicts).toHaveLength(0);
        expect(result.snapshot.cookies).toHaveLength(0);
    });

    it("asks before resolving deletion against an edited profile", () => {
        const baseline = snapshot([cookie("old")]);
        const result = mergeSnapshots(
            snapshot(),
            snapshot([cookie("cloud-new")]),
            baseline,
        );

        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].local).toBeNull();
        const resolved = applyConflictResolutions(result, { [result.conflicts[0].id]: "cloud" });
        expect(resolved.cookies[0].value).toBe("cloud-new");
    });

    it("syncs the most recently selected project", () => {
        const local = snapshot();
        local.settings.activeProject = "Local";
        local.settings.updatedAt = "2026-08-06T11:00:00.000Z";

        const cloud = snapshot();
        cloud.settings.activeProject = "Cloud";
        cloud.settings.updatedAt = "2026-08-06T12:00:00.000Z";

        const result = mergeSnapshots(local, cloud);

        expect(result.snapshot.settings.activeProject).toBe("Cloud");
    });
});
