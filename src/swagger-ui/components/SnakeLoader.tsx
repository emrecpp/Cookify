import {useEffect, useRef, useState} from "react";

const CELL = 10;
const TICK = 85;          // ms per step
const MAX_LEN = 22;       // past this the snake sheds back to its starting size
const START_LEN = 4;

type Cell = { x: number; y: number };
type Grid = { cols: number; rows: number };
const DIRS: Cell[] = [{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}];
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** First step of the shortest path from head to food that avoids the body (the tail moves away, so it does not block). */
function pathStep(g: Grid, body: Cell[], food: Cell): Cell | null {
    const key = (c: Cell) => c.y * g.cols + c.x;
    const open = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < g.cols && c.y < g.rows;
    const blocked = new Set(body.slice(0, -1).map(key));
    const first = new Map<number, Cell>();
    const queue: Cell[] = [];
    for (const d of DIRS) {
        const n = {x: body[0].x + d.x, y: body[0].y + d.y};
        if (!open(n) || blocked.has(key(n)) || first.has(key(n))) continue;
        first.set(key(n), d);
        queue.push(n);
    }
    for (let i = 0; i < queue.length; i++) {
        const c = queue[i];
        const step = first.get(key(c))!;
        if (same(c, food)) return step;
        for (const d of DIRS) {
            const n = {x: c.x + d.x, y: c.y + d.y};
            if (!open(n) || blocked.has(key(n)) || first.has(key(n))) continue;
            first.set(key(n), step);
            queue.push(n);
        }
    }
    return null;
}

/** No path to the food: take the move that leaves the most open room. */
function roomiestStep(g: Grid, body: Cell[]): Cell | null {
    const key = (c: Cell) => c.y * g.cols + c.x;
    const open = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < g.cols && c.y < g.rows;
    const blocked = new Set(body.slice(0, -1).map(key));
    let best: Cell | null = null, bestRoom = 0;
    for (const d of DIRS) {
        const start = {x: body[0].x + d.x, y: body[0].y + d.y};
        if (!open(start) || blocked.has(key(start))) continue;
        const seen = new Set([key(start), ...blocked]);
        const stack = [start];
        let room = 0;
        while (stack.length) {
            const c = stack.pop()!;
            room++;
            for (const e of DIRS) {
                const n = {x: c.x + e.x, y: c.y + e.y};
                if (open(n) && !seen.has(key(n))) { seen.add(key(n)); stack.push(n); }
            }
        }
        if (room > bestRoom) { bestRoom = room; best = d; }
    }
    return best;
}

function placeFood(g: Grid, body: Cell[]): Cell {
    for (;;) {
        const c = {x: Math.floor(Math.random() * g.cols), y: Math.floor(Math.random() * g.rows)};
        if (!body.some((b) => same(b, c))) return c;
    }
}

function freshSnake(g: Grid): Cell[] {
    const y = Math.floor(g.rows / 2), x = Math.min(START_LEN, g.cols - 1);
    return Array.from({length: Math.min(START_LEN, g.cols)}, (_, i) => ({x: x - i, y}));
}

/** True once `on` has stayed true for `ms`; fast requests never swap the response out. */
export function useDelayed(on: boolean, ms: number): boolean {
    const [late, setLate] = useState(false);
    useEffect(() => {
        if (!on) { setLate(false); return; }
        const t = window.setTimeout(() => setLate(true), ms);
        return () => window.clearTimeout(t);
    }, [on, ms]);
    return on && late;
}

/**
 * Takes the place of the response body while a request is in flight: a small snake hunts down food on its own
 * inside the same box the body is shown in, with the time waited so far in the box's footer.
 * `waited` is how long the request had already been running when this appeared.
 */
export function SnakeBoard({waited = 0}: { waited?: number }) {
    const wrap = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const clock = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const box = wrap.current, el = canvas.current;
        const ctx = el?.getContext("2d");
        if (!box || !el || !ctx) return;

        const started = performance.now() - waited;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let g: Grid = {cols: 0, rows: 0};
        let w = 0, h = 0, ox = 0, oy = 0;
        let body: Cell[] = [], prev: Cell[] = [], food: Cell = {x: 0, y: 0};
        let bite = -1;
        let last = performance.now();
        let colors = {snake: "", head: "", food: "", grid: "", eye: ""};
        let frame = 0;

        const fit = () => {
            const ratio = window.devicePixelRatio || 1;
            w = box.clientWidth;
            h = box.clientHeight;
            el.width = Math.max(1, Math.round(w * ratio));
            el.height = Math.max(1, Math.round(h * ratio));
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            const next = {cols: Math.max(6, Math.floor((w - 8) / CELL)), rows: Math.max(3, Math.floor((h - 8) / CELL))};
            ox = Math.floor((w - next.cols * CELL) / 2);
            oy = Math.floor((h - next.rows * CELL) / 2);
            if (next.cols !== g.cols || next.rows !== g.rows) {
                g = next;
                body = prev = freshSnake(g);
                food = placeFood(g, body);
            }
        };
        fit();
        const watch = new ResizeObserver(fit);
        watch.observe(box);

        const readColors = () => {
            const css = getComputedStyle(el);
            const v = (name: string) => css.getPropertyValue(name).trim();
            colors = {snake: v("--accent"), head: v("--info") || v("--accent"), food: v("--ok"), grid: v("--border"), eye: v("--input") || v("--surface")};
        };

        const step = () => {
            const d = pathStep(g, body, food) ?? roomiestStep(g, body);
            prev = body;
            if (!d) { body = prev = freshSnake(g); food = placeFood(g, body); return; }
            const head = {x: body[0].x + d.x, y: body[0].y + d.y};
            const ate = same(head, food);
            body = [head, ...(ate ? body : body.slice(0, -1))];
            if (ate) {
                bite = performance.now();
                if (body.length >= MAX_LEN) body = body.slice(0, START_LEN);
                food = placeFood(g, body);
            }
        };

        const cx = (x: number) => ox + x * CELL + CELL / 2;
        const cy = (y: number) => oy + y * CELL + CELL / 2;

        const draw = (now: number) => {
            const t = still ? 1 : Math.min(1, (now - last) / TICK);
            ctx.clearRect(0, 0, w, h);

            ctx.fillStyle = colors.grid;
            for (let x = 0; x < g.cols; x++) for (let y = 0; y < g.rows; y++) ctx.fillRect(cx(x) - 0.5, cy(y) - 0.5, 1, 1);

            // food: a gentle pulse, and a ring that pops right after a bite
            ctx.fillStyle = colors.food;
            ctx.beginPath();
            ctx.arc(cx(food.x), cy(food.y), 3.2 + (still ? 0 : Math.sin(now / 180) * 0.6), 0, Math.PI * 2);
            ctx.fill();
            const since = now - bite;
            if (bite > 0 && since < 300 && !still) {
                ctx.strokeStyle = colors.food;
                ctx.globalAlpha = 1 - since / 300;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(cx(body[0].x), cy(body[0].y), 4 + since / 30, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // body: one thick round line through the eased segment centers
            const pts = body.map((c, i) => {
                const p = prev[i] ?? prev[prev.length - 1] ?? c;
                return {x: cx(p.x + (c.x - p.x) * t), y: cy(p.y + (c.y - p.y) * t)};
            });
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = colors.snake;
            ctx.lineWidth = CELL * 0.62;
            ctx.beginPath();
            pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.stroke();

            const hd = pts[0];
            ctx.fillStyle = colors.head;
            ctx.beginPath();
            ctx.arc(hd.x, hd.y, CELL * 0.42, 0, Math.PI * 2);
            ctx.fill();
            const dx = Math.sign(body[0].x - (body[1]?.x ?? body[0].x)), dy = Math.sign(body[0].y - (body[1]?.y ?? body[0].y));
            ctx.fillStyle = colors.eye;
            for (const s of [-1, 1]) {
                ctx.beginPath();
                ctx.arc(hd.x + dx * 1.6 - dy * s * 2, hd.y + dy * 1.6 + dx * s * 2, 1.1, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        let raf = 0;
        const loop = (now: number) => {
            if (frame % 30 === 0) readColors();
            if (!still) {
                while (now - last >= TICK) { step(); last += TICK; }
                if (now - last > TICK * 4) last = now;   // tab was hidden: don't fast-forward
            }
            draw(now);
            if (clock.current) clock.current.textContent = ((now - started) / 1000).toFixed(1) + " s";
            frame++;
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(raf); watch.disconnect(); };
    }, [waited]);

    return (
        <div className="cf-snake" role="status" aria-label="Waiting for response">
            <div className="cf-snake-code">
                <div className="cf-snake-gutter"/>
                <div ref={wrap} className="cf-snake-board">
                    <canvas ref={canvas} aria-hidden="true"/>
                </div>
            </div>
            <div className="cf-jc-foot">
                <span className="cf-snake-label">Waiting for response</span>
                <span className="cf-flex"/>
                <span ref={clock} className="cf-snake-clock">0.0 s</span>
            </div>
        </div>
    );
}

/**
 * The response while a request is in flight: the usual layout (status line, Body / Headers, code box) with
 * skeleton placeholders for the values not known yet, and the snake inside the code box.
 */
export function WaitingResponse({waited = 0}: { waited?: number }) {
    return (
        <div className="cf-response is-waiting">
            <div className="cf-response-bar">
                <span className="cf-skel" style={{width: 74}}/>
                <span className="cf-skel" style={{width: 52}}/>
                <span className="cf-skel" style={{width: 38}}/>
                <span className="cf-metric">Sending…</span>
            </div>
            <div className="cf-response-tools">
                <div className="cf-seg">
                    <button className="is-on" disabled>Body</button>
                    <button disabled>Headers</button>
                </div>
            </div>
            <SnakeBoard waited={waited}/>
        </div>
    );
}
