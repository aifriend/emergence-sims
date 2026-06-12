"use client";

/* Lenia — continuous cellular automaton (Chan, 2018). Watch the Orbium glider
 * swim. Fixed grid (the kernel radius is fixed), rendered as a heat field. */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Toggle, Transport } from "../controls";
import {
  ORBIUM_PARAMS,
  buildKernel,
  seedOrbium,
  seedRandom,
  stepLenia,
  type Kernel,
} from "@/lib/ca/lenia";

const N = 72; // fixed Lenia grid (kernel radius R=13 is fixed, so the grid is too)

type SeedKind = "orbium" | "random";
type LeniaP = { speed: number; mu: number; seed: SeedKind };

/** value [0,1] → blueprint heat: background → cyan → white (256-entry LUT). */
const LUT: string[] = (() => {
  const out: string[] = [];
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let r: number, g: number, b: number;
    if (t < 0.6) {
      const u = t / 0.6;
      r = lerp(6, 90, u);
      g = lerp(27, 209, u);
      b = lerp(50, 255, u);
    } else {
      const u = (t - 0.6) / 0.4;
      r = lerp(90, 232, u);
      g = lerp(209, 241, u);
      b = lerp(255, 255, u);
    }
    out.push(`rgb(${r},${g},${b})`);
  }
  return out;
})();

export function Lenia(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<LeniaP>({ speed: 1, mu: 0.15, seed: "orbium" });
  const [gen, setGen] = useState(0);
  const [mass, setMass] = useState(0);
  const live = useLive(p);
  live.current = p;

  const A = useRef<Float32Array | null>(null);
  const B = useRef<Float32Array | null>(null);
  const kernel = useRef<Kernel>(buildKernel(ORBIUM_PARAMS.R));
  const genRef = useRef(0);
  const drawing = useRef(false);

  const [cref, csize] = useCanvas(() => draw());

  function draw(): void {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const a = A.current;
    if (!a) return;
    const cell = Math.max(1, Math.floor(Math.min(w, h) / N));
    const side = cell * N;
    const ox = Math.floor((w - side) / 2);
    const oy = Math.floor((h - side) / 2);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#04101f";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = a[y * N + x];
        if (v < 0.02) continue;
        ctx.fillStyle = LUT[(v * 255) | 0];
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
    }
  }

  function reseed(kind: SeedKind): void {
    A.current = kind === "orbium" ? seedOrbium(N, N) : seedRandom(N, N, ORBIUM_PARAMS.R);
    B.current = new Float32Array(N * N);
    genRef.current = 0;
    setGen(0);
    let m = 0;
    for (const v of A.current) m += v;
    setMass(m);
    draw();
  }

  useEffect(() => {
    reseed(live.current.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tick(): number {
    const a = A.current;
    const b = B.current;
    if (!a || !b) return 0;
    const params = { ...ORBIUM_PARAMS, mu: live.current.mu };
    let cur = a;
    let nxt = b;
    let m = 0;
    const steps = live.current.speed;
    for (let s = 0; s < steps; s++) {
      m = stepLenia(cur, nxt, N, N, kernel.current, params);
      [cur, nxt] = [nxt, cur];
    }
    A.current = cur;
    B.current = nxt;
    genRef.current += steps;
    return m;
  }

  useRAF(() => {
    if (!running) return;
    const m = tick();
    draw();
    setGen(genRef.current);
    setMass(m);
  }, true);

  // brush: raise a small disc of mass under the cursor
  function brushAt(e: MouseEvent): void {
    const cv = cref.current;
    const a = A.current;
    if (!cv || !a) return;
    const r = cv.getBoundingClientRect();
    const { w, h } = csize.current;
    const cell = Math.max(1, Math.floor(Math.min(w, h) / N));
    const side = cell * N;
    const gx = Math.floor((e.clientX - r.left - (w - side) / 2) / cell);
    const gy = Math.floor((e.clientY - r.top - (h - side) / 2) / cell);
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return;
    const br = 3;
    for (let dy = -br; dy <= br; dy++) {
      for (let dx = -br; dx <= br; dx++) {
        if (dx * dx + dy * dy > br * br) continue;
        const y = gy + dy;
        const x = gx + dx;
        if (y >= 0 && y < N && x >= 0 && x < N) a[y * N + x] = Math.min(1, a[y * N + x] + 0.9);
      }
    }
    draw();
  }

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={(e) => {
            drawing.current = true;
            brushAt(e);
          }}
          onMouseMove={(e) => {
            if (drawing.current) brushAt(e);
          }}
          onMouseUp={() => (drawing.current = false)}
          onMouseLeave={() => (drawing.current = false)}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={() => reseed(live.current.seed)}
        >
          <Btn
            onClick={() => {
              if (!running) {
                const m = tick();
                draw();
                setGen(genRef.current);
                setMass(m);
              }
            }}
            disabled={running}
          >
            Step ›
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Drag to add mass</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Seed">
            <Toggle
              value={p.seed}
              options={[
                { label: "Orbium", value: "orbium" },
                { label: "Soup", value: "random" },
              ]}
              onChange={(v) => {
                setP((o) => ({ ...o, seed: v }));
                reseed(v);
              }}
            />
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={3}
              step={1}
              unit="× / frame"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Growth">
            <Slider
              label="Growth μ"
              value={p.mu}
              min={0.1}
              max={0.22}
              step={0.005}
              fmt={(v) => v.toFixed(3)}
              onChange={(v) => setP((o) => ({ ...o, mu: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Generation" v={gen} />
          <ReadOut k="Mass" v={mass.toFixed(0)} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Continuous Life: cells hold real values, a smooth ring-kernel sums each
          neighbourhood and a bell-shaped growth rule nudges every cell. The
          Orbium is a stable creature that swims — drag μ off 0.15 and watch it
          dissolve.
        </span>
      }
    />
  );
}

export function LeniaThumb(): ReactNode {
  const M = 40; // smaller grid for the gallery thumbnail
  const A = useRef<Float32Array | null>(null);
  const B = useRef<Float32Array | null>(null);
  const kernel = useRef<Kernel>(buildKernel(ORBIUM_PARAMS.R));
  const acc = useRef(0);
  const [cref, csize] = useCanvas(() => {
    if (!A.current) A.current = seedOrbium(M, M);
    if (!B.current) B.current = new Float32Array(M * M);
  });
  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 70) return;
    acc.current = 0;
    let a = A.current;
    let b = B.current;
    if (!a || !b) return;
    const m = stepLenia(a, b, M, M, kernel.current, ORBIUM_PARAMS);
    [a, b] = [b, a];
    A.current = a;
    B.current = b;
    if (m < 4 || m > M * M * 0.5) A.current = seedOrbium(M, M); // died/blew up → reseed
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const cell = Math.max(1, Math.min(w, h) / M);
    const ox = (w - cell * M) / 2;
    const oy = (h - cell * M) / 2;
    ctx.clearRect(0, 0, w, h);
    const cur = A.current;
    for (let y = 0; y < M; y++)
      for (let x = 0; x < M; x++) {
        const v = cur[y * M + x];
        if (v < 0.04) continue;
        ctx.fillStyle = LUT[(v * 255) | 0];
        ctx.fillRect(ox + x * cell, oy + y * cell, cell + 0.6, cell + 0.6);
      }
  }, true);
  return <canvas ref={cref} />;
}
