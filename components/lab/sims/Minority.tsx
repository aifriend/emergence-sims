"use client";

/* Minority Game / El Farol bar problem — bounded rationality.
 * N selfish agents, no communication. Each holds S fixed lookup tables mapping
 * the shared m-bit history of past minority sides to an action {0,1}. Every
 * round each agent plays its current best-scoring table; the MINORITY side wins.
 * All tables are then virtually re-scored by whether they'd have called the
 * winner. Attendance on side 1 self-organizes around N/2 — no one aims for it. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import {
  Group,
  MiniPlot,
  ReadOut,
  Slider,
  SimLayout,
  Transport,
} from "../controls";

const BG = "#061b32";
const LINE = "#e8f1ff";
const GRID = "rgba(124,170,228,0.12)";
const TRACE = "#9fd0ff";
const MAXH = 320; // attendance points kept on stage
const VAR_TAIL = 256; // window for the stationary-tail variance

type MinP = { m: number; s: number; n: number; speed: number };

/** the agent society: per-agent strategy tables + virtual scores + bookkeeping */
type Society = {
  n: number;
  m: number;
  s: number;
  H: number; // 2^m history states
  tables: Uint8Array; // [n * s * H] action bits (0/1), fixed for life
  scores: Int32Array; // [n * s] virtual points
  hist: number; // current m-bit history, in [0, H)
};

/** force odd so the minority is always strictly defined */
function odd(n: number): number {
  return n % 2 === 0 ? n + 1 : n;
}

/** draw a fresh society: random tables (frozen), zero scores, random history */
function buildSociety(m: number, s: number, nRaw: number): Society {
  const n = odd(nRaw);
  const H = 1 << m;
  const tables = new Uint8Array(n * s * H);
  for (let i = 0; i < tables.length; i++) tables[i] = Math.random() < 0.5 ? 0 : 1;
  return {
    n,
    m,
    s,
    H,
    tables,
    scores: new Int32Array(n * s),
    hist: (Math.random() * H) | 0,
  };
}

/** one Minority Game round → attendance A on side 1. Mutates scores + history. */
function step(soc: Society): number {
  const { n, s, H, tables, scores } = soc;
  const h = soc.hist;
  let a = 0; // count choosing side 1
  // each agent plays the action of its current best-scoring strategy
  for (let i = 0; i < n; i++) {
    const base = i * s;
    let best = 0;
    let bestScore = scores[base];
    let ties = 1;
    for (let k = 1; k < s; k++) {
      const sc = scores[base + k];
      if (sc > bestScore) {
        bestScore = sc;
        best = k;
        ties = 1;
      } else if (sc === bestScore) {
        // reservoir tie-break: pick uniformly among equal-best strategies
        ties++;
        if (Math.random() * ties < 1) best = k;
      }
    }
    a += tables[(base + best) * H + h];
  }
  // minority side wins (N odd ⇒ no exact tie at N/2)
  const win = a * 2 > n ? 0 : 1;
  // VIRTUAL scoring: reward EVERY table by what it WOULD have predicted
  for (let i = 0; i < n; i++) {
    const base = i * s;
    for (let k = 0; k < s; k++) {
      const pred = tables[(base + k) * H + h];
      scores[base + k] += pred === win ? 1 : -1;
    }
  }
  // shift the winning side into the shared history
  soc.hist = ((h << 1) | win) & (H - 1);
  return a;
}

/** variance of the last `tail` attendance samples (the stationary window) */
function tailVariance(buf: number[], tail: number): number {
  const k = Math.min(tail, buf.length);
  if (k < 2) return 0;
  const start = buf.length - k;
  let mean = 0;
  for (let i = start; i < buf.length; i++) mean += buf[i];
  mean /= k;
  let v = 0;
  for (let i = start; i < buf.length; i++) {
    const d = buf[i] - mean;
    v += d * d;
  }
  return v / k;
}

export function Minority(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<MinP>({ m: 3, s: 2, n: 101, speed: 6 });
  const [readout, setReadout] = useState({ att: 50, vol: 0, round: 0 });
  const live = useLive(p);
  live.current = p;

  const soc = useRef<Society>(buildSociety(p.m, p.s, p.n));
  const att = useRef<number[]>([]); // full attendance trace (capped at MAXH)
  const varBuf = useRef<number[]>([]); // attendance for tail variance
  const round = useRef(0);

  const [cref, csize] = useCanvas(() => draw());

  /** redraw a fresh random society and clear all traces */
  function rebuild() {
    const P = live.current;
    soc.current = buildSociety(P.m, P.s, P.n);
    att.current = [];
    varBuf.current = [];
    round.current = 0;
    setReadout({ att: (soc.current.n / 2) | 0, vol: 0, round: 0 });
    draw();
  }

  /** change one structural param (m, S or N) → rebuild the society */
  function apply(patch: Partial<MinP>) {
    const P = { ...live.current, ...patch };
    live.current = P;
    setP(P);
    rebuild();
  }

  // run several rounds per frame; redraw the scrolling attendance trace
  useRAF(() => {
    const P = live.current;
    if (running) {
      const rounds = Math.max(1, Math.round(P.speed));
      let last = att.current.length ? att.current[att.current.length - 1] : 0;
      for (let r = 0; r < rounds; r++) {
        last = step(soc.current);
        att.current.push(last);
        if (att.current.length > MAXH) att.current.shift();
        varBuf.current.push(last);
        if (varBuf.current.length > VAR_TAIL) varBuf.current.shift();
        round.current++;
      }
      const v = tailVariance(varBuf.current, VAR_TAIL);
      setReadout({ att: last, vol: v / soc.current.n, round: round.current });
    }
    draw();
  }, true);

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const pad = 16;
    const gx = pad;
    const gy = pad + 6;
    const gw = w - pad * 2;
    const gh = h - pad * 2 - 6;
    const N = soc.current.n;

    // frame + title
    ctx.strokeStyle = "rgba(196,220,255,0.32)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw, gh);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("ATTENDANCE  A(t)  vs  ROUND", gx + 6, gy + 12);

    // value→pixel maps (attendance 0..N over the plot height)
    const py = (v: number) => gy + gh - (v / N) * gh;
    const px = (i: number, len: number) =>
      gx + (len <= 1 ? 0 : (i / (MAXH - 1)) * gw);

    // horizontal grid lines at 0, ¼, ½, ¾, N
    ctx.strokeStyle = GRID;
    for (let q = 0; q <= 4; q++) {
      const yy = gy + (q / 4) * gh;
      ctx.beginPath();
      ctx.moveTo(gx, yy);
      ctx.lineTo(gx + gw, yy);
      ctx.stroke();
    }

    // capacity line at N/2 (dashed, accent) — the self-organization target
    const cap = N / 2;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "var(--accent-2)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx, py(cap));
    ctx.lineTo(gx + gw, py(cap));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "var(--accent-2)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("N/2", gx + gw - 26, py(cap) - 4);

    // fluctuation band ±σ around N/2 (σ from the stationary tail)
    const sigma = Math.sqrt(tailVariance(varBuf.current, VAR_TAIL));
    if (sigma > 0.5) {
      ctx.fillStyle = "rgba(255,162,81,0.08)";
      const yTop = py(Math.min(N, cap + sigma));
      const yBot = py(Math.max(0, cap - sigma));
      ctx.fillRect(gx, yTop, gw, yBot - yTop);
    }

    // attendance trace
    const A = att.current;
    if (A.length > 1) {
      ctx.beginPath();
      const off = MAXH - A.length;
      for (let i = 0; i < A.length; i++) {
        const x = px(off + i, A.length);
        const y = py(A[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = TRACE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // latest point marker
      const lx = px(MAXH - 1, A.length);
      const ly = py(A[A.length - 1]);
      ctx.fillStyle = LINE;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, 7);
      ctx.fill();
    }

    // y-axis end labels
    ctx.fillStyle = "rgba(176,203,244,0.5)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText(String(N), gx + 4, gy + 22);
    ctx.fillText("0", gx + 4, gy + gh - 4);
  }

  const alpha = (1 << p.m) / odd(p.n);

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={rebuild}
        >
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            α = 2&#7504;/N = {alpha.toFixed(2)}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Memory  (history depth m)">
            <Slider
              label="m  bits"
              value={p.m}
              min={1}
              max={6}
              step={1}
              fmt={(v) => `${v}  → ${1 << v} states`}
              onChange={(v) => apply({ m: v })}
            />
          </Group>
          <Group title="Agents">
            <Slider
              label="Strategies / agent  S"
              value={p.s}
              min={1}
              max={4}
              step={1}
              onChange={(v) => apply({ s: v })}
            />
            <Slider
              label="Population  N (odd)"
              value={p.n}
              min={31}
              max={301}
              step={2}
              fmt={(v) => odd(v)}
              onChange={(v) => apply({ n: odd(v) })}
            />
          </Group>
          <Group title="Simulation">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={20}
              step={1}
              unit=" rounds/frame"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Attendance">
            <MiniPlot
              series={[{ data: att.current, color: TRACE }]}
              max={odd(p.n)}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Attendance" v={readout.att} color={TRACE} />
          <ReadOut
            k="Volatility σ²/N"
            v={readout.vol.toFixed(3)}
            color="var(--accent-2)"
          />
          <ReadOut k="Round" v={readout.round} />
        </>
      }
      footnote={
        <span>
          Selfish agents with no communication and only a few fixed memory-based
          rules self-organize to share a scarce resource right at its capacity:
          attendance fluctuates around N/2 forever, never converging. Coordination
          efficiency (the volatility σ²/N) depends on memory-vs-population
          α&#8202;=&#8202;2&#7504;/N (Arthur 1994, El Farol; Challet–Zhang 1997).
        </span>
      }
    />
  );
}

export function MinorityThumb(): ReactNode {
  const soc = useRef<Society>(buildSociety(3, 2, 71));
  const att = useRef<number[]>([]);
  const acc = useRef(0);
  const [cref, csize] = useCanvas();

  useRAF((dt) => {
    acc.current += dt;
    // ~4 rounds per frame, paced
    if (acc.current > 40) {
      acc.current = 0;
      for (let r = 0; r < 4; r++) {
        att.current.push(step(soc.current));
        if (att.current.length > 120) att.current.shift();
      }
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const N = soc.current.n;
    ctx.clearRect(0, 0, w, h);
    // capacity line
    const py = (v: number) => h - (v / N) * h;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(255,162,81,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, py(N / 2));
    ctx.lineTo(w, py(N / 2));
    ctx.stroke();
    ctx.restore();
    // trace
    const A = att.current;
    if (A.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < A.length; i++) {
        const x = (i / (A.length - 1)) * w;
        const y = py(A[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = "rgba(159,208,255,0.92)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, true);

  return <canvas ref={cref} />;
}
