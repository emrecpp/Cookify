import {KeyboardEvent, useEffect} from "react";
import {useSpec} from "../context";
import {primaryType, Schema, unwrapNullable} from "../openapi";
import {stringifyValue} from "../request";

interface Props {
    value: string;
    onChange: (value: string) => void;
    schema: Schema | undefined;
    placeholder: string;
    invalid?: boolean;
    onEnter?: () => void;
}

/** Keeps only what a number field can hold (pasted "12a3" becomes "123"). */
export function sanitizeNumber(value: string, integer: boolean): string {
    const raw = value.replace(",", ".").replace(/\s/g, "");
    const negative = raw.startsWith("-");
    let digits = raw.replace(integer ? /[^\d]/g : /[^\d.]/g, "");
    if (!integer) {
        const dot = digits.indexOf(".");
        if (dot >= 0) digits = digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, "");
    }
    return (negative ? "-" : "") + digits;
}

function rangeHint(schema: Schema): string {
    const min = schema.minimum ?? schema.exclusiveMinimum;
    const max = schema.maximum ?? schema.exclusiveMaximum;
    if (typeof min === "number" && typeof max === "number") return `${min} – ${max}`;
    if (typeof min === "number") return `≥ ${min}`;
    if (typeof max === "number") return `≤ ${max}`;
    return "";
}

export function numberError(schema: Schema | undefined, value: string): string | null {
    if (!schema || !value.trim()) return null;
    const type = primaryType(schema);
    if (type !== "integer" && type !== "number") return null;
    const n = Number(value);
    if (Number.isNaN(n) || value === "-" || value.endsWith(".")) return "Not a number";
    if (typeof schema.minimum === "number" && n < schema.minimum) return `Must be ≥ ${schema.minimum}`;
    if (typeof schema.maximum === "number" && n > schema.maximum) return `Must be ≤ ${schema.maximum}`;
    if (typeof schema.exclusiveMinimum === "number" && n <= schema.exclusiveMinimum) return `Must be > ${schema.exclusiveMinimum}`;
    if (typeof schema.exclusiveMaximum === "number" && n >= schema.exclusiveMaximum) return `Must be < ${schema.exclusiveMaximum}`;
    return null;
}

function Select({value, options, placeholder, invalid, onChange}: {
    value: string; options: string[]; placeholder: string; invalid?: boolean; onChange: (v: string) => void;
}) {
    return (
        <div className={`cf-select ${invalid ? "is-invalid" : ""} ${value ? "" : "is-empty"}`}>
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">{placeholder || "Not set"}</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function BoolToggle({value, defaultValue, onChange, invalid}: {
    value: string; defaultValue?: unknown; onChange: (v: string) => void; invalid?: boolean;
}) {
    const pick = (v: string) => onChange(value === v ? "" : v);
    return (
        <div className={`cf-toggle ${invalid ? "is-invalid" : ""}`}>
            {["true", "false"].map((option) => (
                <button key={option} type="button" className={`is-${option} ${value === option ? "is-on" : ""}`} onClick={() => pick(option)}>
                    {option}
                    {String(defaultValue) === option && <span className="cf-toggle-default">default</span>}
                </button>
            ))}
            {!value && <span className="cf-toggle-hint">not sent</span>}
        </div>
    );
}

function MultiEnum({value, options, onChange}: { value: string; options: string[]; onChange: (v: string) => void }) {
    const selected = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
    const toggle = (option: string) => {
        const next = selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option];
        onChange(next.join(","));
    };
    return (
        <div className="cf-chips">
            {options.map((option) => (
                <button key={option} type="button" className={`cf-chip-toggle ${selected.includes(option) ? "is-on" : ""}`} onClick={() => toggle(option)}>
                    {option}
                </button>
            ))}
        </div>
    );
}

function NumberInput({value, onChange, schema, placeholder, invalid, onEnter}: Props & { schema: Schema }) {
    const integer = primaryType(schema) === "integer";
    const error = numberError(schema, value);
    // Values saved before typed inputs existed (or pasted elsewhere) may contain text: clean them once.
    useEffect(() => {
        const clean = sanitizeNumber(value, integer);
        if (clean !== value) onChange(clean);
    }, [value, integer, onChange]);
    const step = (delta: number) => {
        const current = Number(value || 0);
        let next = (Number.isNaN(current) ? 0 : current) + delta;
        if (typeof schema.minimum === "number") next = Math.max(schema.minimum, next);
        if (typeof schema.maximum === "number") next = Math.min(schema.maximum, next);
        onChange(String(integer ? Math.round(next) : Number(next.toFixed(6))));
    };
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            step((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1));
        } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
            onEnter?.();
        }
    };
    const hint = rangeHint(schema);
    return (
        <div className={`cf-number ${invalid || error ? "is-invalid" : ""}`}>
            <input
                value={value}
                inputMode={integer ? "numeric" : "decimal"}
                spellCheck={false}
                placeholder={placeholder || (integer ? "integer" : "number")}
                onChange={(e) => onChange(sanitizeNumber(e.target.value, integer))}
                onKeyDown={onKeyDown}
            />
            {hint && <span className="cf-number-hint">{hint}</span>}
            <button type="button" tabIndex={-1} title="Decrease (↓)" onClick={() => step(-1)}>−</button>
            <button type="button" tabIndex={-1} title="Increase (↑)" onClick={() => step(1)}>+</button>
        </div>
    );
}

export function ValueInput(props: Props) {
    const {spec} = useSpec();
    const {value, onChange, schema, placeholder, invalid, onEnter} = props;
    const type = primaryType(schema);
    const enumValues = Array.isArray(schema?.enum) ? (schema!.enum as unknown[]).map(stringifyValue) : null;

    if (enumValues) return <Select value={value} options={enumValues} placeholder={placeholder} invalid={invalid} onChange={onChange}/>;
    if (type === "boolean") return <BoolToggle value={value} defaultValue={schema?.default} onChange={onChange} invalid={invalid}/>;
    if (type === "integer" || type === "number") return <NumberInput {...props} schema={schema!}/>;
    if (type === "array") {
        const items = unwrapNullable(spec.raw, schema?.items);
        if (Array.isArray(items?.enum)) return <MultiEnum value={value} options={items!.enum.map(stringifyValue)} onChange={onChange}/>;
    }

    const format = schema?.format;
    const inputType = format === "date" ? "date" : format === "date-time" ? "datetime-local" : format === "email" ? "email" : "text";
    const typed = inputType !== "text";
    return (
        <input
            className={`cf-input ${invalid ? "is-invalid" : ""} ${typed ? "is-typed" : ""}`}
            type={inputType}
            step={inputType === "datetime-local" ? 1 : undefined}
            value={inputType === "datetime-local" ? value.replace(/(\.\d+)?(Z|[+-]\d\d:\d\d)$/, "") : value}
            spellCheck={false}
            placeholder={placeholder || (type === "array" ? "a, b, c" : format || type || "")}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) onEnter?.();
            }}
        />
    );
}
