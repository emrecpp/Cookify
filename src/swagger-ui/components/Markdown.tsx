// A small, safe Markdown renderer for OpenAPI descriptions: paragraphs, headings, lists, fenced code,
// `code`, **bold**, *italic* and links. Output is React elements (never raw HTML), and single line
// breaks are kept, since API authors usually write descriptions line by line.
import {Fragment, ReactNode, useMemo} from "react";

type Block =
    | { kind: "p"; lines: string[] }
    | { kind: "h"; level: number; text: string }
    | { kind: "ul" | "ol"; items: string[][] } // each item holds its own (dedented) source lines
    | { kind: "code"; text: string };

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HEADING = /^(#{1,4})\s+(.*?)\s*#*$/;
const FENCE = /^\s*(```|~~~)/;
const indentOf = (line: string) => line.length - line.trimStart().length;

export function parseBlocks(source: string): Block[] {
    const blocks: Block[] = [];
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    let para: string[] | null = null;
    const closePara = () => {
        if (para) blocks.push({kind: "p", lines: para});
        para = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const fence = FENCE.exec(line);
        if (fence) {
            closePara();
            const body: string[] = [];
            while (++i < lines.length && !lines[i].trimStart().startsWith(fence[1])) body.push(lines[i]);
            blocks.push({kind: "code", text: body.join("\n")});
            continue;
        }
        if (!line.trim()) {
            closePara();
            continue;
        }
        const heading = HEADING.exec(line);
        if (heading) {
            closePara();
            blocks.push({kind: "h", level: heading[1].length, text: heading[2]});
            continue;
        }
        const item = LIST_ITEM.exec(line);
        if (item) {
            closePara();
            const indent = item[1].length;
            const kind = /\d/.test(item[2]) ? "ol" : "ul";
            const items: string[][] = [];
            // collect items at this indent; deeper lines (nested lists, continuations) belong to the current item
            while (i < lines.length) {
                const cur = lines[i];
                const m = LIST_ITEM.exec(cur);
                if (m && m[1].length <= indent + 1 && (/\d/.test(m[2]) ? "ol" : "ul") === kind) {
                    items.push([m[3]]);
                } else if (cur.trim() && indentOf(cur) > indent && items.length) {
                    items[items.length - 1].push(cur.slice(Math.min(indentOf(cur), indent + 2)));
                } else if (!cur.trim() && i + 1 < lines.length && lines[i + 1].trim()
                    && (indentOf(lines[i + 1]) > indent || LIST_ITEM.exec(lines[i + 1])?.[1].length === indent)) {
                    items[items.length - 1].push("");
                } else {
                    break;
                }
                i++;
            }
            i--;
            blocks.push({kind, items});
            continue;
        }
        if (!para) para = [];
        (para as string[]).push(line);
    }
    closePara();
    return blocks;
}

const INLINE = /(`+)([\s\S]+?)\1|\*\*([\s\S]+?)\*\*|\*(?=\S)([^*]+?)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

export function renderInline(text: string): ReactNode[] {
    const out: ReactNode[] = [];
    let last = 0;
    let key = 0;
    for (const m of text.matchAll(INLINE)) {
        const at = m.index ?? 0;
        if (at > last) out.push(text.slice(last, at));
        if (m[2] !== undefined) out.push(<code key={key++}>{m[2].trim() || m[2]}</code>);
        else if (m[3] !== undefined) out.push(<strong key={key++}>{renderInline(m[3])}</strong>);
        else if (m[4] !== undefined) out.push(<em key={key++}>{renderInline(m[4])}</em>);
        else if (m[5] !== undefined) out.push(<a key={key++} href={m[6]} target="_blank" rel="noopener noreferrer">{renderInline(m[5])}</a>);
        else out.push(<a key={key++} href={m[7]} target="_blank" rel="noopener noreferrer">{m[7]}</a>);
        last = at + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
}

function lines(parts: string[]): ReactNode {
    return parts.map((part, i) => <Fragment key={i}>{i > 0 && <br/>}{renderInline(part)}</Fragment>);
}

function renderBlocks(blocks: Block[]): ReactNode {
    return blocks.map((block, i) => {
        switch (block.kind) {
            case "p":
                return <p key={i}>{lines(block.lines)}</p>;
            case "h":
                return <p key={i} className={`cf-md-h is-h${block.level}`}>{renderInline(block.text)}</p>;
            case "code":
                return <pre key={i}><code>{block.text}</code></pre>;
            default: {
                const List = block.kind;
                return <List key={i}>{block.items.map((item, j) => <li key={j}>{renderItem(item)}</li>)}</List>;
            }
        }
    });
}

/** A list item: its leading paragraph stays inline (tight list), anything after it (nested lists...) renders as blocks. */
function renderItem(source: string[]): ReactNode {
    const blocks = parseBlocks(source.join("\n"));
    const [first, ...rest] = blocks;
    if (first?.kind !== "p") return renderBlocks(blocks);
    return <>{lines(first.lines)}{renderBlocks(rest)}</>;
}

export function Markdown({source}: { source: string }) {
    const blocks = useMemo(() => parseBlocks(source), [source]);
    return <>{renderBlocks(blocks)}</>;
}
