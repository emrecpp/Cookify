import {ChevronRight} from "lucide-react";
import {useState} from "react";
import {TypeText} from "./TypeInfo";
import {collectObject, primaryType, Schema, typeLabel, unwrapNullable} from "../openapi";

interface Props {
    spec: Schema;
    schema: unknown;
    depth?: number;
    seen?: string[];
}

function nestedSchema(spec: Schema, schema: unknown): Schema | undefined {
    const resolved = unwrapNullable(spec, schema);
    if (!resolved) return undefined;
    if (primaryType(resolved) === "array") return nestedSchema(spec, resolved.items);
    const {properties} = collectObject(spec, resolved);
    return Object.keys(properties).length ? resolved : undefined;
}

function refOf(schema: unknown): string | undefined {
    const s = schema as Schema | undefined;
    if (!s) return undefined;
    if (typeof s.$ref === "string") return s.$ref;
    if (s.items) return refOf(s.items);
    const variants = (s.anyOf ?? s.oneOf) as Schema[] | undefined;
    return variants?.map(refOf).find(Boolean);
}

function SchemaRow({spec, name, prop, required, depth, seen}: {
    spec: Schema; name: string; prop: Schema; required: boolean; depth: number; seen: string[];
}) {
    const [open, setOpen] = useState(depth < 1);
    const resolved = unwrapNullable(spec, prop) ?? {};
    const nested = nestedSchema(spec, prop);
    const ref = refOf(prop);
    const recursive = !!ref && seen.includes(ref);
    const expandable = !!nested && !recursive && depth < 8;
    const enumValues = Array.isArray(resolved.enum) ? resolved.enum : undefined;
    return (
        <>
            <div className="cf-schema-row" style={{paddingLeft: 8 + depth * 16}}>
                <button
                    className={`cf-schema-name ${expandable ? "is-expandable" : ""}`}
                    onClick={() => expandable && setOpen(!open)}
                    tabIndex={expandable ? 0 : -1}
                >
                    {expandable && <ChevronRight size={12} className={`cf-chevron ${open ? "is-open" : ""}`}/>}
                    <span>{name}</span>
                    {required && <span className="cf-required" title="required">*</span>}
                </button>
                <span className="cf-schema-type"><TypeText label={typeLabel(spec, prop)}/>{recursive ? " ↻" : ""}</span>
                <span className="cf-schema-desc">
                    {resolved.description || resolved.title || ""}
                    {enumValues && <span className="cf-enum">{enumValues.map(String).join(" · ")}</span>}
                    {resolved.default !== undefined && <span className="cf-default">default: {JSON.stringify(resolved.default)}</span>}
                </span>
            </div>
            {expandable && open && <SchemaFields spec={spec} schema={nested} depth={depth + 1} seen={ref ? [...seen, ref] : seen}/>}
        </>
    );
}

function SchemaFields({spec, schema, depth = 0, seen = []}: Props) {
    const {properties, required} = collectObject(spec, schema);
    return (
        <>
            {Object.entries(properties).map(([name, prop]) => (
                <SchemaRow key={name} spec={spec} name={name} prop={prop} required={required.includes(name)} depth={depth} seen={seen}/>
            ))}
        </>
    );
}

export function SchemaView({spec, schema}: Props) {
    const nested = nestedSchema(spec, schema);
    if (!nested) {
        return <div className="cf-schema"><div className="cf-schema-row"><span className="cf-schema-type"><TypeText label={typeLabel(spec, schema)}/></span></div></div>;
    }
    const ref = refOf(schema);
    return (
        <div className="cf-schema">
            <div className="cf-schema-head">
                <span><TypeText label={typeLabel(spec, schema)}/></span>
            </div>
            <SchemaFields spec={spec} schema={nested} seen={ref ? [ref] : []}/>
        </div>
    );
}
