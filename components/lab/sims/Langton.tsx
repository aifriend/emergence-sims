"use client";

/* Langton's Ant — a 2-state turmite whose two trivial rules build an ordered
 * diagonal "highway" out of ~10,000 steps of chaos. Pure model lives in
 * @/lib/ca/langton; this file is the canvas renderer + blueprint controls,
 * following the Conway's Life card pattern. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Transport } from "../controls";
import { stepAnt, centreAnt, countBlack, type Ant } from "@/lib/ca/langton";

const CELL = 5; // px per cell — small so the highway is visible
const BG = "#061b32"; // blueprint stage background
const BLACK = "#e8f1ff"; // a flipped (black=1) cell, drawn filled
const ANT = "#ff7a1a"; // ant marker — matches lab.css var(--accent)

type LangtonP = { speed: number; ants: number };

/** Build `n` ants: the first at centre facing N, the rest at random cells. */
function makeAnts(cols: number, rows: number, n: number): Ant[] {
  const ants: Ant[] = [centreAnt(cols, rows)];
  for (let i = 1; i < n; i++) {
    ants.push({
      row: Math.floor(Math.random() * rows),
      col: Math.floor(Math.random() * cols),
      dir: Math.floor(Math.random() * 4),
    });
  }
  return ants;
}

export function Langton(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<LangtonP>({ speed: 200, ants: 1 });
  const [steps, setSteps] = useState(0);
  const [black, setBlack] = useState(0);
  const live = useLive(p);
  live.current = p;

  const grid = useRef<Uint8Array | null>(null);
  const ants = useRef<Ant[]>([]);
  const dim = useRef({ cols: 0, rows: 0 });
  const stepsRef = useRef(0);

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / CELL));
    const rows = Math.max(8, Math.floor(h / CELL));
    // resize wipes the grid and re-seeds the ants (positions are size-relative)
    grid.current = new Uint8Array(cols * rows);
    ants.current = makeAnts(cols, rows, live.current.ants);
    dim.current = { cols, rows };
    stepsRef.current = 0;
  });

  /** advance `n` whole steps for every ant; returns black-cell count. */
  function step(n: number): number {
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return 0;
    const as = ants.current;
    for (let k = 0; k < n; k++) {
      for (let a = 0; a < as.length; a++) stepAnt(g, cols, rows, as[a]);
    }
    stepsRef.current += n;
    return countBlack(g);
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
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    // flipped (black) cells, drawn as light squares
    ctx.fillStyle = BLACK;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (g[y * cols + x]) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    // ant markers on top
    ctx.fillStyle = ANT;
    for (const a of ants.current) {
      ctx.fillRect(a.col * CELL, a.row * CELL, CELL, CELL);
    }
  }

  useRAF(() => {
    if (!running) return;
    const b = step(live.current.speed);
    draw();
    setSteps(stepsRef.current);
    setBlack(b);
  }, true);

  // initial paint
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    const { cols, rows } = dim.current;
    grid.current = new Uint8Array(cols * rows);
    ants.current = makeAnts(cols, rows, live.current.ants);
    stepsRef.current = 0;
    setSteps(0);
    setBlack(0);
    draw();
  }

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <Btn
            onClick={() => {
              if (!running) {
                const b = step(live.current.speed);
                draw();
                setSteps(stepsRef.current);
                setBlack(b);
              }
            }}
            disabled={running}
          >
            Step ›
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Crank Speed to reach the highway</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={2000}
              step={1}
              unit=" steps/frame"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Colony">
            <Slider
              label="Ants"
              value={p.ants}
              min={1}
              max={6}
              step={1}
              onChange={(v) => {
                setP((o) => ({ ...o, ants: v }));
                // re-seed immediately so the ant count change is visible
                const { cols, rows } = dim.current;
                grid.current = new Uint8Array(cols * rows);
                ants.current = makeAnts(cols, rows, v);
                stepsRef.current = 0;
                setSteps(0);
                setBlack(0);
                draw();
              }}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Steps" v={steps.toLocaleString()} />
          <ReadOut k="Black cells" v={black.toLocaleString()} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Two rules: on white turn right, on black turn left — always flipping the
          cell you leave. ~10,000 steps of chaos, then the ant builds a periodic
          diagonal highway and never stops. Crank Speed to fast-forward to it.
        </span>
      }
    />
  );
}

export function LangtonThumb(): ReactNode {
  const grid = useRef<Uint8Array | null>(null);
  const ant = useRef<Ant | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const C = 4;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.floor(w / C),
      rows = Math.floor(h / C);
    grid.current = new Uint8Array(cols * rows);
    ant.current = centreAnt(cols, rows);
    dim.current = { cols, rows };
  });
  useRAF(() => {
    const { cols, rows } = dim.current;
    let g = grid.current;
    let a = ant.current;
    if (!g || !a) return;
    // a brisk burst per frame so the highway forms in the preview
    for (let k = 0; k < 90; k++) stepAnt(g, cols, rows, a);
    // reset once the highway has marched off into a full-ish board
    if (countBlack(g) > cols * rows * 0.5) {
      g = new Uint8Array(cols * rows);
      a = centreAnt(cols, rows);
      grid.current = g;
      ant.current = a;
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(232,241,255,0.92)";
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (g[y * cols + x]) ctx.fillRect(x * C, y * C, C - 1, C - 1);
    ctx.fillStyle = "#ff7a1a";
    ctx.fillRect(a.col * C, a.row * C, C, C);
  }, true);
  return <canvas ref={cref} />;
}
