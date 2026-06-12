"use client";

/* Conway's Game of Life. Ported from the design bundle's sims/life.jsx */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Toggle, Transport } from "../controls";
import {
  PATTERNS,
  RULES,
  parseRule,
  stampPattern,
  stepLifelike,
  type Pattern,
} from "@/lib/ca/lifelike";

const CELL = 9; // px per cell on stage

type LifeP = { speed: number; density: number; wrap: boolean; rule: string };

function makeGrid(cols: number, rows: number, density: number): Uint8Array {
  const g = new Uint8Array(cols * rows);
  for (let i = 0; i < g.length; i++) g[i] = Math.random() < density ? 1 : 0;
  return g;
}

export function Life(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<LifeP>({
    speed: 12,
    density: 0.3,
    wrap: true,
    rule: "B3/S23",
  });
  const [gen, setGen] = useState(0);
  const [pop, setPop] = useState(0);
  const live = useLive(p);
  live.current = p;

  const grid = useRef<Uint8Array | null>(null);
  const next = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const genRef = useRef(0);
  const drawing = useRef(0); // 0 none, 1 paint, -1 erase

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / CELL));
    const rows = Math.max(8, Math.floor(h / CELL));
    const old = grid.current,
      od = dim.current;
    const g = makeGrid(cols, rows, 0); // start empty then copy or seed
    if (old) {
      for (let y = 0; y < Math.min(rows, od.rows); y++)
        for (let x = 0; x < Math.min(cols, od.cols); x++)
          g[y * cols + x] = old[y * od.cols + x];
    } else {
      for (let i = 0; i < g.length; i++)
        g[i] = Math.random() < live.current.density ? 1 : 0;
    }
    grid.current = g;
    next.current = new Uint8Array(cols * rows);
    dim.current = { cols, rows };
  });

  function step(): number {
    const { cols, rows } = dim.current;
    const g = grid.current,
      nx = next.current;
    if (!g || !nx) return 0;
    const pop = stepLifelike(
      g,
      nx,
      cols,
      rows,
      parseRule(live.current.rule),
      live.current.wrap,
    );
    grid.current = nx;
    next.current = g;
    genRef.current++;
    return pop;
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
    // cells
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (g[y * cols + x]) {
          ctx.fillStyle = "#e8f1ff";
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
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
      let did = false,
        pc = pop;
      while (acc.current >= interval) {
        pc = step();
        acc.current -= interval;
        did = true;
      }
      if (did) {
        draw();
        setGen(genRef.current);
        setPop(pc);
      }
    }
  }, true);

  // initial paint
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset(empty: boolean) {
    const { cols, rows } = dim.current;
    grid.current = empty
      ? new Uint8Array(cols * rows)
      : makeGrid(cols, rows, live.current.density);
    genRef.current = 0;
    setGen(0);
    let pc = 0;
    for (const v of grid.current) pc += v;
    setPop(pc);
    draw();
  }

  function stamp(pat: Pattern): void {
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return;
    // Gosper gun near the top-left so its gliders have room to fly; small
    // patterns centre-stage.
    const oy = pat.name === "Gosper gun" ? 2 : Math.floor(rows / 2) - 1;
    const ox = pat.name === "Gosper gun" ? 2 : Math.floor(cols / 2) - 1;
    const pop = stampPattern(g, cols, rows, pat, oy, ox);
    genRef.current = 0;
    setGen(0);
    setPop(pop);
    draw();
  }

  // painting cells with the cursor
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
  function paint(e: MouseEvent, val: number) {
    const i = cellAt(e);
    if (i < 0 || !grid.current) return;
    grid.current[i] = val;
    draw();
    let pc = 0;
    for (const v of grid.current) pc += v;
    setPop(pc);
  }

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={(e) => {
            const i = cellAt(e);
            drawing.current = i >= 0 && grid.current && grid.current[i] ? -1 : 1;
            paint(e, drawing.current === 1 ? 1 : 0);
          }}
          onMouseMove={(e) => {
            if (drawing.current) paint(e, drawing.current === 1 ? 1 : 0);
          }}
          onMouseUp={() => (drawing.current = 0)}
          onMouseLeave={() => (drawing.current = 0)}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={() => reset(false)}
        >
          <Btn onClick={() => reset(true)}>Clear</Btn>
          <Btn
            onClick={() => {
              if (!running) {
                const pc = step();
                draw();
                setGen(genRef.current);
                setPop(pc);
              }
            }}
            disabled={running}
          >
            Step ›
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Click + drag to draw</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={40}
              step={1}
              unit=" gen/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Rule">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RULES.map((r) => (
                <Btn
                  key={r.code}
                  on={p.rule === r.code}
                  title={r.code}
                  onClick={() => setP((o) => ({ ...o, rule: r.code }))}
                >
                  {r.name}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Pattern">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PATTERNS.map((pat) => (
                <Btn key={pat.name} onClick={() => stamp(pat)}>
                  {pat.name}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Seed">
            <Slider
              label="Density"
              value={p.density}
              min={0.05}
              max={0.6}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, density: v }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => reset(false)}>Randomise</Btn>
            </div>
          </Group>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="ctl-name">Edge wrap</span>
            <Toggle
              value={p.wrap}
              options={[
                { label: "Torus", value: true },
                { label: "Wall", value: false },
              ]}
              onChange={(v) => setP((o) => ({ ...o, wrap: v }))}
            />
          </div>
        </>
      }
      readouts={
        <>
          <ReadOut k="Generation" v={gen} />
          <ReadOut k="Live cells" v={pop} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Each cell lives or dies by how many of its 8 neighbours are alive.
          Switch the birth/survival rule, stamp a classic like the Gosper gun, or
          draw your own — then press play.
        </span>
      }
    />
  );
}

export function LifeThumb(): ReactNode {
  const grid = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const C = 6;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.floor(w / C),
      rows = Math.floor(h / C);
    grid.current = makeGrid(cols, rows, 0.32);
    dim.current = { cols, rows };
  });
  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 110) return;
    acc.current = 0;
    const { cols, rows } = dim.current;
    const g = grid.current;
    if (!g) return;
    const nx = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            n += g[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
          }
        nx[y * cols + x] = g[y * cols + x]
          ? n === 2 || n === 3
            ? 1
            : 0
          : n === 3
            ? 1
            : 0;
      }
    let alive = 0;
    for (const v of nx) alive += v;
    grid.current = alive < cols * rows * 0.04 ? makeGrid(cols, rows, 0.32) : nx;
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(232,241,255,0.92)";
    const cur = grid.current;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (cur[y * cols + x]) ctx.fillRect(x * C, y * C, C - 1, C - 1);
  }, true);
  return <canvas ref={cref} />;
}
