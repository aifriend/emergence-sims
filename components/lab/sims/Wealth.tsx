"use client";

/* Wealth & Inequality — econophysics kinetic-exchange.
 * N agents start with equal money; each step picks two at random and trades
 * under a "fair" conservative rule. Random-split (Dragulescu–Yakovenko) relaxes
 * to an exponential (Gini→0.5); the yard-sale rule condenses wealth onto one
 * agent (Gini→1) unless redistribution skims it back. Total money is conserved. */
import { useEffect, useRef, useState } from "react";
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

const N = 400; // agents
const W0 = 1; // initial wealth each → total W = N (conserved)
const YS_F = 0.2; // yard-sale stake fraction of the poorer agent

type Model = "split" | "yardsale";
type WealthP = { model: Model; lambda: number; tax: number; speed: number };

/** Gini on an already-sorted ascending array, O(N):
 *  G = (Σ_i (2i − N + 1)·w_i) / (N·Σ w_i), i = 0..N−1.
 *  Algebraically identical to (Σ_i Σ_j |w_i−w_j|)/(2N·Σw). */
function gini(sorted: Float64Array): number {
  let sum = 0;
  let weighted = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i];
    weighted += (2 * i - N + 1) * sorted[i];
  }
  if (sum <= 0) return 0;
  return Math.max(0, Math.min(1, weighted / (N * sum)));
}

/** cumulative share held by the richest 10% (sorted ascending) */
function topShare(sorted: Float64Array, frac: number): number {
  let total = 0;
  for (let i = 0; i < sorted.length; i++) total += sorted[i];
  if (total <= 0) return 0;
  const start = Math.floor(N * (1 - frac));
  let top = 0;
  for (let i = start; i < sorted.length; i++) top += sorted[i];
  return top / total;
}

/** one transaction under the active rule (mutates w in place, conserves total) */
function transact(w: Float64Array, P: WealthP): void {
  let i = (Math.random() * N) | 0;
  let j = (Math.random() * N) | 0;
  if (i === j) j = (j + 1) % N;
  if (P.model === "split") {
    // Dragulescu–Yakovenko, optionally shielding a fraction λ from the pool.
    const eps = Math.random();
    const pool = w[i] + w[j];
    const delta = (1 - P.lambda) * (eps * pool - w[i]);
    w[i] += delta;
    w[j] -= delta;
  } else {
    // Yard-sale: wager a fraction of the poorer holding on a fair coin.
    const stake = YS_F * Math.min(w[i], w[j]);
    if (Math.random() < 0.5) {
      w[i] += stake;
      w[j] -= stake;
    } else {
      w[i] -= stake;
      w[j] += stake;
    }
  }
}

/** flat redistribution toward the mean: w ← (1−τ)·w + τ·⟨w⟩ */
function redistribute(w: Float64Array, tax: number): void {
  if (tax <= 0) return;
  const mean = W0; // total is conserved so ⟨w⟩ stays W0
  for (let i = 0; i < N; i++) w[i] = (1 - tax) * w[i] + tax * mean;
}

export function Wealth(): ReactNode {
  const [running, setRunning] = useState(false);
  const [p, setP] = useState<WealthP>({
    model: "yardsale",
    lambda: 0,
    tax: 0,
    speed: 4000,
  });
  const [stats, setStats] = useState({ gini: 0, top: 0, round: 0 });
  const live = useLive(p);
  live.current = p;

  const w = useRef<Float64Array>(new Float64Array(N).fill(W0));
  const sorted = useRef<Float64Array>(new Float64Array(N));
  const acc = useRef(0);
  const trades = useRef(0);
  const gHist = useRef<number[]>([]);

  const [cref, csize] = useCanvas(() => draw());

  function recompute() {
    const s = sorted.current;
    s.set(w.current);
    s.sort();
    return { g: gini(s), t: topShare(s, 0.1) };
  }

  function reset() {
    w.current.fill(W0);
    acc.current = 0;
    trades.current = 0;
    gHist.current = [];
    setStats({ gini: 0, top: 0.1, round: 0 });
    draw();
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w: W, h: H } = csize.current;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, W, H);

    const pad = 16;
    const x0 = pad;
    const y0 = pad;
    const plotW = W - pad * 2;
    const plotH = H - pad * 2;

    // frame
    ctx.strokeStyle = "rgba(196,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, plotW, plotH);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("WEALTH  (poorest → richest)", x0 + 6, y0 + 12);

    // horizontal gridlines
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    for (let g = 1; g < 4; g++) {
      const yy = y0 + (g / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + plotW, yy);
      ctx.stroke();
    }

    const s = sorted.current;
    let maxW = 0;
    for (let i = 0; i < N; i++) if (s[i] > maxW) maxW = s[i];
    if (maxW <= 0) maxW = 1;

    // sorted wealth bars
    const bw = plotW / N;
    ctx.fillStyle = "#e8f1ff";
    for (let i = 0; i < N; i++) {
      const bh = (s[i] / maxW) * (plotH - 4);
      ctx.fillRect(x0 + i * bw, y0 + plotH - bh, Math.max(0.6, bw - 0.4), bh);
    }

    // mean reference line (= W0, the conserved per-capita wealth)
    const meanY = y0 + plotH - (W0 / maxW) * (plotH - 4);
    ctx.strokeStyle = "var(--accent-2)";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, meanY);
    ctx.lineTo(x0 + plotW, meanY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "var(--accent-2)";
    ctx.fillText("mean", x0 + plotW - 30, Math.max(y0 + 20, meanY - 4));
  }

  useRAF((dt) => {
    if (!running) return;
    const P = live.current;
    acc.current += dt;
    let count = Math.floor((P.speed * acc.current) / 1000);
    if (count <= 0) return;
    acc.current -= (count * 1000) / P.speed;
    count = Math.min(count, 40000); // cap a single frame's work
    const arr = w.current;
    for (let k = 0; k < count; k++) transact(arr, P);
    if (P.tax > 0) redistribute(arr, P.tax);
    trades.current += count;

    const { g, t } = recompute();
    gHist.current.push(g);
    if (gHist.current.length > 160) gHist.current.shift();
    setStats({ gini: g, top: t, round: trades.current });
    draw();
  }, true);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSplit = p.model === "split";

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
            {isSplit ? "→ exponential" : "→ condensation"}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Exchange rule">
            <Toggle
              value={p.model}
              options={[
                { label: "Random split", value: "split" },
                { label: "Yard-sale", value: "yardsale" },
              ]}
              onChange={(v) =>
                setP((o) => ({ ...o, model: v as Model }))
              }
            />
          </Group>
          <Group title="Behaviour">
            <Slider
              label={isSplit ? "Savings λ" : "Savings λ (split only)"}
              value={p.lambda}
              min={0}
              max={0.9}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, lambda: v }))}
            />
            <Slider
              label="Redistribution τ"
              value={p.tax}
              min={0}
              max={0.05}
              step={0.0025}
              fmt={(v) => (v * 100).toFixed(2)}
              unit="%/step"
              onChange={(v) => setP((o) => ({ ...o, tax: v }))}
            />
          </Group>
          <Group title="Simulation">
            <Slider
              label="Speed"
              value={p.speed}
              min={200}
              max={20000}
              step={200}
              fmt={(v) => Math.round(v)}
              unit=" tx/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Gini over time">
            <MiniPlot
              series={[
                {
                  data: gHist.current,
                  color: "var(--accent-2)",
                  fill: "rgba(255,162,81,0.10)",
                },
              ]}
              max={1}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut
            k="Gini"
            v={stats.gini.toFixed(3)}
            color="var(--accent-2)"
          />
          <ReadOut k="Top 10%" v={`${Math.round(stats.top * 100)}%`} />
          <ReadOut k="Trades" v={stats.round.toLocaleString()} />
        </>
      }
      footnote={
        <span>
          {N} agents start with identical wealth and trade at random, every deal
          fair and money-conserving — yet inequality emerges anyway. The
          stationary distribution depends only on the rule: random reshuffling
          gives a Boltzmann–Gibbs exponential (Gini ≈ 0.5; Dragulescu–Yakovenko
          2000), while the yard-sale wager condenses nearly all wealth onto one
          agent (Gini → 1; Chakraborti) until redistribution arrests it.
        </span>
      }
    />
  );
}

export function WealthThumb(): ReactNode {
  const w = useRef<Float64Array>(new Float64Array(N).fill(W0));
  const sorted = useRef<Float64Array>(new Float64Array(N));
  const t = useRef(0);
  const [cref, csize] = useCanvas();

  function reseed() {
    w.current.fill(W0);
  }

  useEffect(() => {
    reseed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRAF((dt) => {
    t.current += dt;
    const arr = w.current;
    // yard-sale dynamics for a visceral condensing histogram
    for (let k = 0; k < 600; k++) {
      let i = (Math.random() * N) | 0;
      let j = (Math.random() * N) | 0;
      if (i === j) j = (j + 1) % N;
      const stake = YS_F * Math.min(arr[i], arr[j]);
      if (Math.random() < 0.5) {
        arr[i] += stake;
        arr[j] -= stake;
      } else {
        arr[i] -= stake;
        arr[j] += stake;
      }
    }
    if (t.current > 6000) {
      t.current = 0;
      reseed();
    }

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w: W, h: H } = csize.current;
    ctx.clearRect(0, 0, W, H);
    const s = sorted.current;
    s.set(arr);
    s.sort();
    let maxW = 0;
    for (let i = 0; i < N; i++) if (s[i] > maxW) maxW = s[i];
    if (maxW <= 0) maxW = 1;
    const bw = W / N;
    ctx.fillStyle = "rgba(232,241,255,0.92)";
    for (let i = 0; i < N; i++) {
      const bh = (s[i] / maxW) * H;
      ctx.fillRect(i * bw, H - bh, Math.max(0.6, bw - 0.3), bh);
    }
  }, true);

  return <canvas ref={cref} />;
}
