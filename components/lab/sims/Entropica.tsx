"use client";

/* Causal entropic forcing (Wissner-Gross & Freer, 2013). A particle with no
 * goal. Each step it samples many random futures down a set of candidate
 * directions and moves toward the one whose reachable endpoints are most spread
 * out — it maximizes the entropy of its accessible futures. From a corner of an
 * open box it drifts to the open centre; with obstacles it routes around traps.
 * Goal-like behaviour (seek openness, avoid dead ends) emerges from a single
 * principle: keep your options open. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import {
  Btn,
  Group,
  MiniPlot,
  ReadOut,
  Slider,
  SimLayout,
  Toggle,
  Transport,
} from "../controls";

const M = 12; // candidate directions probed each decision
const G = 8; // GxG bins for the future-position histogram
const STEP = 0.03; // rollout step length (normalized units)
const MOVE = 0.012; // actual particle step toward the freest direction
const LO = 0.02;
const HI = 0.98;
const CORNER: [number, number] = [0.08, 0.08];

type Vec = [number, number];
type Rect = { x: number; y: number; w: number; h: number }; // normalized
type EntP = { horizon: number; rollouts: number; obstacles: boolean };

// a couple of wall rectangles forming a trap/pocket near the centre
const WALLS: Rect[] = [
  { x: 0.4, y: 0.18, w: 0.07, h: 0.42 },
  { x: 0.4, y: 0.18, w: 0.34, h: 0.07 },
  { x: 0.67, y: 0.18, w: 0.07, h: 0.5 },
];

function inWall(x: number, y: number): boolean {
  for (const r of WALLS)
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  return false;
}

/** clamp to the box, and (when obstacles on) refuse to enter a wall: a blocked
 * axis keeps its previous value, so walls shrink the reachable spread nearby */
function clampToFree(px: number, py: number, fx: number, fy: number, obs: boolean): Vec {
  let nx = Math.min(HI, Math.max(LO, fx));
  let ny = Math.min(HI, Math.max(LO, fy));
  if (obs && inWall(nx, ny)) {
    if (!inWall(nx, py)) ny = py; // slide along x
    else if (!inWall(px, ny)) nx = px; // slide along y
    else {
      nx = px;
      ny = py;
    }
  }
  return [nx, ny];
}

const TWO_PI = Math.PI * 2;

/** Shannon entropy −Σ q ln q of a count histogram (q = count / total) */
function entropy(counts: Int32Array, total: number): number {
  if (total <= 0) return 0;
  let e = 0;
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c > 0) {
      const q = c / total;
      e -= q * Math.log(q);
    }
  }
  return e;
}

/** For a starting point, score every candidate direction by the entropy of its
 * Monte-Carlo future endpoints; also return the endpoints of the best one so
 * the UI can render the "imagined" cloud. */
function evaluate(
  px: number,
  py: number,
  H: number,
  K: number,
  obs: boolean,
): { dir: Vec; best: number; cloud: number[]; all: number[] } {
  let bestDir: Vec = [1, 0];
  let bestEnt = -1;
  let bestCloud: number[] = [];
  const all: number[] = [];
  const counts = new Int32Array(G * G);
  const cloud = new Float64Array(K * 2);
  for (let m = 0; m < M; m++) {
    const a = (m / M) * TWO_PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    counts.fill(0);
    for (let k = 0; k < K; k++) {
      // first step commits to this direction, then a random walk
      let [rx, ry] = clampToFree(px, py, px + dx * STEP, py + dy * STEP, obs);
      for (let h = 1; h < H; h++) {
        const ra = Math.random() * TWO_PI;
        const nf = clampToFree(rx, ry, rx + Math.cos(ra) * STEP, ry + Math.sin(ra) * STEP, obs);
        rx = nf[0];
        ry = nf[1];
      }
      const gx = Math.min(G - 1, (rx * G) | 0);
      const gy = Math.min(G - 1, (ry * G) | 0);
      counts[gy * G + gx]++;
      cloud[k * 2] = rx;
      cloud[k * 2 + 1] = ry;
      if (m % 3 === 0) {
        all.push(rx, ry); // a thinned sample across directions
      }
    }
    const e = entropy(counts, K);
    if (e > bestEnt) {
      bestEnt = e;
      bestDir = [dx, dy];
      bestCloud = Array.from(cloud.subarray(0, K * 2));
    }
  }
  return { dir: bestDir, best: bestEnt, cloud: bestCloud, all };
}

export function Entropica(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<EntP>({ horizon: 25, rollouts: 40, obstacles: false });
  const [free, setFree] = useState(0);
  const [step, setStep] = useState(0);
  const live = useLive(p);
  live.current = p;

  const pos = useRef<Vec>([...CORNER] as Vec);
  const trail = useRef<Vec[]>([]);
  const cloud = useRef<number[]>([]); // best-direction endpoints (bright-ish)
  const ambient = useRef<number[]>([]); // thinned all-direction sample (faint)
  const dim = useRef({ s: 320, ox: 0, oy: 0 }); // square stage placement
  const stepRef = useRef(0);
  const freeHist = useRef<number[]>([]);

  const [cref, csize] = useCanvas((w, h) => {
    const s = Math.min(w, h);
    dim.current = { s, ox: Math.floor((w - s) / 2), oy: Math.floor((h - s) / 2) };
    draw();
  });

  function toPx(nx: number, ny: number): Vec {
    const { s, ox, oy } = dim.current;
    return [ox + nx * s, oy + ny * s];
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { s, ox, oy } = dim.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    // blueprint grid inside the arena
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const div = 10;
    for (let i = 0; i <= div; i++) {
      const gx = ox + (i / div) * s;
      const gy = oy + (i / div) * s;
      ctx.moveTo(gx + 0.5, oy);
      ctx.lineTo(gx + 0.5, oy + s);
      ctx.moveTo(ox, gy + 0.5);
      ctx.lineTo(ox + s, gy + 0.5);
    }
    ctx.stroke();

    // obstacles
    if (live.current.obstacles) {
      ctx.fillStyle = "#2f5f99";
      for (const r of WALLS)
        ctx.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s);
    }

    // imagined futures: faint ambient sample, then the chosen-direction cloud
    ctx.fillStyle = "rgba(232,241,255,0.05)";
    const amb = ambient.current;
    for (let i = 0; i < amb.length; i += 2) {
      const [cx, cy] = toPx(amb[i], amb[i + 1]);
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
    ctx.fillStyle = "rgba(232,241,255,0.16)";
    const cl = cloud.current;
    for (let i = 0; i < cl.length; i += 2) {
      const [cx, cy] = toPx(cl[i], cl[i + 1]);
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }

    // short fading trail
    const tr = trail.current;
    ctx.lineWidth = 1.5;
    for (let i = 1; i < tr.length; i++) {
      const [ax, ay] = toPx(tr[i - 1][0], tr[i - 1][1]);
      const [bx, by] = toPx(tr[i][0], tr[i][1]);
      ctx.strokeStyle = `rgba(255,122,69,${(i / tr.length) * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // the particle, bright on top
    const [pxp, pyp] = toPx(pos.current[0], pos.current[1]);
    ctx.beginPath();
    ctx.arc(pxp, pyp, 5, 0, TWO_PI);
    ctx.fillStyle = "var(--accent-2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,122,69,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(pxp, pyp, 9, 0, TWO_PI);
    ctx.stroke();
  }

  function decide(): void {
    const { horizon, rollouts, obstacles } = live.current;
    const [px, py] = pos.current;
    const r = evaluate(px, py, horizon, rollouts, obstacles);
    cloud.current = r.cloud;
    ambient.current = r.all;
    const nf = clampToFree(px, py, px + r.dir[0] * MOVE, py + r.dir[1] * MOVE, obstacles);
    pos.current = nf;
    trail.current.push(nf);
    if (trail.current.length > 90) trail.current.shift();
    stepRef.current++;
    setFree(r.best);
    setStep(stepRef.current);
    freeHist.current.push(r.best);
    if (freeHist.current.length > 140) freeHist.current.shift();
  }

  function reset(): void {
    pos.current = [...CORNER] as Vec;
    trail.current = [pos.current];
    cloud.current = [];
    ambient.current = [];
    stepRef.current = 0;
    setStep(0);
    setFree(0);
    freeHist.current = [];
    draw();
  }

  /** drop the particle in a random corner */
  function dropCorner(): void {
    const cx = Math.random() < 0.5 ? 0.08 : 0.92;
    const cy = Math.random() < 0.5 ? 0.08 : 0.92;
    pos.current = clampToFree(cx, cy, cx, cy, live.current.obstacles);
    trail.current = [pos.current];
    cloud.current = [];
    ambient.current = [];
    stepRef.current = 0;
    setStep(0);
    setFree(0);
    freeHist.current = [];
    draw();
  }

  useRAF(() => {
    if (!running) return;
    decide();
    draw();
  }, true);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // entropy of a uniform GxG histogram = ln(G²); use it to scale the plot
  const MAXENT = Math.log(G * G);
  const plot = freeHist.current;

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <Btn onClick={dropCorner}>Drop in corner</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">no goal — only futures</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Foresight">
            <Slider
              label="Horizon τ"
              value={p.horizon}
              min={10}
              max={40}
              step={1}
              unit=" steps"
              onChange={(v) => setP((o) => ({ ...o, horizon: v }))}
            />
            <Slider
              label="Rollouts K"
              value={p.rollouts}
              min={20}
              max={80}
              step={1}
              unit="/dir"
              onChange={(v) => setP((o) => ({ ...o, rollouts: v }))}
            />
          </Group>
          <Group title="Arena">
            <Toggle
              value={p.obstacles}
              options={[
                { label: "Open box", value: false },
                { label: "Obstacles", value: true },
              ]}
              onChange={(v) => {
                setP((o) => ({ ...o, obstacles: v }));
                reset();
              }}
            />
          </Group>
          <Group title="Future entropy">
            <MiniPlot
              series={[
                { data: plot, color: "var(--accent-2)", fill: "rgba(255,122,69,0.10)" },
              ]}
              max={MAXENT}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Future entropy" v={free.toFixed(2)} color="var(--accent-2)" />
          <ReadOut k="Max" v={MAXENT.toFixed(2)} />
          <ReadOut k="Step" v={step} />
        </>
      }
      footnote={
        <span>
          No goal is given. Each step the particle samples random futures down{" "}
          {M} directions and moves toward the one whose reachable endpoints are
          most spread out — maximizing the entropy of its accessible futures.
          Seeking open space and routing around traps emerge from that single
          principle: &ldquo;causal entropic forces&rdquo; (Wissner-Gross &amp;
          Freer, 2013). This is a coarse Monte-Carlo approximation of the
          principle, which is itself debated as a model of intelligence.
        </span>
      }
    />
  );
}

export function EntropicaThumb(): ReactNode {
  const pos = useRef<Vec>([0.1, 0.1]);
  const trail = useRef<Vec[]>([]);
  const cloud = useRef<number[]>([]);
  const dim = useRef({ s: 80, ox: 0, oy: 0 });
  const acc = useRef(0);
  const ticks = useRef(0);

  const [cref, csize] = useCanvas((w, h) => {
    const s = Math.min(w, h);
    dim.current = { s, ox: Math.floor((w - s) / 2), oy: Math.floor((h - s) / 2) };
  });

  function respawn() {
    const cx = Math.random() < 0.5 ? 0.1 : 0.9;
    const cy = Math.random() < 0.5 ? 0.1 : 0.9;
    pos.current = [cx, cy];
    trail.current = [pos.current];
    ticks.current = 0;
  }

  useEffect(() => {
    respawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 70) return;
    acc.current = 0;
    const [px, py] = pos.current;
    const r = evaluate(px, py, 16, 22, false);
    cloud.current = r.cloud;
    const nf = clampToFree(px, py, px + r.dir[0] * MOVE, py + r.dir[1] * MOVE, false);
    pos.current = nf;
    trail.current.push(nf);
    if (trail.current.length > 40) trail.current.shift();
    ticks.current++;
    if (ticks.current > 120) respawn();

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { s, ox, oy } = dim.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(232,241,255,0.10)";
    const cl = cloud.current;
    for (let i = 0; i < cl.length; i += 2)
      ctx.fillRect(ox + cl[i] * s - 1, oy + cl[i + 1] * s - 1, 2, 2);
    const tr = trail.current;
    ctx.strokeStyle = "rgba(255,122,69,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < tr.length; i++) {
      const x = ox + tr[i][0] * s;
      const y = oy + tr[i][1] * s;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox + pos.current[0] * s, oy + pos.current[1] * s, 4, 0, TWO_PI);
    ctx.fillStyle = "var(--accent-2)";
    ctx.fill();
  }, true);

  return <canvas ref={cref} />;
}
