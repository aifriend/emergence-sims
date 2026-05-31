"use client";

/* Schelling's segregation model (1971). A grid of cells, each empty or held by
 * an agent of type A or B. An agent is unhappy when fewer than a fraction τ of
 * its occupied Moore-neighbours share its type; each round the unhappy agents
 * relocate (random order) to a random empty cell. Mild individual preference
 * curdles a blended checkerboard into stark same-type enclaves. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";

const CELL = 9; // px per cell on stage

// cell occupants
const EMPTY = 0;
const A = 1;
const B = 2;

const COL_A = "#e8f1ff";
const COL_B = "var(--accent-2)"; // orange

type SchP = { tol: number; vacancy: number; ratio: number };

/** randomly fill a grid with empties + A/B agents at the given fractions */
function makeGrid(cols: number, rows: number, vacancy: number, ratio: number): Uint8Array {
  const g = new Uint8Array(cols * rows);
  for (let i = 0; i < g.length; i++) {
    if (Math.random() < vacancy) g[i] = EMPTY;
    else g[i] = Math.random() < ratio ? A : B;
  }
  return g;
}

/** like-fraction over occupied Moore-neighbours; isolated agents count as happy */
function sameFraction(g: Uint8Array, cols: number, rows: number, x: number, y: number): number {
  const c = g[y * cols + x];
  let same = 0,
    occ = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const v = g[ny * cols + nx];
      if (v === EMPTY) continue; // empties excluded from the denominator
      occ++;
      if (v === c) same++;
    }
  return occ === 0 ? 1 : same / occ; // isolated ⇒ content
}

export function Schelling(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<SchP>({ tol: 0.3, vacancy: 0.1, ratio: 0.5 });
  const [round, setRound] = useState(0);
  const [happy, setHappy] = useState(0);
  const [seg, setSeg] = useState(0);
  const live = useLive(p);
  live.current = p;

  const grid = useRef<Uint8Array | null>(null);
  const empties = useRef<number[]>([]); // indices of empty cells
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const roundRef = useRef(0);
  const segHist = useRef<number[]>([]);

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / CELL));
    const rows = Math.max(8, Math.floor(h / CELL));
    const old = grid.current,
      od = dim.current;
    const g = new Uint8Array(cols * rows);
    if (old) {
      for (let y = 0; y < Math.min(rows, od.rows); y++)
        for (let x = 0; x < Math.min(cols, od.cols); x++)
          g[y * cols + x] = old[y * od.cols + x];
    } else {
      const seeded = makeGrid(cols, rows, live.current.vacancy, live.current.ratio);
      g.set(seeded);
    }
    grid.current = g;
    dim.current = { cols, rows };
    rebuildEmpties();
    draw();
  });

  function rebuildEmpties() {
    const g = grid.current;
    if (!g) return;
    const e: number[] = [];
    for (let i = 0; i < g.length; i++) if (g[i] === EMPTY) e.push(i);
    empties.current = e;
  }

  /** one round: relocate every unhappy agent to a random empty cell */
  function step(): void {
    const g = grid.current;
    if (!g) return;
    const { cols, rows } = dim.current;
    const tol = live.current.tol;
    // collect unhappy agents, then shuffle for randomized sequential order
    const unhappy: number[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (g[y * cols + x] === EMPTY) continue;
        if (sameFraction(g, cols, rows, x, y) < tol) unhappy.push(y * cols + x);
      }
    for (let i = unhappy.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = unhappy[i];
      unhappy[i] = unhappy[j];
      unhappy[j] = t;
    }
    const emp = empties.current;
    for (const from of unhappy) {
      if (g[from] === EMPTY || emp.length === 0) continue; // already vacated
      const k = (Math.random() * emp.length) | 0;
      const to = emp[k];
      g[to] = g[from];
      g[from] = EMPTY;
      emp[k] = from; // the vacated cell becomes the new empty slot
    }
    roundRef.current++;
  }

  /** average same-type neighbour fraction + happy fraction over all agents */
  function measure(): { seg: number; happy: number } {
    const g = grid.current;
    if (!g) return { seg: 0, happy: 0 };
    const { cols, rows } = dim.current;
    const tol = live.current.tol;
    let sumSeg = 0,
      nHappy = 0,
      nAgents = 0;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (g[y * cols + x] === EMPTY) continue;
        nAgents++;
        const f = sameFraction(g, cols, rows, x, y);
        sumSeg += f;
        if (f >= tol) nHappy++;
      }
    return {
      seg: nAgents ? sumSeg / nAgents : 0,
      happy: nAgents ? nHappy / nAgents : 1,
    };
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
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = g[y * cols + x];
        if (v === EMPTY) continue;
        ctx.fillStyle = v === A ? COL_A : COL_B;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
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

  function refreshStats() {
    const m = measure();
    setSeg(m.seg);
    setHappy(m.happy);
  }

  function reseed() {
    const { cols, rows } = dim.current;
    grid.current = makeGrid(cols, rows, live.current.vacancy, live.current.ratio);
    rebuildEmpties();
    roundRef.current = 0;
    setRound(0);
    segHist.current = [];
    draw();
    refreshStats();
  }

  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const interval = 320; // ~3 rounds/s — slow enough to watch coarsening
    let did = false;
    while (acc.current >= interval) {
      step();
      acc.current -= interval;
      did = true;
    }
    if (!did) return;
    draw();
    const m = measure();
    setSeg(m.seg);
    setHappy(m.happy);
    setRound(roundRef.current);
    segHist.current.push(m.seg);
    if (segHist.current.length > 140) segHist.current.shift();
  }, true);

  useEffect(() => {
    reseed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plot = segHist.current;

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reseed}
        >
          <Btn onClick={reseed}>Randomise</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            {happy >= 0.999 ? "Settled ✓" : `${Math.round((1 - happy) * 100)}% unhappy`}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Preference">
            <Slider
              label="Tolerance τ"
              value={p.tol}
              min={0}
              max={0.9}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, tol: v }))}
            />
          </Group>
          <Group title="Population">
            <Slider
              label="Empty"
              value={p.vacancy}
              min={0.05}
              max={0.4}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, vacancy: v }))}
            />
            <Slider
              label="Mix A:B"
              value={p.ratio}
              min={0.3}
              max={0.7}
              step={0.01}
              fmt={(v) => `${Math.round(v * 100)}:${Math.round((1 - v) * 100)}`}
              onChange={(v) => setP((o) => ({ ...o, ratio: v }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={reseed}>Randomise</Btn>
            </div>
          </Group>
          <Group title="Segregation">
            <MiniPlot
              series={[
                { data: plot, color: "var(--accent-2)", fill: "rgba(255,122,69,0.10)" },
              ]}
              max={1}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Round" v={round} />
          <ReadOut k="Happy" v={`${Math.round(happy * 100)}%`} />
          <ReadOut k="Segregation" v={`${Math.round(seg * 100)}%`} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Every agent is happy in a 70% mixed neighbourhood, asking only that ~30%
          of neighbours match — yet that mild preference still curdles the grid into
          stark same-type enclaves. Micromotives need not resemble macrobehaviour
          (Schelling 1971).
        </span>
      }
    />
  );
}

export function SchellingThumb(): ReactNode {
  const grid = useRef<Uint8Array | null>(null);
  const empties = useRef<number[]>([]);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const ticks = useRef(0);
  const C = 6;

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.floor(w / C),
      rows = Math.floor(h / C);
    grid.current = makeGrid(cols, rows, 0.1, 0.5);
    dim.current = { cols, rows };
    rebuild();
  });

  function rebuild() {
    const g = grid.current;
    if (!g) return;
    const e: number[] = [];
    for (let i = 0; i < g.length; i++) if (g[i] === EMPTY) e.push(i);
    empties.current = e;
  }

  function reseed() {
    const { cols, rows } = dim.current;
    grid.current = makeGrid(cols, rows, 0.1, 0.5);
    rebuild();
    ticks.current = 0;
  }

  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 220) return;
    acc.current = 0;
    const g = grid.current;
    if (!g) return;
    const { cols, rows } = dim.current;
    const tol = 0.4;
    const unhappy: number[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (g[y * cols + x] === EMPTY) continue;
        if (sameFraction(g, cols, rows, x, y) < tol) unhappy.push(y * cols + x);
      }
    const emp = empties.current;
    for (const from of unhappy) {
      if (g[from] === EMPTY || emp.length === 0) continue;
      const k = (Math.random() * emp.length) | 0;
      const to = emp[k];
      g[to] = g[from];
      g[from] = EMPTY;
      emp[k] = from;
    }
    ticks.current++;
    if (unhappy.length === 0 || ticks.current > 40) reseed();

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    const cur = grid.current;
    if (!cur) return;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = cur[y * cols + x];
        if (v === EMPTY) continue;
        ctx.fillStyle = v === A ? "rgba(232,241,255,0.92)" : "rgba(255,122,69,0.92)";
        ctx.fillRect(x * C, y * C, C - 1, C - 1);
      }
  }, true);

  return <canvas ref={cref} />;
}
