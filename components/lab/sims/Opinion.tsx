"use client";

/* Echo Chambers — bounded-confidence opinion dynamics. N agents each hold a
 * continuous opinion x ∈ [0,1]. Deffuant–Weisbuch: pick a random pair; if they
 * are within the confidence threshold ε they each step μ toward the other,
 * otherwise they ignore each other. Hegselmann–Krause: every agent jumps to the
 * mean of all opinions within ε at once (synchronous, double-buffered). Large ε
 * → one consensus; medium → a few polarized camps; small → many fragments. */
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

type Model = "dw" | "hk";
type OpP = { eps: number; mu: number; n: number; model: Model };

const MAXH = 320; // trajectory / history length
const BANDS = [
  "#9fd0ff",
  "#ff7a1a",
  "#57d6a0",
  "#ffd166",
  "#c77dff",
  "#ff5f6d",
  "#5fe0e0",
  "#f4a3c9",
];

/** uniform random opinions on [0,1] */
function seedOpinions(n: number): Float32Array {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.random();
  return x;
}

/** one DW sweep ≈ N random pairwise interactions */
function sweepDW(x: Float32Array, eps: number, mu: number): void {
  const n = x.length;
  for (let k = 0; k < n; k++) {
    const i = (Math.random() * n) | 0;
    let j = (Math.random() * n) | 0;
    if (i === j) j = (j + 1) % n;
    const d = x[j] - x[i];
    if (Math.abs(d) <= eps) {
      x[i] += mu * d;
      x[j] -= mu * d;
    }
  }
}

/** one synchronous HK step: each agent → mean of all opinions within ε (incl.
 * itself), computed from a read buffer so update order cannot matter */
function stepHK(x: Float32Array, eps: number): number {
  const n = x.length;
  const next = new Float32Array(n);
  let maxChange = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0,
      cnt = 0;
    const xi = x[i];
    for (let j = 0; j < n; j++) {
      if (Math.abs(x[j] - xi) <= eps) {
        sum += x[j];
        cnt++;
      }
    }
    const v = cnt ? sum / cnt : xi;
    next[i] = v;
    const dc = Math.abs(v - xi);
    if (dc > maxChange) maxChange = dc;
  }
  x.set(next);
  return maxChange;
}

/** gap-based clustering on sorted opinions: a cluster breaks where consecutive
 * sorted opinions differ by more than ε. Returns each cluster's size + centre. */
function clusters(
  x: Float32Array,
  eps: number,
): { size: number; centre: number }[] {
  const n = x.length;
  if (n === 0) return [];
  const s = Float32Array.from(x).sort();
  const out: { size: number; centre: number }[] = [];
  let start = 0,
    sum = s[0];
  for (let i = 1; i < n; i++) {
    if (s[i] - s[i - 1] > eps) {
      out.push({ size: i - start, centre: sum / (i - start) });
      start = i;
      sum = 0;
    }
    sum += s[i];
  }
  out.push({ size: n - start, centre: sum / (n - start) });
  return out;
}

export function Opinion(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<OpP>({ eps: 0.22, mu: 0.3, n: 300, model: "dw" });
  const [nClusters, setNClusters] = useState(1);
  const [largest, setLargest] = useState(0);
  const [round, setRound] = useState(0);
  const [settled, setSettled] = useState(false);
  const live = useLive(p);
  live.current = p;

  const op = useRef<Float32Array>(seedOpinions(300));
  const traj = useRef<Float32Array[]>([]); // ring of opinion snapshots
  const cl = useRef<{ size: number; centre: number }[]>([]);
  const cHist = useRef<number[]>([]);
  const acc = useRef(0);
  const roundRef = useRef(0);

  const [cref, csize] = useCanvas(() => draw());

  function snapshot() {
    traj.current.push(Float32Array.from(op.current));
    if (traj.current.length > MAXH) traj.current.shift();
  }

  function recompute() {
    const c = clusters(op.current, live.current.eps);
    cl.current = c;
    const n = op.current.length;
    let big = 0;
    for (const k of c) if (k.size > big) big = k.size;
    setNClusters(c.length);
    setLargest(n ? big / n : 0);
    cHist.current.push(c.length);
    if (cHist.current.length > MAXH) cHist.current.shift();
  }

  function reseed() {
    op.current = seedOpinions(live.current.n);
    traj.current = [];
    cHist.current = [];
    roundRef.current = 0;
    setRound(0);
    setSettled(false);
    snapshot();
    recompute();
    draw();
  }

  // advance the model on a fixed cadence so the braid reads at a watchable pace
  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const interval = 60; // ms per sweep / HK step
    let did = false;
    let frozen = false;
    while (acc.current >= interval) {
      acc.current -= interval;
      if (live.current.model === "hk") {
        const change = stepHK(op.current, live.current.eps);
        if (change < 1e-4) frozen = true;
      } else {
        sweepDW(op.current, live.current.eps, live.current.mu);
      }
      roundRef.current++;
      did = true;
    }
    if (!did) return;
    snapshot();
    recompute();
    setRound(roundRef.current);
    draw();
    if (frozen) {
      setSettled(true);
      setRunning(false);
    }
  }, true);

  useEffect(() => {
    reseed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** colour an opinion by which converged cluster centre it sits nearest */
  function bandColor(v: number): string {
    const c = cl.current;
    if (c.length <= 1) return BANDS[0];
    let bi = 0,
      bd = Infinity;
    for (let k = 0; k < c.length; k++) {
      const d = Math.abs(v - c[k].centre);
      if (d < bd) {
        bd = d;
        bi = k;
      }
    }
    return BANDS[bi % BANDS.length];
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    const pad = 14;
    const stacked = w <= 620;
    const histW = stacked ? w - pad * 2 : Math.max(96, Math.round(w * 0.26));
    const tlX = pad,
      tlY = pad,
      tlW = (stacked ? w - pad * 2 : w - histW - pad * 3) - 0,
      tlH = h - pad * 2;

    // ---- TRAJECTORY TIMELINE (river delta) ----
    frame(ctx, tlX, tlY, tlW, tlH, "OPINION  vs  TIME");
    // horizontal grid lines at 0 / .5 / 1
    ctx.strokeStyle = "rgba(124,170,228,0.10)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const yy = tlY + (g / 4) * tlH;
      ctx.beginPath();
      ctx.moveTo(tlX, yy);
      ctx.lineTo(tlX + tlW, yy);
      ctx.stroke();
    }
    const T = traj.current;
    const tn = T.length;
    if (tn >= 2) {
      const n = T[tn - 1].length;
      const px = (i: number) => tlX + (i / (MAXH - 1)) * tlW;
      const py = (v: number) => tlY + tlH - v * tlH;
      const last = T[tn - 1];
      // sub-sample agents when N is large to keep the braid legible & cheap
      const stride = n > 220 ? 2 : 1;
      ctx.lineWidth = 1;
      for (let a = 0; a < n; a += stride) {
        const col = bandColor(last[a]);
        ctx.strokeStyle = withAlpha(col, 0.28);
        ctx.beginPath();
        for (let t = 0; t < tn; t++) {
          const x = px(MAXH - tn + t),
            y = py(T[t][a]);
          if (t) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    // axis ticks
    ctx.fillStyle = "rgba(176,203,244,0.5)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("1.0", tlX + 4, tlY + 11);
    ctx.fillText("0.0", tlX + 4, tlY + tlH - 4);
    ctx.fillText("TIME →", tlX + tlW - 46, tlY + tlH - 4);

    // ---- LIVE HISTOGRAM (distribution collapsing to spikes) ----
    let hX: number, hY: number, hW: number, hH: number;
    if (stacked) {
      // overlay a slim strip across the bottom when narrow
      hX = pad;
      hY = h - pad - 60;
      hW = w - pad * 2;
      hH = 56;
    } else {
      hX = tlX + tlW + pad;
      hY = pad;
      hW = histW;
      hH = h - pad * 2;
    }
    frame(ctx, hX, hY, hW, hH, "DISTRIBUTION");
    const cur = op.current;
    const BINS = 40;
    const bins = new Float32Array(BINS);
    for (let i = 0; i < cur.length; i++) {
      let b = (cur[i] * BINS) | 0;
      if (b >= BINS) b = BINS - 1;
      if (b < 0) b = 0;
      bins[b]++;
    }
    let bmax = 1;
    for (let b = 0; b < BINS; b++) if (bins[b] > bmax) bmax = bins[b];
    // horizontal bars, opinion on the vertical axis to align with the timeline
    const barH = hH / BINS;
    for (let b = 0; b < BINS; b++) {
      const v = bins[b];
      if (v === 0) continue;
      const frac = v / bmax;
      const opVal = (b + 0.5) / BINS;
      ctx.fillStyle = withAlpha(bandColor(opVal), 0.85);
      const yy = hY + hH - (b + 1) * barH;
      ctx.fillRect(hX + 1, yy + 0.5, frac * (hW - 2), barH - 0.6);
    }

    // cluster centroid guide-lines spanning both panels
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    for (const k of cl.current) {
      ctx.strokeStyle = withAlpha(bandColor(k.centre), 0.5);
      const yy = tlY + tlH - k.centre * tlH;
      ctx.beginPath();
      ctx.moveTo(tlX, yy);
      ctx.lineTo(tlX + tlW, yy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function frame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
  ): void {
    ctx.strokeStyle = "rgba(196,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText(title, x + 6, y + 12);
  }

  const cPlot = cHist.current;
  const cMax = Math.max(4, ...cPlot);

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reseed}
        >
          <Btn onClick={reseed}>Reseed</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            {settled
              ? "Settled ✓"
              : nClusters === 1
                ? "Consensus"
                : nClusters === 2
                  ? "Polarized"
                  : `${nClusters} fragments`}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Mechanism">
            <Toggle<Model>
              value={p.model}
              options={[
                { label: "Deffuant", value: "dw" },
                { label: "Hegselmann–Krause", value: "hk" },
              ]}
              onChange={(v) => {
                setP((o) => ({ ...o, model: v }));
                setSettled(false);
                setRunning(true);
              }}
            />
          </Group>
          <Group title="Bounded confidence">
            <Slider
              label="Confidence ε"
              value={p.eps}
              min={0.05}
              max={0.5}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => {
                setP((o) => ({ ...o, eps: v }));
                setSettled(false);
                setRunning(true);
              }}
            />
            {p.model === "dw" && (
              <Slider
                label="Convergence μ"
                value={p.mu}
                min={0.1}
                max={0.5}
                step={0.01}
                fmt={(v) => v.toFixed(2)}
                onChange={(v) => setP((o) => ({ ...o, mu: v }))}
              />
            )}
          </Group>
          <Group title="Population">
            <Slider
              label="Agents N"
              value={p.n}
              min={100}
              max={600}
              step={50}
              onChange={(v) => setP((o) => ({ ...o, n: v }))}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={reseed}>Reseed</Btn>
            </div>
          </Group>
          <Group title="Clusters">
            <MiniPlot
              series={[
                {
                  data: cPlot,
                  color: "var(--accent-2)",
                  fill: "rgba(255,122,69,0.10)",
                },
              ]}
              max={cMax}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Clusters" v={nClusters} color="var(--accent-2)" />
          <ReadOut k="Largest" v={`${Math.round(largest * 100)}%`} />
          <ReadOut k="Round" v={round} />
        </>
      }
      footnote={
        <span>
          When people only listen to others already close to their own view, a
          population splits into stable echo chambers. Whether the crowd reaches
          consensus, hardens into two camps, or shatters into many fragments
          hinges on a single tolerance ε (Deffuant 2000; Hegselmann–Krause 2002).
        </span>
      }
    />
  );
}

/** apply an alpha to a hex or var() colour, falling back to rgba wrapping */
function withAlpha(c: string, a: number): string {
  if (c.startsWith("#") && c.length === 7) {
    const r = parseInt(c.slice(1, 3), 16),
      g = parseInt(c.slice(3, 5), 16),
      b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return c;
}

export function OpinionThumb(): ReactNode {
  const op = useRef<Float32Array>(seedOpinions(160));
  const traj = useRef<Float32Array[]>([]);
  const acc = useRef(0);
  const ticks = useRef(0);
  const TH = 80;

  const [cref, csize] = useCanvas();

  function reseed() {
    op.current = seedOpinions(160);
    traj.current = [];
    ticks.current = 0;
  }

  useEffect(() => {
    traj.current.push(Float32Array.from(op.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRAF((dt) => {
    acc.current += dt;
    if (acc.current >= 70) {
      acc.current = 0;
      sweepDW(op.current, 0.18, 0.3);
      traj.current.push(Float32Array.from(op.current));
      if (traj.current.length > TH) traj.current.shift();
      ticks.current++;
      if (ticks.current > 150) reseed();
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    const T = traj.current;
    const tn = T.length;
    if (tn < 2) return;
    const n = T[tn - 1].length;
    const cols = clusters(T[tn - 1], 0.18);
    const colorOf = (v: number): string => {
      if (cols.length <= 1) return "rgba(159,208,255,0.5)";
      let bi = 0,
        bd = Infinity;
      for (let k = 0; k < cols.length; k++) {
        const d = Math.abs(v - cols[k].centre);
        if (d < bd) {
          bd = d;
          bi = k;
        }
      }
      return withAlpha(BANDS[bi % BANDS.length], 0.5);
    };
    const last = T[tn - 1];
    ctx.lineWidth = 1;
    for (let a = 0; a < n; a += 2) {
      ctx.strokeStyle = colorOf(last[a]);
      ctx.beginPath();
      for (let t = 0; t < tn; t++) {
        const x = (t / (TH - 1)) * w,
          y = h - T[t][a] * h;
        if (t) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }, true);

  return <canvas ref={cref} />;
}
