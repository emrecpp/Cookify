// Appearance of the view: color palette (each with a dark and a light variant), corner radius and text size.
// "graphite" is the look defined in styles.css; the other palettes override its tokens (set as CSS variables on
// .cf-root), the JSON colors of editors and viewers included. Every palette keeps the body of a 4xx / 5xx response
// (--err-body) and errors (--err) reddish, tuned to sit well on its own background.
import type {Theme} from "./state";

export type PaletteId = "graphite" | "ocean" | "forest" | "plum" | "clay" | "dracula" | "nord" | "solarized" | "catppuccin";
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
    // Warm cream and terracotta, in the spirit of Claude's look (a palette of its own, not Anthropic's).
    {
        id: "clay",
        label: "Clay",
        dark: {
            bg: "#1f1e1c", surface: "#262624", bar: "#2c2b28", hover: "#33322e", selected: "#4a3a32", "selected-text": "#faf9f5", input: "#1a1917",
            border: "#35342f", "border-strong": "#45433d", text: "#e8e6dc", strong: "#faf9f5", muted: "#b4b0a3", faint: "#8c887c",
            accent: "#c96442", "accent-hover": "#d67756", err: "#e05d52", "err-body": "#e8776a",
            "j-key": "#e0b58a", "j-str": "#b5c48f", "j-num": "#8fb8d6", "j-bool": "#d98a6a", "j-null": "#c49ac4", "j-punct": "#9a968a",
            "t-class": "#d6a35c", "t-prim": "#d98a6a", choice: "#c9a0dc",
        },
        light: {
            bg: "#f0eee6", surface: "#faf9f5", bar: "#efece3", hover: "#ebe7dc", selected: "#f1dccf", "selected-text": "#2b2a26", input: "#ffffff",
            border: "#e0dcd0", "border-strong": "#cbc6b6", text: "#3d3929", strong: "#1f1e1b", muted: "#5f5b4d", faint: "#83806f",
            accent: "#c15f3c", "accent-hover": "#a94f30", err: "#b8382f", "err-body": "#b4473a",
            "j-key": "#8a4b2a", "j-str": "#5d7a2f", "j-num": "#2f6f8f", "j-bool": "#a04535", "j-null": "#7d4f8a", "j-punct": "#83806f",
            "t-class": "#8a6a1f", "t-prim": "#a04535", choice: "#7d4f8a",
        },
    },
    // Popular editor color schemes (their published palettes; the light side of Dracula is its "Alucard").
    {
        id: "dracula",
        label: "Dracula",
        dark: {
            bg: "#21222c", surface: "#282a36", bar: "#2f3241", hover: "#363949", selected: "#44475a", "selected-text": "#f8f8f2", input: "#1e1f29",
            border: "#343746", "border-strong": "#44475a", text: "#f8f8f2", strong: "#ffffff", muted: "#b6b9c9", faint: "#7a86b6",
            accent: "#8b6fd6", "accent-hover": "#9d84de", err: "#ff5555", "err-body": "#ff6e6e",
            "j-key": "#8be9fd", "j-str": "#f1fa8c", "j-num": "#bd93f9", "j-bool": "#ff79c6", "j-null": "#ffb86c", "j-punct": "#9ea8c7",
            "t-class": "#50fa7b", "t-prim": "#ff79c6", choice: "#ffb86c",
        },
        light: {
            bg: "#f7f3e3", surface: "#fffbeb", bar: "#efe9d4", hover: "#ece5cd", selected: "#ddd5f2", "selected-text": "#1f1f1f", input: "#fffdf5",
            border: "#ddd6bf", "border-strong": "#c8c0a6", text: "#1f1f1f", strong: "#000000", muted: "#4f4a6e", faint: "#635d97",
            accent: "#644ac9", "accent-hover": "#5238b5", err: "#cb3a2a", "err-body": "#c2402e",
            "j-key": "#036a96", "j-str": "#846e15", "j-num": "#644ac9", "j-bool": "#a3144d", "j-null": "#a34d14", "j-punct": "#635d97",
            "t-class": "#14710a", "t-prim": "#a3144d", choice: "#a34d14",
        },
    },
    {
        id: "nord",
        label: "Nord",
        dark: {
            bg: "#2e3440", surface: "#353c4a", bar: "#3b4252", hover: "#434c5e", selected: "#435a7a", "selected-text": "#eceff4", input: "#272c36",
            border: "#3b4252", "border-strong": "#4c566a", text: "#d8dee9", strong: "#eceff4", muted: "#aeb7c6", faint: "#7b879c",
            accent: "#5e81ac", "accent-hover": "#6d90bb", err: "#bf616a", "err-body": "#d0777f",
            "j-key": "#88c0d0", "j-str": "#a3be8c", "j-num": "#b48ead", "j-bool": "#81a1c1", "j-null": "#d08770", "j-punct": "#8f9bb0",
            "t-class": "#8fbcbb", "t-prim": "#81a1c1", choice: "#b48ead",
        },
        light: {
            bg: "#e5e9f0", surface: "#eceff4", bar: "#dfe4ec", hover: "#d8dee9", selected: "#c5d4e6", "selected-text": "#2e3440", input: "#f4f6f9",
            border: "#d1d8e2", "border-strong": "#b9c2d0", text: "#2e3440", strong: "#1f242d", muted: "#4c566a", faint: "#6b768a",
            accent: "#5e81ac", "accent-hover": "#4c6f9a", err: "#bf616a", "err-body": "#b2525b",
            "j-key": "#3a7290", "j-str": "#5f7f3d", "j-num": "#8a5f86", "j-bool": "#4f6f99", "j-null": "#b0613e", "j-punct": "#6b768a",
            "t-class": "#3f7a78", "t-prim": "#4f6f99", choice: "#8a5f86",
        },
    },
    {
        id: "solarized",
        label: "Solarized",
        dark: {
            bg: "#002b36", surface: "#073642", bar: "#0a3d4a", hover: "#0e4553", selected: "#155366", "selected-text": "#fdf6e3", input: "#00232c",
            border: "#0d4250", "border-strong": "#2b5866", text: "#93a1a1", strong: "#eee8d5", muted: "#839496", faint: "#657b83",
            accent: "#268bd2", "accent-hover": "#3b9ad9", err: "#dc322f", "err-body": "#ef6b4b",
            "j-key": "#268bd2", "j-str": "#2aa198", "j-num": "#d33682", "j-bool": "#859900", "j-null": "#cb4b16", "j-punct": "#657b83",
            "t-class": "#b58900", "t-prim": "#859900", choice: "#6c71c4",
        },
        light: {
            bg: "#eee8d5", surface: "#fdf6e3", bar: "#f5efdc", hover: "#ebe4cf", selected: "#cfe0e8", "selected-text": "#073642", input: "#fffbee",
            border: "#e0d9c4", "border-strong": "#cbc3aa", text: "#586e75", strong: "#073642", muted: "#657b83", faint: "#839496",
            accent: "#268bd2", "accent-hover": "#1f78b8", err: "#dc322f", "err-body": "#c94428",
            "j-key": "#268bd2", "j-str": "#2aa198", "j-num": "#d33682", "j-bool": "#859900", "j-null": "#cb4b16", "j-punct": "#839496",
            "t-class": "#b58900", "t-prim": "#859900", choice: "#6c71c4",
        },
    },
    {
        id: "catppuccin",
        label: "Catppuccin",
        dark: {
            bg: "#181825", surface: "#1e1e2e", bar: "#242437", hover: "#313244", selected: "#45475a", "selected-text": "#cdd6f4", input: "#11111b",
            border: "#313244", "border-strong": "#45475a", text: "#cdd6f4", strong: "#e6ebff", muted: "#a6adc8", faint: "#7f849c",
            accent: "#6c7fd8", "accent-hover": "#7d8fe0", err: "#f38ba8", "err-body": "#f38ba8",
            "j-key": "#89b4fa", "j-str": "#a6e3a1", "j-num": "#fab387", "j-bool": "#cba6f7", "j-null": "#f5c2e7", "j-punct": "#9399b2",
            "t-class": "#94e2d5", "t-prim": "#cba6f7", choice: "#f9e2af",
        },
        light: {
            bg: "#e6e9ef", surface: "#eff1f5", bar: "#e2e5ec", hover: "#dce0e8", selected: "#d0d8f7", "selected-text": "#2f3146", input: "#f6f7fa",
            border: "#ccd0da", "border-strong": "#bcc0cc", text: "#4c4f69", strong: "#2f3146", muted: "#5c5f77", faint: "#7c7f93",
            accent: "#1e66f5", "accent-hover": "#1557d8", err: "#d20f39", "err-body": "#e64553",
            "j-key": "#1e66f5", "j-str": "#40a02b", "j-num": "#fe640b", "j-bool": "#8839ef", "j-null": "#ea76cb", "j-punct": "#7c7f93",
            "t-class": "#179299", "t-prim": "#8839ef", choice: "#df8e1d",
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
