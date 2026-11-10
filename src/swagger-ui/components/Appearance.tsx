import {useEffect, useRef, useState} from "react";
import {ChevronDown} from "lucide-react";
import {DEFAULT_FONT_SIZE, DEFAULT_PALETTE, DEFAULT_RADIUS, FONT_SIZES, fontSizeOf, isPaletteId, paletteSwatch, PALETTES, paletteToken, RADII} from "../palettes";
import {DEFAULT_PREFS, prefsStore, setFontSize, updatePrefs} from "../state";
import {useStore} from "../store";
import {listenEverywhere} from "../view-root";

interface Choice<T extends string> {
    id: T;
    label: string;
    title?: string;
}

function Segmented<T extends string>({label, value, choices, onChange}: { label: string; value: T; choices: Choice<T>[]; onChange: (id: T) => void }) {
    return (
        <span className="cf-seg" role="radiogroup" aria-label={label}>
            {choices.map((c) => (
                <button key={c.id} role="radio" aria-checked={c.id === value} className={c.id === value ? "is-on" : ""} title={c.title} onClick={() => onChange(c.id)}>
                    {c.label}
                </button>
            ))}
        </span>
    );
}

/**
 * Header button and panel for the look of the view: dark / light, color palette, corner radius and text size. Saved
 * with the other preferences, so they follow the user to other computers through the Drive sync.
 */
export function AppearanceMenu() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const prefs = useStore(prefsStore, (s) => s);
    const palette = isPaletteId(prefs.palette) ? prefs.palette : DEFAULT_PALETTE;
    const preset = fontSizeOf(prefs.fontSize);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !e.composedPath().includes(ref.current)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const offDown = listenEverywhere("mousedown", onDown);
        const offKey = listenEverywhere("keydown", onKey);
        return () => {
            offDown();
            offKey();
        };
    }, [open]);

    const isDefault = prefs.theme === DEFAULT_PREFS.theme && palette === DEFAULT_PALETTE && prefs.radius === DEFAULT_RADIUS
        && prefs.fontSize === DEFAULT_FONT_SIZE && prefs.codeFont === fontSizeOf(DEFAULT_FONT_SIZE).code;

    return (
        <div className="cf-auth cf-appearance" ref={ref}>
            <button className="cf-btn cf-scheme-btn" title="Appearance: theme, colors, corners and text size" aria-expanded={open} onClick={() => setOpen(!open)}>
                <span className="cf-swatch" style={{background: paletteSwatch(palette, prefs.theme)}}/>
                Appearance
                <ChevronDown size={12} className="cf-scheme-chevron"/>
            </button>
            {open && (
                <div className="cf-popover is-appearance" role="dialog" aria-label="Appearance">
                    <div className="cf-popover-title">Appearance</div>
                    <div className="cf-appearance-row">
                        <span className="cf-appearance-label">Theme</span>
                        <Segmented label="Theme" value={prefs.theme} onChange={(theme) => updatePrefs({theme})}
                                   choices={[{id: "dark", label: "Dark"}, {id: "light", label: "Light"}]}/>
                    </div>
                    <div className="cf-appearance-row is-top">
                        <span className="cf-appearance-label">Colors</span>
                        <span className="cf-palettes" role="radiogroup" aria-label="Color palette">
                            {PALETTES.map((p) => (
                                <button key={p.id} role="radio" aria-checked={p.id === palette} className={`cf-palette-chip ${p.id === palette ? "is-on" : ""}`}
                                        onClick={() => updatePrefs({palette: p.id})}>
                                    <span className="cf-palette-preview" aria-hidden>
                                        {(["bg", "accent", "j-key", "j-str"] as const).map((name) => (
                                            <span key={name} style={{background: paletteToken(p.id, prefs.theme, name)}}/>
                                        ))}
                                    </span>
                                    {p.label}
                                </button>
                            ))}
                        </span>
                    </div>
                    <div className="cf-appearance-row">
                        <span className="cf-appearance-label">Corners</span>
                        <Segmented label="Corner radius" value={prefs.radius} onChange={(radius) => updatePrefs({radius})}
                                   choices={RADII.map((r) => ({id: r.id, label: r.label, title: `${r.px}px`}))}/>
                    </div>
                    <div className="cf-appearance-row">
                        <span className="cf-appearance-label">Text size</span>
                        <Segmented label="Text size" value={preset.id} onChange={setFontSize}
                                   choices={FONT_SIZES.map((f) => ({id: f.id, label: f.label, title: `Interface ${Math.round(f.scale * 100)}%, code ${f.code}px`}))}/>
                    </div>
                    <p className="cf-appearance-note">
                        Code text: {prefs.codeFont}px{prefs.codeFont !== preset.code ? ` (zoomed from ${preset.code}px)` : ""}. Ctrl + mouse wheel over code changes it,
                        Ctrl+0 returns to the text size.
                    </p>
                    <div className="cf-appearance-foot">
                        <span className="cf-appearance-sync">Saved with your settings and synced to Google Drive when sync is on</span>
                        <button className="cf-text-btn" disabled={isDefault} onClick={() => {
                            updatePrefs({theme: DEFAULT_PREFS.theme, palette: DEFAULT_PALETTE, radius: DEFAULT_RADIUS});
                            setFontSize(DEFAULT_FONT_SIZE);
                        }}>
                            Reset to defaults
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
