"use client";

/* Kuramoto coupled oscillators — spontaneous phase-locking (Synchrony).
 * N phase oscillators with scattered natural frequencies ω_i feel a global pull
 * of strength K toward the mean field. Below a critical K_c they drift
 * incoherently; above it the order parameter r jumps off the floor and the
 * population beats as one — the mechanism behind synchronized neural firing. */
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
  Transport,
} from "../controls";

const DT = 0.03; // base integration step (scaled by frame dt)
const TWO_PI = Math.PI * 2;

/** Box–Muller standard normal */
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * v);
}

/** map a natural frequency (in [-1,1] after /3σ clamp) to a blueprint hue */
function freqColor(t: number): string {
  // t in [-1,1]: cyan (slow) → soft white → orange (fast)
  const a = Math.max(0, Math.min(1, (t + 1) / 2));
  const r = Math.round(120 + a * 135);
  const g = Math.round(190 - Math.abs(t) * 40);
  const b = Math.round(255 - a * 120);
  return `rgb(${r},${g},${b})`;
}

type KuraP = { K: number; sigma: number; M: number };

export function Kuramoto(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<KuraP>({ K: 1.0, sigma: 0.6, M: 160 });
  const [r, setR] = useState(0);
  const [time, setTime] = useState(0);
  const live = useLive(p);
  live.current = p;

  const theta = useRef<Float32Array>(new Float32Array(0));
  const omega = useRef<Float32Array>(new Float32Array(0));
  const sigmaSeed = useRef(0.6); // σ the current ω draw was built with
  const count = useRef(0);
  const tRef = useRef(0);
  const psi = useRef(0);
  const rMag = useRef(0);
  const rHist = useRef<number[]>([]);
  const dim = useRef({ cx: 0, cy: 0, R: 1 });

  /** reseed phases (uniform) and natural frequencies (Gaussian, mean 0) */
  function seed(M: number, sigma: number) {
    const th = new Float32Array(M);
    const om = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      th[i] = Math.random() * TWO_PI;
      om[i] = gauss() * sigma;
    }
    theta.current = th;
    omega.current = om;
    sigmaSeed.current = sigma;
    count.current = M;
    tRef.current = 0;
    psi.current = 0;
    rMag.current = 0;
    rHist.current = [];
    setR(0);
    setTime(0);
  }

  function reset() {
    const P = live.current;
    seed(P.M, P.sigma);
    draw();
  }

  const [cref, csize] = useCanvas((w, h) => {
    const R = Math.min(w, h) * 0.5 - 36;
    dim.current = { cx: w / 2, cy: h / 2, R: Math.max(20, R) };
    draw();
  });

  /** complex order parameter r·e^{iψ} = (1/M) Σ e^{iθ_j} */
  function orderParam(): { r: number; psi: number } {
    const th = theta.current;
    const M = count.current;
    if (M === 0) return { r: 0, psi: 0 };
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < M; i++) {
      sx += Math.cos(th[i]);
      sy += Math.sin(th[i]);
    }
    sx /= M;
    sy /= M;
    return { r: Math.hypot(sx, sy), psi: Math.atan2(sy, sx) };
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cx, cy, R } = dim.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    // unit circle + cross-hair grid
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TWO_PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();
    // faint inner ring at r = 0.5 for scale
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.5, 0, TWO_PI);
    ctx.strokeStyle = "rgba(124,170,228,0.07)";
    ctx.stroke();

    // oscillators as dots on the circle, colored by natural frequency
    const th = theta.current;
    const om = omega.current;
    const M = count.current;
    const sig = sigmaSeed.current || 1;
    for (let i = 0; i < M; i++) {
      const a = th[i];
      const px = cx + Math.cos(a) * R;
      const py = cy - Math.sin(a) * R; // screen-y inverted
      const t = Math.max(-1, Math.min(1, om[i] / (3 * sig)));
      ctx.fillStyle = freqColor(t);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(px, py, M > 220 ? 2.2 : 2.8, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // mean-field vector: arrow from center, length r·R at angle ψ
    const rNow = rMag.current;
    const ps = psi.current;
    const ex = cx + Math.cos(ps) * R * rNow;
    const ey = cy - Math.sin(ps) * R * rNow;
    ctx.strokeStyle = "var(--accent-2)";
    ctx.fillStyle = "var(--accent-2)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // arrow head
    if (rNow > 0.02) {
      const ah = 8;
      const back = ps; // direction of arrow
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - Math.cos(back - 0.4) * ah,
        ey + Math.sin(back - 0.4) * ah,
      );
      ctx.lineTo(
        ex - Math.cos(back + 0.4) * ah,
        ey + Math.sin(back + 0.4) * ah,
      );
      ctx.closePath();
      ctx.fill();
    }
    // hub
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, TWO_PI);
    ctx.fill();
  }

  // integrate the mean-field Kuramoto dynamics
  useRAF((dt) => {
    const P = live.current;
    // structural changes (M, σ) reseed lazily
    if (P.M !== count.current || P.sigma !== sigmaSeed.current) {
      seed(P.M, P.sigma);
    }
    if (running) {
      const th = theta.current;
      const om = omega.current;
      const M = count.current;
      // a few sub-steps per frame for a smooth, fast-enough sweep
      const sub = 2;
      const h = Math.min(2.2, (dt / 16.7)) * DT;
      for (let s = 0; s < sub; s++) {
        const { r: rr, psi: pp } = orderParam();
        psi.current = pp;
        const Kr = P.K * rr;
        for (let i = 0; i < M; i++) {
          // dθ_i/dt = ω_i + K·r·sin(ψ − θ_i)
          let a = th[i] + (om[i] + Kr * Math.sin(pp - th[i])) * h;
          a %= TWO_PI;
          if (a < 0) a += TWO_PI;
          th[i] = a;
        }
        tRef.current += h;
      }
      const fin = orderParam();
      psi.current = fin.psi;
      rMag.current = fin.r;
      rHist.current.push(fin.r);
      if (rHist.current.length > 160) rHist.current.shift();
      setR(fin.r);
      setTime(tRef.current);
    }
    draw();
  }, true);

  useEffect(() => {
    seed(p.M, p.sigma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((x) => !x)}
          onReset={reset}
        >
          <div style={{ flex: 1 }} />
          <span className="label nowrap">
            {r > 0.6 ? "Synchronized" : r > 0.25 ? "Partial lock" : "Incoherent"}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Coupling  (dθᵢ/dt = ωᵢ + K·r·sin(ψ−θᵢ))">
            <Slider
              label="K  coupling"
              value={p.K}
              min={0}
              max={6}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, K: v }))}
            />
          </Group>
          <Group title="Frequency disorder">
            <Slider
              label="σ  spread"
              value={p.sigma}
              min={0}
              max={2.5}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              unit=" rad/s"
              onChange={(v) => setP((o) => ({ ...o, sigma: v }))}
            />
          </Group>
          <Group title="Population">
            <Slider
              label="M  oscillators"
              value={p.M}
              min={40}
              max={300}
              step={10}
              onChange={(v) => setP((o) => ({ ...o, M: Math.round(v) }))}
            />
          </Group>
          <Group title="Coherence  r">
            <MiniPlot
              series={[
                {
                  data: rHist.current,
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
            k="Order r"
            v={r.toFixed(3)}
            color="var(--accent-2)"
          />
          <ReadOut k="Coupling K" v={p.K.toFixed(2)} />
          <ReadOut k="Time" v={`${time.toFixed(1)}s`} />
        </>
      }
      footnote={
        <span>
          Coupled oscillators spontaneously phase-lock once the coupling K
          exceeds a critical strength set by the spread of natural frequencies
          — the order parameter r jumps off the floor in a second-order
          transition. It is the mechanism behind synchronized neural firing and
          brain rhythms (Kuramoto; Winfree).
        </span>
      }
    />
  );
}

export function KuramotoThumb(): ReactNode {
  const M = 90;
  const theta = useRef<Float32Array>(new Float32Array(0));
  const omega = useRef<Float32Array>(new Float32Array(0));
  const phase = useRef({ t: 0 });
  const dim = useRef({ cx: 0, cy: 0, R: 1 });

  function seed() {
    const th = new Float32Array(M);
    const om = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      th[i] = Math.random() * TWO_PI;
      om[i] = gauss() * 0.6;
    }
    theta.current = th;
    omega.current = om;
    phase.current.t = 0;
  }

  const [cref, csize] = useCanvas((w, h) => {
    const R = Math.min(w, h) * 0.5 - 8;
    dim.current = { cx: w / 2, cy: h / 2, R: Math.max(8, R) };
  });

  useEffect(() => {
    seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRAF((dt) => {
    const ph = phase.current;
    ph.t += dt;
    if (ph.t > 4200) seed(); // cycle: scatter → clump → reseed
    // K ramps up over the cycle to show the transition live
    const K = 0.4 + Math.min(1, ph.t / 2600) * 4.2;
    const th = theta.current;
    const om = omega.current;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < M; i++) {
      sx += Math.cos(th[i]);
      sy += Math.sin(th[i]);
    }
    sx /= M;
    sy /= M;
    const rr = Math.hypot(sx, sy);
    const pp = Math.atan2(sy, sx);
    const h = Math.min(2.2, dt / 16.7) * DT;
    const Kr = K * rr;
    for (let i = 0; i < M; i++) {
      let a = th[i] + (om[i] + Kr * Math.sin(pp - th[i])) * h;
      a %= TWO_PI;
      if (a < 0) a += TWO_PI;
      th[i] = a;
    }

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h: hh } = csize.current;
    const { cx, cy, R } = dim.current;
    ctx.clearRect(0, 0, w, hh);
    ctx.strokeStyle = "rgba(124,170,228,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TWO_PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,241,255,0.9)";
    for (let i = 0; i < M; i++) {
      const px = cx + Math.cos(th[i]) * R;
      const py = cy - Math.sin(th[i]) * R;
      ctx.beginPath();
      ctx.arc(px, py, 1.7, 0, TWO_PI);
      ctx.fill();
    }
    // mean-field arrow
    ctx.strokeStyle = "var(--accent-2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(pp) * R * rr, cy - Math.sin(pp) * R * rr);
    ctx.stroke();
  }, true);

  return <canvas ref={cref} />;
}
