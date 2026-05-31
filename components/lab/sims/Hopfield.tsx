"use client";

/* Hopfield associative memory — recall a stored pattern from a corrupted cue.
 * Memory as attractor dynamics: Hebbian weights carve energy minima; async
 * sign-updates roll the state downhill into the nearest stored memory. */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import {
  Btn,
  Group,
  MiniPlot,
  ReadOut,
  Slider,
  SimLayout,
  Transport,
} from "../controls";

const G = 16; // grid side
const N = G * G; // neuron count
const PNAMES = ["Cross", "Diagonal", "Ring"] as const;

type Pat = Int8Array;

/** three reasonably-distinct ±1 glyphs on the GxG grid */
function buildPatterns(): Pat[] {
  const c = (G - 1) / 2;
  const cross = new Int8Array(N);
  const diag = new Int8Array(N);
  const ring = new Int8Array(N);
  const R = G * 0.34;
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const i = y * G + x;
      cross[i] = Math.abs(x - c) <= 1.3 || Math.abs(y - c) <= 1.3 ? 1 : -1;
      const dx = x - c,
        dy = y - c;
      diag[i] = Math.abs(dx - dy) <= 1.6 || Math.abs(dx + dy) <= 1.6 ? 1 : -1;
      ring[i] = Math.abs(Math.hypot(dx, dy) - R) <= 1.2 ? 1 : -1;
    }
  }
  return [cross, diag, ring];
}

/** Hebbian outer-product rule: W_ij = (1/N) Σ_p ξ_i^p ξ_j^p, zero diagonal */
function train(pats: Pat[]): Float32Array {
  const W = new Float32Array(N * N);
  for (const p of pats) {
    for (let i = 0; i < N; i++) {
      const pi = p[i];
      const row = i * N;
      for (let j = 0; j < N; j++) {
        if (i !== j) W[row + j] += (pi * p[j]) / N;
      }
    }
  }
  return W;
}

function localField(s: Int8Array, W: Float32Array, i: number): number {
  let h = 0;
  const row = i * N;
  for (let j = 0; j < N; j++) h += W[row + j] * s[j];
  return h;
}

/** E = −½ Σ_ij W_ij s_i s_j */
function energy(s: Int8Array, W: Float32Array): number {
  let e = 0;
  for (let i = 0; i < N; i++) e -= 0.5 * s[i] * localField(s, W, i);
  return e;
}

/** best normalized overlap m = (1/N)|Σ s_i ξ_i| over stored patterns, in [0,1] */
function bestOverlap(s: Int8Array, pats: Pat[]): number {
  let best = 0;
  for (const p of pats) {
    let dot = 0;
    for (let i = 0; i < N; i++) dot += s[i] * p[i];
    best = Math.max(best, Math.abs(dot) / N);
  }
  return best;
}

/** count neurons whose sign disagrees with their local field (0 ⇒ fixed point) */
function unstableCount(s: Int8Array, W: Float32Array): number {
  let c = 0;
  for (let i = 0; i < N; i++) {
    const want = localField(s, W, i) >= 0 ? 1 : -1;
    if (want !== s[i]) c++;
  }
  return c;
}

type HopP = { noise: number; speed: number };

export function Hopfield(): ReactNode {
  const [running, setRunning] = useState(false);
  const [p, setP] = useState<HopP>({ noise: 0.25, speed: 600 });
  const [eVal, setEVal] = useState(0);
  const [overlap, setOverlap] = useState(0);
  const [steps, setSteps] = useState(0);
  const [converged, setConverged] = useState(false);
  const live = useLive(p);
  live.current = p;

  const pats = useRef<Pat[]>(buildPatterns());
  const W = useRef<Float32Array>(train(pats.current));
  const state = useRef<Int8Array>(new Int8Array(N));
  const dim = useRef({ cell: 10, ox: 0, oy: 0 });
  const acc = useRef(0);
  const stepRef = useRef(0);
  const eHist = useRef<number[]>([]);

  const [cref, csize] = useCanvas((w, h) => {
    const cell = Math.max(4, Math.floor(Math.min(w, h) / G));
    dim.current = {
      cell,
      ox: Math.floor((w - cell * G) / 2),
      oy: Math.floor((h - cell * G) / 2),
    };
    draw();
  });

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cell, ox, oy } = dim.current;
    const s = state.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        if (s[y * G + x] > 0) {
          ctx.fillStyle = "#e8f1ff";
          ctx.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
        }
      }
    }
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= G; x++) {
      ctx.moveTo(ox + x * cell + 0.5, oy);
      ctx.lineTo(ox + x * cell + 0.5, oy + G * cell);
    }
    for (let y = 0; y <= G; y++) {
      ctx.moveTo(ox, oy + y * cell + 0.5);
      ctx.lineTo(ox + G * cell, oy + y * cell + 0.5);
    }
    ctx.stroke();
  }

  function refreshStats() {
    setEVal(energy(state.current, W.current));
    setOverlap(bestOverlap(state.current, pats.current));
  }

  function loadCue(idx: number) {
    const src = pats.current[idx];
    const s = state.current;
    s.set(src);
    const flips = Math.round(live.current.noise * N);
    for (let t = 0; t < flips; t++) {
      const i = (Math.random() * N) | 0;
      s[i] = (s[i] * -1) as -1 | 1;
    }
    stepRef.current = 0;
    setSteps(0);
    eHist.current = [];
    setConverged(false);
    draw();
    refreshStats();
  }

  function corrupt() {
    const s = state.current;
    const flips = Math.round(live.current.noise * N);
    for (let t = 0; t < flips; t++) {
      const i = (Math.random() * N) | 0;
      s[i] = (s[i] * -1) as -1 | 1;
    }
    setConverged(false);
    draw();
    refreshStats();
  }

  // async recall: update a batch of random neurons each frame
  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const perSec = live.current.speed;
    let updates = Math.floor((perSec * acc.current) / 1000);
    if (updates <= 0) return;
    acc.current -= (updates * 1000) / perSec;
    const s = state.current,
      w = W.current;
    let changed = 0;
    while (updates-- > 0) {
      const i = (Math.random() * N) | 0;
      const want = localField(s, w, i) >= 0 ? 1 : -1;
      if (want !== s[i]) {
        s[i] = want as -1 | 1;
        changed++;
      }
      stepRef.current++;
    }
    draw();
    const e = energy(s, w);
    eHist.current.push(e);
    if (eHist.current.length > 140) eHist.current.shift();
    setEVal(e);
    setOverlap(bestOverlap(s, pats.current));
    setSteps(stepRef.current);
    if (changed === 0 && unstableCount(s, w) === 0) {
      setConverged(true);
      setRunning(false);
    }
  }, true);

  useEffect(() => {
    loadCue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flipAt(e: MouseEvent) {
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const { cell, ox, oy } = dim.current;
    const x = Math.floor((e.clientX - r.left - ox) / cell);
    const y = Math.floor((e.clientY - r.top - oy) / cell);
    if (x < 0 || y < 0 || x >= G || y >= G) return;
    const s = state.current;
    const i = y * G + x;
    s[i] = (s[i] * -1) as -1 | 1;
    setConverged(false);
    draw();
    refreshStats();
  }

  // plot the energy descent (shifted positive so the curve reads top→bottom)
  const eh = eHist.current;
  const eMax = eh.length ? Math.max(...eh) : 1;
  const eMin = eh.length ? Math.min(...eh) : 0;
  const plot = eh.map((v) => eMax - v); // ≥0, grows as energy falls
  const plotMax = Math.max(1, eMax - eMin);

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={flipAt}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={() => loadCue(0)}
        >
          <Btn onClick={corrupt}>+ Noise</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            {converged ? "Recalled ✓" : "Click a cell to flip"}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Stored memories">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PNAMES.map((nm, idx) => (
                <Btn key={nm} onClick={() => loadCue(idx)}>
                  {nm}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Corruption">
            <Slider
              label="Noise"
              value={p.noise}
              min={0}
              max={0.5}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, noise: v }))}
            />
          </Group>
          <Group title="Recall">
            <Slider
              label="Speed"
              value={p.speed}
              min={50}
              max={2000}
              step={50}
              unit=" upd/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Energy descent">
            <MiniPlot
              series={[
                { data: plot, color: "var(--accent-2)", fill: "rgba(255,122,69,0.10)" },
              ]}
              max={plotMax}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Energy" v={eVal.toFixed(2)} />
          <ReadOut
            k="Overlap"
            v={`${Math.round(overlap * 100)}%`}
            color="var(--accent-2)"
          />
          <ReadOut k="Updates" v={steps} />
        </>
      }
      footnote={
        <span>
          {N} neurons, {PNAMES.length} memories stored by the Hebbian rule
          W&#8202;=&#8202;⟨ξξᵀ⟩. Each async update sets a neuron to the sign of its
          local field, lowering the energy E&#8202;=&#8202;−½&#8202;sᵀWs until the
          state falls into the nearest stored memory.
        </span>
      }
    />
  );
}

export function HopfieldThumb(): ReactNode {
  const pats = useRef<Pat[]>(buildPatterns());
  const W = useRef<Float32Array>(train(pats.current));
  const s = useRef<Int8Array>(new Int8Array(N));
  const dim = useRef({ cell: 6, ox: 0, oy: 0 });
  const phase = useRef({ mode: 0, t: 0, idx: 0 }); // mode 0 settle, 1 hold
  const [cref, csize] = useCanvas((w, h) => {
    const cell = Math.max(2, Math.floor(Math.min(w, h) / G));
    dim.current = {
      cell,
      ox: Math.floor((w - cell * G) / 2),
      oy: Math.floor((h - cell * G) / 2),
    };
  });

  function reseed() {
    const idx = phase.current.idx % pats.current.length;
    s.current.set(pats.current[idx]);
    const flips = Math.round(0.28 * N);
    for (let t = 0; t < flips; t++) s.current[(Math.random() * N) | 0] *= -1;
    phase.current.idx++;
  }

  useEffect(() => {
    reseed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRAF((dt) => {
    const ph = phase.current;
    ph.t += dt;
    if (ph.mode === 0) {
      // a few async updates per frame
      const st = s.current,
        w = W.current;
      for (let k = 0; k < 24; k++) {
        const i = (Math.random() * N) | 0;
        st[i] = (localField(st, w, i) >= 0 ? 1 : -1) as 1 | -1;
      }
      if (ph.t > 900) {
        ph.mode = 1;
        ph.t = 0;
      }
    } else if (ph.t > 700) {
      ph.mode = 0;
      ph.t = 0;
      reseed();
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cell, ox, oy } = dim.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(232,241,255,0.92)";
    const st = s.current;
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++)
        if (st[y * G + x] > 0)
          ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
  }, true);

  return <canvas ref={cref} />;
}
