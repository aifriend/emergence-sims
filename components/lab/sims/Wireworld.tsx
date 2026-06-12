"use client";

/* Wireworld (Silverman 1987): a 4-state cellular automaton that runs digital
   logic. Pure model lives in lib/ca/wireworld; this is the canvas card. */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Transport } from "../controls";
import {
  CIRCUITS,
  EMPTY,
  HEAD,
  TAIL,
  WIRE,
  fromAscii,
  stepWireworld,
} from "@/lib/ca/wireworld";

const CELL = 9; // px per cell on stage

// 4-state palette on the blueprint stage.
const COL_EMPTY = "#061b32"; // background
const COL_WIRE = "rgba(124,170,228,0.5)"; // dim blue conductor
const COL_HEAD = "#e8f1ff"; // bright electron head
const COL_TAIL = "#ff7a1a"; // orange electron tail (var(--accent))

type WireP = { speed: number };

/** Count heads in a grid (for the readout). */
function countHeads(g: Uint8Array): number {
  let c = 0;
  for (const v of g) if (v === HEAD) c++;
  return c;
}

/**
 * Stamp a circuit's cells, centred, into a fresh cols×rows grid. The circuit is
 * already padded by fromAscii; here we just place it in the middle of the stage.
 */
function loadCircuit(idx: number, cols: number, rows: number): Uint8Array {
  const g = new Uint8Array(cols * rows);
  const circuit = CIRCUITS[idx];
  if (!circuit) return g;
  const { grid: src, cols: sc, rows: sr } = fromAscii(circuit.art);
  const ox = Math.max(0, Math.floor((cols - sc) / 2));
  const oy = Math.max(0, Math.floor((rows - sr) / 2));
  for (let y = 0; y < sr && y + oy < rows; y++)
    for (let x = 0; x < sc && x + ox < cols; x++)
      g[(y + oy) * cols + (x + ox)] = src[y * sc + x];
  return g;
}

export function Wireworld(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<WireP>({ speed: 12 });
  const [circuit, setCircuit] = useState(0);
  const [gen, setGen] = useState(0);
  const [heads, setHeads] = useState(0);
  const live = useLive(p);
  live.current = p;
  const circuitRef = useLive(circuit);
  circuitRef.current = circuit;

  const grid = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const genRef = useRef(0);
  const drawing = useRef(false);

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / CELL));
    const rows = Math.max(8, Math.floor(h / CELL));
    const old = grid.current;
    const od = dim.current;
    if (old) {
      // Preserve drawn cells across a resize.
      const g = new Uint8Array(cols * rows);
      for (let y = 0; y < Math.min(rows, od.rows); y++)
        for (let x = 0; x < Math.min(cols, od.cols); x++)
          g[y * cols + x] = old[y * od.cols + x];
      grid.current = g;
    } else {
      grid.current = loadCircuit(circuitRef.current, cols, rows);
    }
    dim.current = { cols, rows };
  });

  function step(): number {
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return 0;
    grid.current = stepWireworld(g, cols, rows);
    genRef.current++;
    return countHeads(grid.current);
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return;
    ctx.fillStyle = COL_EMPTY;
    ctx.fillRect(0, 0, w, h);
    // cells (skip empty: the background already covers them)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = g[y * cols + x];
        if (v === EMPTY) continue;
        ctx.fillStyle =
          v === WIRE ? COL_WIRE : v === HEAD ? COL_HEAD : COL_TAIL;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    // grid lines
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, rows * CELL);
    }
    for (let y = 0; y <= rows; y++) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(cols * CELL, y * CELL + 0.5);
    }
    ctx.stroke();
  }

  useRAF((dt) => {
    if (running) {
      acc.current += dt;
      const interval = 1000 / live.current.speed;
      let did = false;
      let hc = heads;
      while (acc.current >= interval) {
        hc = step();
        acc.current -= interval;
        did = true;
      }
      if (did) {
        draw();
        setGen(genRef.current);
        setHeads(hc);
      }
    }
  }, true);

  // initial paint
  useEffect(() => {
    draw();
    setHeads(grid.current ? countHeads(grid.current) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** (Re)load a circuit into the current grid and reset the clock. */
  function load(idx: number) {
    const { cols, rows } = dim.current;
    grid.current = loadCircuit(idx, cols, rows);
    genRef.current = 0;
    acc.current = 0;
    setGen(0);
    setHeads(grid.current ? countHeads(grid.current) : 0);
    draw();
  }

  function pickCircuit(idx: number) {
    setCircuit(idx);
    load(idx);
  }

  // click-to-paint: cycle a cell empty -> wire -> head -> tail -> empty
  function cellAt(e: MouseEvent): number {
    const cv = cref.current;
    if (!cv) return -1;
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / CELL);
    const y = Math.floor((e.clientY - r.top) / CELL);
    const { cols, rows } = dim.current;
    if (x < 0 || y < 0 || x >= cols || y >= rows) return -1;
    return y * cols + x;
  }
  function cycleCell(e: MouseEvent) {
    const i = cellAt(e);
    if (i < 0 || !grid.current) return;
    const cur = grid.current[i];
    // EMPTY(0) -> WIRE(3) -> HEAD(1) -> TAIL(2) -> EMPTY(0)
    const nextState =
      cur === EMPTY
        ? WIRE
        : cur === WIRE
          ? HEAD
          : cur === HEAD
            ? TAIL
            : EMPTY;
    grid.current[i] = nextState;
    draw();
    setHeads(countHeads(grid.current));
  }

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={(e) => {
            drawing.current = true;
            cycleCell(e);
          }}
          onMouseUp={() => (drawing.current = false)}
          onMouseLeave={() => (drawing.current = false)}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={() => load(circuit)}
        >
          <Btn
            onClick={() => {
              if (!running) {
                const hc = step();
                draw();
                setGen(genRef.current);
                setHeads(hc);
              }
            }}
            disabled={running}
          >
            Step ›
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Click a cell to cycle wire/electron</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Circuit">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CIRCUITS.map((c, i) => (
                <Btn key={c.name} on={circuit === i} onClick={() => pickCircuit(i)}>
                  {c.name}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={40}
              step={1}
              unit=" steps/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Generation" v={gen} />
          <ReadOut k="Heads" v={heads} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Four states on a grid: empty, wire, and the two halves of an electron
          (head then tail). Heads crawl along wires as clocks; from gates of wire
          you can build logic and even a computer. Click cells to lay your own
          wire and inject a head.
        </span>
      }
    />
  );
}

export function WireworldThumb(): ReactNode {
  const grid = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const C = 6;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / C));
    const rows = Math.max(8, Math.floor(h / C));
    // A small auto-running clock loop, centred in the thumbnail.
    grid.current = loadCircuit(0, cols, rows);
    dim.current = { cols, rows };
  });
  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 90) return;
    acc.current = 0;
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return;
    grid.current = stepWireworld(g, cols, rows);
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.fillStyle = COL_EMPTY;
    ctx.fillRect(0, 0, w, h);
    const cur = grid.current;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = cur[y * cols + x];
        if (v === EMPTY) continue;
        ctx.fillStyle =
          v === WIRE ? COL_WIRE : v === HEAD ? COL_HEAD : COL_TAIL;
        ctx.fillRect(x * C, y * C, C - 1, C - 1);
      }
  }, true);
  return <canvas ref={cref} />;
}
