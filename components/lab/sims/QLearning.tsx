"use client";

/* Q-Learning gridworld — model-free temporal-difference control (Watkins 1989).
 * An ε-greedy agent wanders a maze toward a +1 goal, away from a −1 pit; each
 * step backs up Q(s,a) ← Q + α[r + γ·max_a' Q(s',a') − Q(s,a)]. Value floods
 * outward from the goal and the greedy arrows snap into a coherent flow. */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import {
  Group,
  MiniPlot,
  ReadOut,
  Slider,
  SimLayout,
  Toggle,
  Transport,
} from "../controls";

const G = 8; // grid side
const N = G * G;
const NA = 4; // actions: 0 up, 1 down, 2 left, 3 right
const DX = [0, 0, -1, 1];
const DY = [-1, 1, 0, 0];
const GLYPH = ["▲", "▼", "◀", "▶"];

// cell kinds: . free  # wall  P pit (−1, terminal)  G goal (+1, terminal)
// start at S (a free cell). One pit, one goal, a couple of walls.
const LAYOUT = [
  "S......G",
  ".##.##..",
  ".#...#..",
  ".#.#.#..",
  "...#.#..",
  ".###.#..",
  ".....#P.",
  "........",
].join("");

const WALL = new Uint8Array(N);
const TERMINAL = new Float32Array(N); // reward at terminal, 0 if non-terminal
const IS_TERMINAL = new Uint8Array(N);
let START = 0;
let GOAL = 0;
let PIT = 0;
for (let i = 0; i < N; i++) {
  const c = LAYOUT[i];
  if (c === "#") WALL[i] = 1;
  else if (c === "G") {
    IS_TERMINAL[i] = 1;
    TERMINAL[i] = 1;
    GOAL = i;
  } else if (c === "P") {
    IS_TERMINAL[i] = 1;
    TERMINAL[i] = -1;
    PIT = i;
  } else if (c === "S") START = i;
}

const R_STEP = -0.02; // small living cost → favours shorter paths
const STEP_CAP = 80; // episode length cap

/** intended next state; bumping a wall or edge stays put */
function nextState(s: number, a: number): number {
  const x = s % G,
    y = (s / G) | 0;
  const nx = x + DX[a],
    ny = y + DY[a];
  if (nx < 0 || ny < 0 || nx >= G || ny >= G) return s;
  const ns = ny * G + nx;
  if (WALL[ns]) return s;
  return ns;
}

function argmaxQ(Q: Float32Array, s: number): number {
  const base = s * NA;
  let best = 0,
    bv = Q[base];
  for (let a = 1; a < NA; a++) {
    if (Q[base + a] > bv) {
      bv = Q[base + a];
      best = a;
    }
  }
  return best;
}
function maxQ(Q: Float32Array, s: number): number {
  const base = s * NA;
  let bv = Q[base];
  for (let a = 1; a < NA; a++) if (Q[base + a] > bv) bv = Q[base + a];
  return bv;
}

/** cool→warm value ramp: dark blue → mid blue → warm accent, t in [0,1] */
function heat(t: number): string {
  const u = Math.max(0, Math.min(1, t));
  // three stops: #0a2742 → #2f6fb0 → #ffa251
  const stops = [
    [10, 39, 66],
    [47, 111, 176],
    [255, 162, 81],
  ];
  const seg = u * 2;
  const i = Math.min(1, Math.floor(seg));
  const f = seg - i;
  const a = stops[i],
    b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

type QP = { alpha: number; gamma: number; eps: number; speed: number; arrows: boolean };

export function QLearning(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<QP>({
    alpha: 0.2,
    gamma: 0.95,
    eps: 0.2,
    speed: 60,
    arrows: true,
  });
  const [episode, setEpisode] = useState(0);
  const [stepsEp, setStepsEp] = useState(0);
  const [success, setSuccess] = useState(0);
  const live = useLive(p);
  live.current = p;

  const Q = useRef<Float32Array>(new Float32Array(N * NA));
  const agent = useRef(START);
  const epStepRef = useRef(0);
  const epRetRef = useRef(0); // accumulated return this episode
  const epRef = useRef(0);
  const acc = useRef(0);
  const wins = useRef<number[]>([]); // rolling 1/0 of recent episodes
  const retHist = useRef<number[]>([]); // return per episode

  const [cref, csize] = useCanvas(() => draw());

  /** one Q-learning step; returns true if the episode just ended */
  function stepOnce(): boolean {
    const q = Q.current;
    const P = live.current;
    const s = agent.current;
    // ε-greedy behaviour policy
    const a =
      Math.random() < P.eps ? (Math.random() * NA) | 0 : argmaxQ(q, s);
    const sp = nextState(s, a);
    const term = IS_TERMINAL[sp] === 1;
    const r = term ? TERMINAL[sp] : R_STEP;
    // off-policy TD update; terminal target is just r (no bootstrap)
    const target = term ? r : r + P.gamma * maxQ(q, sp);
    const idx = s * NA + a;
    q[idx] += P.alpha * (target - q[idx]);

    agent.current = sp;
    epStepRef.current++;
    epRetRef.current += r;

    if (term || epStepRef.current >= STEP_CAP) {
      const won = term && sp === GOAL ? 1 : 0;
      wins.current.push(won);
      if (wins.current.length > 50) wins.current.shift();
      retHist.current.push(epRetRef.current);
      if (retHist.current.length > 120) retHist.current.shift();
      epRef.current++;
      agent.current = START;
      epStepRef.current = 0;
      epRetRef.current = 0;
      return true;
    }
    return false;
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const cell = Math.max(8, Math.floor(Math.min(w, h) / G));
    const ox = Math.floor((w - cell * G) / 2);
    const oy = Math.floor((h - cell * G) / 2);
    const q = Q.current;
    const showArrows = live.current.arrows;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    // value range over free cells for a legible heatmap
    let vmin = Infinity,
      vmax = -Infinity;
    for (let i = 0; i < N; i++) {
      if (WALL[i] || IS_TERMINAL[i]) continue;
      const v = maxQ(q, i);
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    if (!isFinite(vmin)) {
      vmin = 0;
      vmax = 0;
    }
    const span = vmax - vmin || 1;

    ctx.font = `${Math.round(cell * 0.42)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < N; i++) {
      const x = i % G,
        y = (i / G) | 0;
      const px = ox + x * cell,
        py = oy + y * cell;
      const cx = px + cell / 2,
        cy = py + cell / 2;

      if (WALL[i]) {
        ctx.fillStyle = "rgba(124,170,228,0.22)";
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        continue;
      }
      if (i === GOAL) {
        ctx.fillStyle = "#ffa251"; // accent-2 (canvas can't read CSS vars)
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        ctx.fillStyle = "#1a0a00";
        ctx.fillText("+1", cx, cy);
        continue;
      }
      if (i === PIT) {
        ctx.fillStyle = "#7a1f29";
        ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        ctx.fillStyle = "#ff9aa3";
        ctx.fillText("−1", cx, cy);
        continue;
      }
      // free cell: value heatmap
      const v = maxQ(q, i);
      ctx.fillStyle = heat((v - vmin) / span);
      ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      // greedy-policy arrow (only once there is signal in this cell)
      if (showArrows && Math.abs(v) > 1e-4) {
        const a = argmaxQ(q, i);
        ctx.fillStyle = "rgba(232,241,255,0.9)";
        ctx.fillText(GLYPH[a], cx, cy);
      }
    }

    // agent marker
    {
      const s = agent.current;
      const cx = ox + (s % G) * cell + cell / 2;
      const cy = oy + ((s / G) | 0) * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, cell * 0.18), 0, 7);
      ctx.fillStyle = "#ff7a1a";
      ctx.fill();
      ctx.strokeStyle = "#061b32";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // grid lines
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= G; gx++) {
      ctx.moveTo(ox + gx * cell + 0.5, oy);
      ctx.lineTo(ox + gx * cell + 0.5, oy + G * cell);
    }
    for (let gy = 0; gy <= G; gy++) {
      ctx.moveTo(ox, oy + gy * cell + 0.5);
      ctx.lineTo(ox + G * cell, oy + gy * cell + 0.5);
    }
    ctx.stroke();
  }

  useRAF((dt) => {
    if (running) {
      acc.current += dt;
      const perSec = live.current.speed;
      let steps = Math.floor((perSec * acc.current) / 1000);
      if (steps > 0) {
        acc.current -= (steps * 1000) / perSec;
        if (steps > 400) steps = 400; // guard against tab-resume bursts
        let ended = false;
        while (steps-- > 0) ended = stepOnce() || ended;
        setEpisode(epRef.current);
        setStepsEp(epStepRef.current);
        const ww = wins.current;
        if (ww.length) {
          let s = 0;
          for (const v of ww) s += v;
          setSuccess(s / ww.length);
        }
      }
    }
    draw();
  }, true);

  function reset() {
    Q.current = new Float32Array(N * NA);
    agent.current = START;
    epStepRef.current = 0;
    epRetRef.current = 0;
    epRef.current = 0;
    wins.current = [];
    retHist.current = [];
    acc.current = 0;
    setEpisode(0);
    setStepsEp(0);
    setSuccess(0);
    draw();
  }

  const rh = retHist.current;
  const rMin = rh.length ? Math.min(...rh) : 0;
  const plot = rh.map((v) => v - rMin); // shift ≥0 so the rising curve reads bottom→top
  const plotMax = Math.max(0.5, (rh.length ? Math.max(...rh) : 1) - rMin);

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            <span style={{ color: "var(--accent-2)" }}>■ goal +1</span>
            &nbsp;&nbsp;
            <span style={{ color: "#ff9aa3" }}>■ pit −1</span>
            &nbsp;&nbsp;
            <span style={{ color: "var(--accent)" }}>● agent</span>
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Learning">
            <Slider
              label="α learning rate"
              value={p.alpha}
              min={0.05}
              max={0.8}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, alpha: v }))}
            />
            <Slider
              label="γ discount"
              value={p.gamma}
              min={0.8}
              max={0.99}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, gamma: v }))}
            />
            <Slider
              label="ε exploration"
              value={p.eps}
              min={0}
              max={0.5}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, eps: v }))}
            />
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={5}
              max={400}
              step={5}
              unit=" step/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="ctl-name">Policy arrows</span>
            <Toggle
              value={p.arrows}
              options={[
                { label: "Show", value: true },
                { label: "Hide", value: false },
              ]}
              onChange={(v) => setP((o) => ({ ...o, arrows: v }))}
            />
          </div>
          <Group title="Return / episode">
            <MiniPlot
              series={[
                {
                  data: plot,
                  color: "var(--accent-2)",
                  fill: "rgba(255,122,69,0.10)",
                },
              ]}
              max={plotMax}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Episode" v={episode} />
          <ReadOut k="Steps" v={stepsEp} color="var(--accent-2)" />
          <ReadOut k="Success" v={`${Math.round(success * 100)}%`} color="var(--green)" />
        </>
      }
      footnote={
        <span>
          Model-free temporal-difference control: with no map of the world, the
          agent backs up Q(s,a)&#8202;←&#8202;Q&#8202;+&#8202;α[r&#8202;+&#8202;γ&#8202;max&#8202;Q(s′,a′)&#8202;−&#8202;Q]
          from lived steps, and value floods outward from the goal via the
          Bellman backup (Watkins 1989; Sutton &amp; Barto).
        </span>
      }
    />
  );
}

export function QLearningThumb(): ReactNode {
  const Q = useRef<Float32Array>(new Float32Array(N * NA));
  const agent = useRef(START);
  const epStep = useRef(0);
  const acc = useRef(0);
  const dim = useRef({ cell: 6, ox: 0, oy: 0 });
  const [cref, csize] = useCanvas((w, h) => {
    const cell = Math.max(3, Math.floor(Math.min(w, h) / G));
    dim.current = {
      cell,
      ox: Math.floor((w - cell * G) / 2),
      oy: Math.floor((h - cell * G) / 2),
    };
  });

  useRAF((dt) => {
    // a brisk fixed learning rate so the heatmap visibly fills in the thumb
    acc.current += dt;
    if (acc.current >= 18) {
      acc.current = 0;
      const q = Q.current;
      for (let k = 0; k < 6; k++) {
        const s = agent.current;
        const a = Math.random() < 0.25 ? (Math.random() * NA) | 0 : argmaxQ(q, s);
        const sp = nextState(s, a);
        const term = IS_TERMINAL[sp] === 1;
        const r = term ? TERMINAL[sp] : -0.02;
        const target = term ? r : r + 0.95 * maxQ(q, sp);
        const idx = s * NA + a;
        q[idx] += 0.3 * (target - q[idx]);
        agent.current = sp;
        epStep.current++;
        if (term || epStep.current >= STEP_CAP) {
          agent.current = START;
          epStep.current = 0;
        }
      }
    }

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cell, ox, oy } = dim.current;
    const q = Q.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    let vmin = Infinity,
      vmax = -Infinity;
    for (let i = 0; i < N; i++) {
      if (WALL[i] || IS_TERMINAL[i]) continue;
      const v = maxQ(q, i);
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    if (!isFinite(vmin)) {
      vmin = 0;
      vmax = 0;
    }
    const span = vmax - vmin || 1;

    for (let i = 0; i < N; i++) {
      const px = ox + (i % G) * cell,
        py = oy + ((i / G) | 0) * cell;
      if (WALL[i]) ctx.fillStyle = "rgba(124,170,228,0.22)";
      else if (i === GOAL) ctx.fillStyle = "#ffa251";
      else if (i === PIT) ctx.fillStyle = "#7a1f29";
      else ctx.fillStyle = heat((maxQ(q, i) - vmin) / span);
      ctx.fillRect(px, py, cell - 1, cell - 1);
    }
    const s = agent.current;
    ctx.beginPath();
    ctx.arc(ox + (s % G) * cell + cell / 2, oy + ((s / G) | 0) * cell + cell / 2, Math.max(1.5, cell * 0.3), 0, 7);
    ctx.fillStyle = "#ff7a1a";
    ctx.fill();
  }, true);

  return <canvas ref={cref} />;
}
