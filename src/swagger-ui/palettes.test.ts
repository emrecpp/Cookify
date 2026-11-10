import {describe, expect, it} from "vitest";
import {bootColors, isPaletteId, paletteStyle, PALETTES} from "./palettes";

describe("color palettes", () => {
    it("define the same tokens for dark and light, including the error colors", () => {
        for (const palette of PALETTES.filter((p) => p.id !== "graphite")) {
            expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort());
            for (const tokens of [palette.dark, palette.light]) {
                expect(tokens.err).toMatch(/^#[0-9a-f]{6}$/);
                expect(tokens["err-body"]).toMatch(/^#[0-9a-f]{6}$/);
            }
        }
    });
    it("turns tokens into CSS variables; graphite and unknown ids keep styles.css", () => {
        expect(paletteStyle("ocean", "dark")["--bg"]).toBe("#161b24");
        expect(paletteStyle("graphite", "light")).toEqual({});
        expect(paletteStyle("removed-one", "dark")).toEqual({});
        expect(isPaletteId("plum")).toBe(true);
        expect(isPaletteId("nope")).toBe(false);
    });
    it("gives the startup skeleton the colors of a palette", () => {
        expect(bootColors("graphite", "dark")).toBeUndefined();
        expect(bootColors("forest", "light")).toMatchObject({bg: "#f1f3ee", accent: "#c8e3cf"});
    });
});
