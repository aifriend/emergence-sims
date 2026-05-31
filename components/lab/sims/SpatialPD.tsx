"use client";

/* Nowak & May (1992) spatial Prisoner's Dilemma. Each lattice cell is a pure
 * Cooperator or Defector. Every round it plays the one-shot PD against its 8
 * Moore neighbours AND itself, summing payoffs under the one-parameter
 * convention R=1, T=b (1<b<2), P=S=0. Then — SYNCHRONOUSLY — each cell copies
 * the strategy of the highest-scoring cell in its neighbourhood (self included).
 * No memory, no reciprocity, yet cooperators huddle into clusters that defend
 * their borders, so cooperation survives where a well-mixed world would doom it.
 * Around b≈1.85 this settles to a famously stable coexistence (≈0.32 cooperators)
 * with kaleidoscopic invasion fronts. */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";

const CELL = 7; // px per cell on stage — small enough for fine fronts

// strategy bit
const C = 1;
const D = 0;

// blueprint palette: cooperators cool blue, defectors orange (--accent-2);
// freshly-switched cells get a lighter tint so the moving fronts read clearly.
const COL_C = "#7fb2ff"; // persistent cooperator
const COL_C_NEW = "#e8f1ff"; // just turned cooperator (defector invaded)
const COL_D = "var(--accent-2)"; // persistent defector (orange)
const COL_D_NEW = "#ffd0a8"; // just turned defector

type PDParams = { b: number; fc: number };

/** random C/D grid at cooperator fraction fc */
function makeGrid(cols: number, rows: number, fc: number): Uint8Array {
  const g = new Uint8Array(cols * rows);
  for (let i = 0; i < g.length; i++) g[i] = Math.random() < fc ? C : D;
  return g;
}

export function SpatialPD(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<PDParams>({ b: 1.85, fc: 0.9 });
  const [round, setRound] = useState(0);
  const [coop, setCoop] = useState(0);
  const live = useLive(p);
  live.current = p;

  const grid = useRef<Uint8Array | null>(null);
  const next = useRef<Uint8Array | null>(null);
  const score = useRef<Float32Array | null>(null);
  const prev = useRef<Uint8Array | null>(null); // strategy one round ago (for transition tint)
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const roundRef = useRef(0);
  const coopHist = useRef<number[]>([]);

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
      g.set(makeGrid(cols, rows, live.current.fc));
    }
    grid.current = g;
    next.current = new Uint8Array(cols * rows);
    score.current = new Float32Array(cols * rows);
    prev.current = g.slice();
    dim.current = { cols, rows };
    draw();
  });

  /** one synchronous Nowak–May round on a torus.
   * Pass 1: payoff of each cell vs its 8 neighbours + itself (R=1, T=b, P=S=0).
   * Pass 2: each cell adopts the strategy of the best-scoring cell in N(i)∪{i};
   *         own strategy wins ties (keeps the deterministic fronts crisp). */
  function step(): void {
    const g = grid.current,
      nx = next.current,
      sc = score.current,
      pv = prev.current;
    if (!g || !nx || !sc || !pv) return;
    const { cols, rows } = dim.current;
    const b = live.current.b;

    // PASS 1 — accumulate payoffs from the CURRENT grid (read-only)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const me = g[y * cols + x];
        let pay = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = (y + dy + rows) % rows;
          for (let dx = -1; dx <= 1; dx++) {
            const nxx = (x + dx + cols) % cols;
            const opp = g[ny * cols + nxx]; // self included (dx=dy=0)
            // R=1 if both C; T=b if I defect against a cooperator; else 0.
            if (me === C) {
              if (opp === C) pay += 1; // R
            } else if (opp === C) {
              pay += b; // T
            }
          }
        }
        sc[y * cols + x] = pay;
      }
    }

    // PASS 2 — imitate the best-scoring cell in the neighbourhood (self included)
    pv.set(g); // remember last round's strategies for the transition tint
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let best = sc[y * cols + x];
        let bestStrat = g[y * cols + x]; // own strategy is the tie default
        for (let dy = -1; dy <= 1; dy++) {
          const ny = (y + dy + rows) % rows;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nxx = (x + dx + cols) % cols;
            const s = sc[ny * cols + nxx];
            if (s > best) {
              best = s;
              bestStrat = g[ny * cols + nxx];
            }
          }
        }
        nx[y * cols + x] = bestStrat;
      }
    }

    grid.current = nx;
    next.current = g; // recycle buffers
    roundRef.current++;
  }

  function countCoop(): number {
    const g = grid.current;
    if (!g) return 0;
    let c = 0;
    for (let i = 0; i < g.length; i++) c += g[i];
    return c / g.length;
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cols, rows } = dim.current;
    const g = grid.current,
      pv = prev.current;
    if (!g || !pv) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    // four-colour Nowak–May scheme: persistent vs freshly-switched C/D
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const now = g[i],
          was = pv[i];
        if (now === C) ctx.fillStyle = was === C ? COL_C : COL_C_NEW;
        else ctx.fillStyle = was === D ? COL_D : COL_D_NEW;
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
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

  function reseed(): void {
    const { cols, rows } = dim.current;
    const g = makeGrid(cols, rows, live.current.fc);
    grid.current = g;
    prev.current = g.slice();
    roundRef.current = 0;
    setRound(0);
    coopHist.current = [];
    setCoop(countCoop());
    draw();
  }

  /** paint a defector into the cooperator sea to watch it probe (or get walled off) */
  function seedDefector(e: MouseEvent): void {
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / CELL);
    const y = Math.floor((e.clientY - r.top) / CELL);
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g || x < 0 || y < 0 || x >= cols || y >= rows) return;
    // a small 2x2 defector seed reliably invades a pure-C sea for b>1
    for (let dy = 0; dy <= 1; dy++)
      for (let dx = 0; dx <= 1; dx++) {
        const nx = (x + dx) % cols,
          ny = (y + dy) % rows;
        g[ny * cols + nx] = D;
      }
    setCoop(countCoop());
    draw();
  }

  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const interval = 130; // ~7.5 rounds/s — slow enough to track the fronts
    let did = false;
    while (acc.current >= interval) {
      step();
      acc.current -= interval;
      did = true;
    }
    if (!did) return;
    draw();
    const c = countCoop();
    setCoop(c);
    setRound(roundRef.current);
    coopHist.current.push(c);
    if (coopHist.current.length > 140) coopHist.current.shift();
  }, true);

  useEffect(() => {
    reseed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plot = coopHist.current;

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={seedDefector}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reseed}
        >
          <Btn onClick={reseed}>Randomise</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Click to seed a defector</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Temptation">
            <Slider
              label="b"
              value={p.b}
              min={1.0}
              max={2.0}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, b: v }))}
            />
          </Group>
          <Group title="Seed">
            <Slider
              label="Initial C"
              value={p.fc}
              min={0}
              max={1}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, fc: v }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={reseed}>Randomise</Btn>
            </div>
          </Group>
          <Group title="Cooperation">
            <MiniPlot
              series={[
                { data: plot, color: COL_C, fill: "rgba(127,178,255,0.12)" },
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
          <ReadOut k="Cooperation" v={`${Math.round(coop * 100)}%`} color={COL_C} />
        </>
      }
      footnote={
        <span>
          Each cell plays its 8 neighbours (and itself), then copies the
          best-scoring strategy nearby — payoffs R&#8202;=&#8202;1,
          T&#8202;=&#8202;b, P&#8202;=&#8202;S&#8202;=&#8202;0. In a well-mixed world
          defection always wins, but on a lattice cooperators form clusters that
          defend their borders, so cooperation persists — near b&#8202;≈&#8202;1.85
          it settles to a stable coexistence around 32% (Nowak &amp; May, 1992).
        </span>
      }
    />
  );
}

export function SpatialPDThumb(): ReactNode {
  const grid = useRef<Uint8Array | null>(null);
  const next = useRef<Uint8Array | null>(null);
  const score = useRef<Float32Array | null>(null);
  const prev = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const ticks = useRef(0);
  const SZ = 5;

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.floor(w / SZ),
      rows = Math.floor(h / SZ);
    const g = makeGrid(cols, rows, 0.9);
    grid.current = g;
    next.current = new Uint8Array(cols * rows);
    score.current = new Float32Array(cols * rows);
    prev.current = g.slice();
    dim.current = { cols, rows };
  });

  function reseed(): void {
    const { cols, rows } = dim.current;
    const g = makeGrid(cols, rows, 0.9);
    grid.current = g;
    prev.current = g.slice();
    ticks.current = 0;
  }

  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 150) return;
    acc.current = 0;
    const g = grid.current,
      nx = next.current,
      sc = score.current,
      pv = prev.current;
    if (!g || !nx || !sc || !pv) return;
    const { cols, rows } = dim.current;
    const b = 1.85;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const me = g[y * cols + x];
        let pay = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = (y + dy + rows) % rows;
          for (let dx = -1; dx <= 1; dx++) {
            const opp = g[ny * cols + ((x + dx + cols) % cols)];
            if (me === C) {
              if (opp === C) pay += 1;
            } else if (opp === C) pay += b;
          }
        }
        sc[y * cols + x] = pay;
      }
    pv.set(g);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        let best = sc[y * cols + x],
          bestStrat = g[y * cols + x];
        for (let dy = -1; dy <= 1; dy++) {
          const ny = (y + dy + rows) % rows;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const s = sc[ny * cols + ((x + dx + cols) % cols)];
            if (s > best) {
              best = s;
              bestStrat = g[ny * cols + ((x + dx + cols) % cols)];
            }
          }
        }
        nx[y * cols + x] = bestStrat;
      }
    grid.current = nx;
    next.current = g;
    ticks.current++;
    if (ticks.current > 60) reseed();

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    const cur = grid.current,
      was = prev.current;
    if (!cur || !was) return;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x,
          now = cur[i];
        if (now === C) ctx.fillStyle = was[i] === C ? "rgba(127,178,255,0.92)" : "rgba(232,241,255,0.95)";
        else ctx.fillStyle = was[i] === D ? "rgba(255,122,69,0.92)" : "rgba(255,208,168,0.95)";
        ctx.fillRect(x * SZ, y * SZ, SZ - 1, SZ - 1);
      }
  }, true);

  return <canvas ref={cref} />;
}
