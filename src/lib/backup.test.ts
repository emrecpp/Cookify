import {describe, expect, it} from "vitest";
import {parseImport} from "./backup";

describe("parseImport", () => {
    it("reads files of the first export version (popup data only)", () => {
        const file = parseImport(JSON.stringify({name: "cookify", version: 1, cookies: [{alias: "a", name: "sid", value: "1"}], swaggers: [], settings: {applyOnClick: true, projects: ["p"]}}));
        expect(file.snapshot.cookies[0].name).toBe("sid");
        expect(file.snapshot.settings.applyOnClick).toBe(true);
        expect(file.snapshot.swaggerUi).toBeUndefined();
        expect(file.hasSecrets).toBe(true);
    });

    it("reads Google Drive backups and full exports with the Swagger view data", () => {
        const drive = parseImport(JSON.stringify({name: "cookify", version: 3, snapshot: {cookies: [], swaggers: [], settings: {}, swaggerUi: {states: {"project:r": {favorites: ["x"]}}}}}));
        expect(drive.snapshot.swaggerUi!.states["project:r"].favorites).toEqual(["x"]);
        const plain = parseImport(JSON.stringify({name: "cookify", version: 3, includesSecrets: false, cookies: [], swaggers: [], swaggerUi: {apis: {apis: [{id: "r"}], version: 2}, states: {}}}));
        expect(plain.snapshot.swaggerUi!.apis!.apis).toHaveLength(1);
        expect(plain.hasSecrets).toBe(false);
    });

    it("rejects files that are not Cookify exports", () => {
        expect(() => parseImport("{")).toThrow("not valid JSON");
        expect(() => parseImport(JSON.stringify({cookies: []}))).toThrow("not a Cookify export");
        expect(() => parseImport(JSON.stringify({name: "cookify", version: 9}))).toThrow("newer Cookify");
    });
});
