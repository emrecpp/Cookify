import {Fragment, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {collectObject, primaryType, Schema, typeLabel, unwrapNullable} from "../openapi";
import {stringifyValue} from "../request";

const PRIMITIVES = new Set(["string", "integer", "number", "boolean", "null", "object", "array", "any", "enum", "file"]);

/** Renders a type label with class names, primitives and formats in different colors. */
export function TypeText({label}: { label: string }) {
    const parts = label.split(/([A-Za-z_][\w.-]*)/);
    let inFormat = false;
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (!/^[A-Za-z_]/.test(part)) {
                    if (part.includes("<")) inFormat = true;
                    const node = <span key={i} className="t-punct">{part}</span>;
                    if (part.includes(">")) inFormat = false;
                    return node;
                }
                if (inFormat) return <span key={i} className="t-fmt">{part}</span>;
                if (PRIMITIVES.has(part)) return <span key={i} className="t-prim">{part}</span>;
                return <span key={i} className="t-class">{part}</span>;
            })}
        </>
    );
}

function constraintList(schema: Schema): [string, string][] {
    const out: [string, string][] = [];
    const add = (label: string, value: unknown) => {
        if (value === undefined || value === null) return;
        const text = typeof value === "object" ? JSON.stringify(value) : String(value);
        if (text !== "") out.push([label, text]);
    };
    add("format", schema.format);
    add("default", schema.default);
    add("example", schema.example);
    add("minimum", schema.minimum ?? schema.exclusiveMinimum);
    add("maximum", schema.maximum ?? schema.exclusiveMaximum);
    add("min length", schema.minLength);
    add("max length", schema.maxLength);
    add("min items", schema.minItems);
    add("max items", schema.maxItems);
    add("pattern", schema.pattern);
    return out;
}

function HintCard({spec, schema, description}: { spec: Schema; schema: unknown; description?: string }) {
    const resolved = unwrapNullable(spec, schema) ?? {};
    const isArray = primaryType(resolved) === "array";
    const inner = (isArray ? unwrapNullable(spec, resolved.items) : resolved) ?? {};
    const enumValues: unknown[] | undefined = Array.isArray(inner.enum) ? inner.enum : undefined;
    const {properties, required} = collectObject(spec, inner);
    const propEntries = Object.entries(properties);
    const constraints = constraintList(resolved);
    if (isArray) constraints.push(...constraintList(inner).filter(([k]) => k !== "default"));
    const text = description || resolved.description || inner.description;
    const title = inner.title && inner.title !== typeLabel(spec, schema) ? inner.title : undefined;

    return (
        <>
            <div className="cf-hint-type"><TypeText label={typeLabel(spec, schema)}/></div>
            {title && <div className="cf-hint-sub">{title}</div>}
            {text && <div className="cf-hint-desc">{text}</div>}
            {enumValues && (
                <div className="cf-hint-block">
                    <div className="cf-hint-label">{isArray ? "Allowed values (multiple)" : "Allowed values"}</div>
                    <div className="cf-hint-enum">{enumValues.map((v, i) => <span key={i}>{stringifyValue(v)}</span>)}</div>
                </div>
            )}
            {constraints.length > 0 && (
                <div className="cf-hint-block cf-hint-kv">
                    {constraints.map(([k, v]) => <Fragment key={k}><span>{k}</span><span>{v}</span></Fragment>)}
                </div>
            )}
            {propEntries.length > 0 && (
                <div className="cf-hint-block">
                    <div className="cf-hint-label">Fields</div>
                    <div className="cf-hint-kv">
                        {propEntries.slice(0, 14).map(([name, prop]) => (
                            <Fragment key={name}>
                                <span className="cf-hint-field">{name}{required.includes(name) && <span className="cf-req">*</span>}</span>
                                <span><TypeText label={typeLabel(spec, prop)}/></span>
                            </Fragment>
                        ))}
                    </div>
                    {propEntries.length > 14 && <div className="cf-hint-more">+{propEntries.length - 14} more</div>}
                </div>
            )}
        </>
    );
}

/** Colored, truncated type label that shows a details card on hover. */
export function TypeHint({spec, schema, description, className = ""}: {
    spec: Schema;
    schema: unknown;
    description?: string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useLayoutEffect(() => {
        if (!anchor || !cardRef.current) return;
        const card = cardRef.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(anchor.right - card.width, window.innerWidth - card.width - 8));
        const below = anchor.bottom + 4;
        const top = below + card.height > window.innerHeight - 8 ? Math.max(8, anchor.top - card.height - 4) : below;
        setPos({left, top});
    }, [anchor]);

    const show = () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => ref.current && setAnchor(ref.current.getBoundingClientRect()), 250);
    };
    const hide = () => {
        clearTimeout(timer.current);
        setAnchor(null);
        setPos(null);
    };

    const root = ref.current?.closest(".cf-root");
    return (
        <span ref={ref} className={`cf-type ${className}`} onMouseEnter={show} onMouseLeave={hide}>
            <TypeText label={typeLabel(spec, schema)}/>
            {anchor && root && createPortal(
                <div ref={cardRef} className="cf-hint" style={pos ? {left: pos.left, top: pos.top} : {left: -9999, top: 0}}>
                    <HintCard spec={spec} schema={schema} description={description}/>
                </div>,
                root,
            )}
        </span>
    );
}
