// Appearance of the view: color palette (each with a dark and a light variant), corner radius and text size.
// "graphite" is the look defined in styles.css; the other palettes override its tokens (set as CSS variables on
// .cf-root), the JSON colors of editors and viewers included. Every palette keeps the body of a 4xx / 5xx response
// (--err-body) and errors (--err) reddish, tuned to sit well on its own background.
import type {Theme} from "./state";

export type PaletteId = "graphite" | "ocean" | "forest" | "plum";
export type RadiusId = "none" | "sm" | "md" | "lg";
export type FontSizeId = "xs" | "sm" | "md" | "lg";

type Tokens = Record<string, string>;

export interface Palette {
    id: PaletteId;
    label: string;
    dark: Tokens;
    light: Tokens;
}

export const DEFAULT_PALETTE: PaletteId = "graphite";
export const DEFAULT_RADIUS: RadiusId = "sm";
export const DEFAULT_FONT_SIZE: FontSizeId = "md";

/** The colors of graphite (from styles.css) that the menu swatches and the startup skeleton need. */
const GRAPHITE: Record<Theme, Tokens> = {
    dark: {bg: "#1d1e21", surface: "#25262a", bar: "#2c2d32", input: "#18191c", border: "#37393f", selected: "#2d4a6d", accent: "#4b8fdb", "j-key": "#9cdcfe", "j-str": "#ce9178"},
    light: {bg: "#f2f2f2", surface: "#ffffff", bar: "#e9e9e9", input: "#ffffff", border: "#d2d2d2", selected: "#c6dcf2", accent: "#2a73c2", "j-key": "#0451a5", "j-str": "#a31515"},
};

export const PALETTES: Palette[] = [
    {id: "graphite", label: "Graphite", dark: {}, light: {}},
    {
        id: "ocean",
        label: "Ocean",
        dark: {
            bg: "#161b24", surface: "#1c2330", bar: "#222a39", hover: "#283244", selected: "#1f4f7a", "selected-text": "#ffffff", input: "#121722",
            border: "#2c3647", "border-strong": "#3a4659", text: "#dde3ec", strong: "#f0f4f9", muted: "#a7b1c2", faint: "#7f8a9d",
            accent: "#3a9fd0", "accent-hover": "#55b0dc", err: "#ef7272", "err-body": "#f78c7c",
            "j-key": "#7fc8f8", "j-str": "#f0b27a", "j-num": "#9ad6a5", "j-bool": "#6fa8ff", "j-null": "#c79bf2", "j-punct": "#8d99ab",
            "t-class": "#5fd4c4", "t-prim": "#6fa8ff", choice: "#b8a2ff",
        },
        light: {
            bg: "#eef2f7", surface: "#ffffff", bar: "#e3e9f1", hover: "#e1ecf8", selected: "#c3daf3", "selected-text": "#0d1b2a", input: "#ffffff",
            border: "#cdd6e1", "border-strong": "#b2bfce", text: "#1f2a37", strong: "#0d1724", muted: "#4b5868", faint: "#6b7787",
            accent: "#1a6fb5", "accent-hover": "#145d99", err: "#c13c3c", "err-body": "#c24d45",
            "j-key": "#0b5cad", "j-str": "#9a4a12", "j-num": "#0f7a5a", "j-bool": "#1d4fd8", "j-null": "#8a2bb8", "j-punct": "#5a6575",
            "t-class": "#0f7c8c", "t-prim": "#1d4fd8", choice: "#6b3fc4",
        },
    },
    {
        id: "forest",
        label: "Forest",
        dark: {
            bg: "#1a1e1b", surface: "#212622", bar: "#283029", hover: "#2e372f", selected: "#2f5a3f", "selected-text": "#ffffff", input: "#151916",
            border: "#333c35", "border-strong": "#435046", text: "#dfe5df", strong: "#f0f4f0", muted: "#aab5ab", faint: "#849086",
            accent: "#3f9f6c", "accent-hover": "#52b47f", err: "#e57361", "err-body": "#ec9070",
            "j-key": "#8fd0b0", "j-str": "#e6c07b", "j-num": "#b9d98c", "j-bool": "#7ab8d6", "j-null": "#d39bc4", "j-punct": "#97a397",
            "t-class": "#6cc9a3", "t-prim": "#7ab8d6", choice: "#c9a8e8",
        },
        light: {
            bg: "#f1f3ee", surface: "#ffffff", bar: "#e5e9e1", hover: "#e3eee4", selected: "#c8e3cf", "selected-text": "#102015", input: "#ffffff",
            border: "#d0d7cd", "border-strong": "#b5c0b1", text: "#24302a", strong: "#101a14", muted: "#4f5d54", faint: "#6f7c73",
            accent: "#2a8a55", "accent-hover": "#217346", err: "#bb4130", "err-body": "#b5532f",
            "j-key": "#1f6b4a", "j-str": "#8a5a00", "j-num": "#4b7d12", "j-bool": "#1f5f99", "j-null": "#8c3a8c", "j-punct": "#56625a",
            "t-class": "#23705a", "t-prim": "#1f5f99", choice: "#74429e",
        },
    },
    {
        id: "plum",
        label: "Plum",
        dark: {
            bg: "#1e1a24", surface: "#26212e", bar: "#2d2737", hover: "#342d40", selected: "#4f3a72", "selected-text": "#ffffff", input: "#18151d",
            border: "#3a3346", "border-strong": "#4a4258", text: "#e5e0ec", strong: "#f4f0f9", muted: "#b3aac0", faint: "#8d8499",
            accent: "#8e6bd8", "accent-hover": "#a183e2", err: "#ec6f86", "err-body": "#f2879b",
            "j-key": "#c9b3ff", "j-str": "#f5a9c4", "j-num": "#a8e0c4", "j-bool": "#8fb4ff", "j-null": "#f0b37a", "j-punct": "#a39bb0",
            "t-class": "#e3a6ff", "t-prim": "#8fb4ff", choice: "#d9b8ff",
        },
        light: {
            bg: "#f4f1f7", surface: "#ffffff", bar: "#ebe5f1", hover: "#ece4f6", selected: "#dccbf2", "selected-text": "#1b1028", input: "#ffffff",
            border: "#d8d0e1", "border-strong": "#bfb3cc", text: "#2c2536", strong: "#170f22", muted: "#594e66", faint: "#786d85",
            accent: "#7444c4", "accent-hover": "#6236ad", err: "#bf3655", "err-body": "#c03f63",
            "j-key": "#5b2fb0", "j-str": "#a3245e", "j-num": "#1d7a5c", "j-bool": "#2850c8", "j-null": "#b35a00", "j-punct": "#5e5468",
            "t-class": "#8a2fa8", "t-prim": "#2850c8", choice: "#7a3fc9",
        },
    },
];

/** Corner radius of controls, panels and boxes ("sm" is the original look). */
export const RADII: { id: RadiusId; label: string; px: number }[] = [
    {id: "none", label: "None", px: 0},
    {id: "sm", label: "S", px: 2},
    {id: "md", label: "M", px: 4},
    {id: "lg", label: "L", px: 7},
];

/**
 * Text size: `scale` multiplies the text of the interface ("md" is the original look); `code` is the size the code
 * editors and viewers get when it is chosen (Ctrl + mouse wheel changes that afterwards).
 */
export const FONT_SIZES: { id: FontSizeId; label: string; scale: number; code: number }[] = [
    {id: "xs", label: "XS", scale: 0.86, code: 12},
    {id: "sm", label: "S", scale: 0.93, code: 13},
    {id: "md", label: "M", scale: 1, code: 14},
    {id: "lg", label: "L", scale: 1.1, code: 16},
];

export function isPaletteId(value: unknown): value is PaletteId {
    return PALETTES.some((p) => p.id === value);
}

function paletteOf(id: unknown): Palette {
    return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

const radiusOf = (id: unknown) => RADII.find((r) => r.id === id) ?? RADII.find((r) => r.id === DEFAULT_RADIUS)!;
export const fontSizeOf = (id: unknown) => FONT_SIZES.find((f) => f.id === id) ?? FONT_SIZES.find((f) => f.id === DEFAULT_FONT_SIZE)!;

/** The CSS variables to set on .cf-root for a palette (none for graphite: styles.css has its colors). */
export function paletteStyle(id: unknown, theme: Theme): Record<string, string> {
    const tokens = paletteOf(id)[theme];
    return Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--${name}`, value]));
}

/** All CSS variables of an appearance: palette colors, corner radius (--r) and text scale (--fs). */
export function appearanceStyle(appearance: { palette?: unknown; radius?: unknown; fontSize?: unknown }, theme: Theme): Record<string, string> {
    return {
        ...paletteStyle(appearance.palette, theme),
        "--r": `${radiusOf(appearance.radius).px}px`,
        "--fs": String(fontSizeOf(appearance.fontSize).scale),
    };
}

/** A token of a palette, falling back to graphite's. */
export function paletteToken(id: unknown, theme: Theme, name: string): string {
    return paletteOf(id)[theme][name] ?? GRAPHITE[theme][name];
}

/** The accent of a palette, for its swatch in the menu. */
export function paletteSwatch(id: PaletteId, theme: Theme): string {
    return paletteToken(id, theme, "accent");
}

/**
 * The colors the startup skeleton paints before the view loads (see swagger-preload.css); undefined for graphite,
 * whose colors the skeleton has already.
 */
export function bootColors(id: unknown, theme: Theme): Record<string, string> | undefined {
    if (paletteOf(id).id === DEFAULT_PALETTE) return undefined;
    const names = ["bg", "surface", "bar", "input", "border", "selected"] as const;
    return Object.fromEntries(names.map((name) => [name === "selected" ? "accent" : name, paletteToken(id, theme, name)]));
}
