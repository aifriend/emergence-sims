"use client";

/* Route to Chaos — the logistic map x → r·x·(1−x).
 * Sweep the growth rate r and a stable point period-doubles into a 2-cycle, a
 * 4-cycle, an 8-cycle… and finally chaos, at the universal Feigenbaum rate.
 * The bifurcation fan (the WHAT) is rendered once per resize/param change; a
 * linked cobweb staircase at the cursor r (the WHY) animates on top. */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Transport } from "../controls";

const R_MIN = 2.5;
const R_MAX = 4.0;
const X_MIN = 0;
const X_MAX = 1;
const FEIGENBAUM = 4.669201609;
const SEED = 0.4; // off-centre so r≈4 doesn't collapse onto the x=0 fixed point
const MAX_COB = 200; // staircase segments before the oldest fade out

const f = (r: number, x: number) => r * x * (1 - x);
const settle = (r: number, x: number, n: number) => {
  for (let i = 0; i < n; i++) x = f(r, x);
  return x;
};

/** minimal repeat period of the attractor (1/2/4/8) or 0 for chaos / higher */
function detectPeriod(r: number): number {
  let x = settle(r, SEED, 1600);
  const tail = new Float64Array(256);
  for (let i = 0; i < 256; i++) tail[i] = x = f(r, x);
  const tol = 1e-4;
  for (const p of [1, 2, 4, 8]) {
    let ok = true;
    for (let i = 0; i + p < tail.length; i++) {
      if (Math.abs(tail[i] - tail[i + p]) > tol) {
        ok = false;
        break;
      }
    }
    if (ok) return p;
  }
  return 0;
}

type BifP = { r: number; warmup: number; sample: number };

export function Bifurcation(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<BifP>({ r: 3.2, warmup: 400, sample: 160 });
  const [period, setPeriod] = useState(2);
  const live = useLive(p);
  live.current = p;

  // geometry of the two stage regions (recomputed on resize)
  const geo = useRef({ dx: 0, dy: 0, dw: 1, dh: 1, cx: 0, cy: 0, cs: 1 });
  // pre-rendered bifurcation fan (expensive) so the RAF only repaints the cobweb
  const fan = useRef<HTMLCanvasElement | null>(null);
  const cob = useRef<number[]>([]); // staircase x-values, oldest first
  const acc = useRef(0);

  const [cref, csize] = useCanvas((w, h) => {
    layout(w, h);
    renderFan();
    draw();
  });

  function layout(w: number, h: number) {
    const padL = 40;
    const padR = 14;
    const padT = 16;
    const padB = 26;
    // cobweb inset: a square in the lower-right, sized to the stage
    const cs = Math.max(120, Math.min(220, Math.floor(Math.min(w, h) * 0.42)));
    geo.current = {
      dx: padL,
      dy: padT,
      dw: Math.max(1, w - padL - padR),
      dh: Math.max(1, h - padT - padB),
      cx: w - cs - padR,
      cy: h - cs - padB,
      cs,
    };
  }

  // --- expensive: compute the attractor for every pixel column, ONCE -------
  function renderFan() {
    const { dw, dh } = geo.current;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.floor(dw));
    off.height = Math.max(1, Math.floor(dh));
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const cols = off.width;
    const rows = off.height;
    const warmup = live.current.warmup;
    const sample = live.current.sample;
    const img = ctx.createImageData(cols, rows);
    const d = img.data;
    for (let c = 0; c < cols; c++) {
      const r = R_MIN + (c / (cols - 1)) * (R_MAX - R_MIN);
      let x = settle(r, SEED, warmup);
      for (let s = 0; s < sample; s++) {
        x = f(r, x);
        const yy = (rows - 1) - Math.round(((x - X_MIN) / (X_MAX - X_MIN)) * (rows - 1));
        if (yy < 0 || yy >= rows) continue;
        const idx = (yy * cols + c) * 4;
        // accumulate alpha so density (how often the orbit visits x) shows up
        d[idx] = 232;
        d[idx + 1] = 241;
        d[idx + 2] = 255;
        d[idx + 3] = Math.min(255, d[idx + 3] + 70);
      }
    }
    ctx.putImageData(img, 0, 0);
    fan.current = off;
  }

  // --- diagram axes / grid / landmarks ------------------------------------
  function drawDiagram(ctx: CanvasRenderingContext2D) {
    const { dx, dy, dw, dh } = geo.current;
    const rx = (r: number) => dx + ((r - R_MIN) / (R_MAX - R_MIN)) * dw;
    const xy = (x: number) => dy + dh - ((x - X_MIN) / (X_MAX - X_MIN)) * dh;

    // grid
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(176,203,244,0.55)";
    for (let gr = 2.6; gr <= R_MAX + 1e-6; gr += 0.2) {
      const X = Math.round(rx(gr)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(X, dy);
      ctx.lineTo(X, dy + dh);
      ctx.stroke();
      ctx.fillText(gr.toFixed(1), X - 8, dy + dh + 14);
    }
    for (let gx = 0; gx <= 1.0001; gx += 0.25) {
      const Y = Math.round(xy(gx)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(dx, Y);
      ctx.lineTo(dx + dw, Y);
      ctx.stroke();
      ctx.fillText(gx.toFixed(2), dx - 34, Y + 3);
    }

    // the pre-rendered attractor fan
    if (fan.current) ctx.drawImage(fan.current, dx, dy);

    // landmark doubling points + period-3 window
    const marks: [number, string][] = [
      [3.0, "P2"],
      [3.449, "P4"],
      [3.5441, "P8"],
      [3.56995, "r∞"],
      [3.8284, "P3"],
    ];
    ctx.font = "8px 'IBM Plex Mono', monospace";
    for (const [mr, lbl] of marks) {
      if (mr < R_MIN || mr > R_MAX) continue;
      const X = Math.round(rx(mr)) + 0.5;
      ctx.strokeStyle = "rgba(159,208,255,0.30)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(X, dy);
      ctx.lineTo(X, dy + dh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(159,208,255,0.75)";
      ctx.fillText(lbl, X + 2, dy + 10);
    }

    // axis labels
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillText("r  (growth rate) →", dx + dw - 116, dy + dh + 24);
    ctx.save();
    ctx.translate(dx - 30, dy + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("attractor  x →", 0, 0);
    ctx.restore();

    // bright current-r marker
    const X = rx(live.current.r);
    ctx.strokeStyle = "var(--accent-2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X + 0.5, dy);
    ctx.lineTo(X + 0.5, dy + dh);
    ctx.stroke();
    ctx.fillStyle = "var(--accent-2)";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.fillText(`r=${live.current.r.toFixed(3)}`, Math.min(X + 4, dx + dw - 54), dy + dh - 6);
  }

  // --- cobweb staircase inset ---------------------------------------------
  function drawCobweb(ctx: CanvasRenderingContext2D) {
    const { cx, cy, cs } = geo.current;
    const r = live.current.r;
    const px = (x: number) => cx + x * cs;
    const py = (y: number) => cy + cs - y * cs;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cs, cs);
    ctx.clip();
    ctx.fillStyle = "rgba(6,18,34,0.92)";
    ctx.fillRect(cx, cy, cs, cs);

    // frame + title
    ctx.strokeStyle = "rgba(196,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, cy + 0.5, cs, cs);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono', monospace";
    ctx.fillText("COBWEB  y = r·x(1−x)", cx + 6, cy + 12);

    // diagonal y = x
    ctx.strokeStyle = "rgba(124,170,228,0.35)";
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(1), py(1));
    ctx.stroke();

    // parabola
    ctx.strokeStyle = "#9fd0ff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= cs; i++) {
      const x = i / cs;
      const y = f(r, x);
      if (i) ctx.lineTo(px(x), py(y));
      else ctx.moveTo(px(x), py(y));
    }
    ctx.stroke();

    // staircase: vertical to parabola, horizontal to diagonal, repeat
    const orbit = cob.current;
    if (orbit.length > 1) {
      for (let i = 0; i < orbit.length - 1; i++) {
        const a = Math.max(0.08, (i / orbit.length) * 0.85);
        ctx.strokeStyle = `rgba(255,162,81,${a.toFixed(3)})`;
        ctx.lineWidth = 1;
        const xn = orbit[i];
        const xn1 = orbit[i + 1];
        ctx.beginPath();
        ctx.moveTo(px(xn), py(xn)); // on diagonal
        ctx.lineTo(px(xn), py(xn1)); // up/down to parabola
        ctx.lineTo(px(xn1), py(xn1)); // across to diagonal
        ctx.stroke();
      }
      // current point
      const last = orbit[orbit.length - 1];
      ctx.fillStyle = "var(--accent-2)";
      ctx.beginPath();
      ctx.arc(px(last), py(f(r, last)), 2.4, 0, 7);
      ctx.fill();
    }
    ctx.restore();
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
    drawDiagram(ctx);
    drawCobweb(ctx);
  }

  function resetCobweb(seed = 0.15) {
    cob.current = [seed];
    acc.current = 0;
  }

  // advance the cobweb orbit a step every ~120ms so the staircase is legible
  useRAF((dt) => {
    if (running) {
      acc.current += dt;
      if (acc.current >= 120) {
        acc.current -= 120;
        const orbit = cob.current;
        const last = orbit.length ? orbit[orbit.length - 1] : 0.15;
        orbit.push(f(live.current.r, last));
        if (orbit.length > MAX_COB) orbit.shift();
      }
    }
    draw();
  }, true);

  // changing r (or seed) updates the diagram marker live; recompute period +
  // restart the cobweb so the staircase reflects the new rate
  useEffect(() => {
    setPeriod(detectPeriod(p.r));
    resetCobweb();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.r]);

  // warmup/sample changes only affect the (expensive) fan — recompute it
  useEffect(() => {
    renderFan();
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.warmup, p.sample]);

  // click/drag on the diagram to scrub r (links the two panels)
  function scrub(e: MouseEvent) {
    if (e.buttons === 0 && e.type === "mousemove") return;
    const cv = cref.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const { dx, dw } = geo.current;
    const fx = (e.clientX - rect.left - dx) / dw;
    if (fx < 0 || fx > 1) return;
    const r = +(R_MIN + fx * (R_MAX - R_MIN)).toFixed(3);
    setP((o) => ({ ...o, r }));
  }

  const periodLabel = period === 0 ? "chaos" : `${period}`;

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "ew-resize" }}
          onMouseDown={scrub}
          onMouseMove={scrub}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((v) => !v)}
          onReset={() => resetCobweb()}
        >
          <Btn onClick={() => setP((o) => ({ ...o, r: 3.2 }))}>r → 3.2</Btn>
          <Btn onClick={() => setP((o) => ({ ...o, r: 3.828 }))}>P-3 window</Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">drag the diagram to scrub r</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Growth rate  (x → r·x·(1−x))">
            <Slider
              label="r"
              value={p.r}
              min={R_MIN}
              max={R_MAX}
              step={0.001}
              fmt={(v) => v.toFixed(3)}
              onChange={(v) => setP((o) => ({ ...o, r: v }))}
            />
          </Group>
          <Group title="Diagram resolution">
            <Slider
              label="Warm-up"
              value={p.warmup}
              min={100}
              max={1000}
              step={50}
              unit=" it"
              onChange={(v) => setP((o) => ({ ...o, warmup: v }))}
            />
            <Slider
              label="Samples"
              value={p.sample}
              min={60}
              max={400}
              step={20}
              unit=" it"
              onChange={(v) => setP((o) => ({ ...o, sample: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="r" v={p.r.toFixed(3)} color="var(--accent-2)" />
          <ReadOut k="Period" v={periodLabel} />
          <ReadOut k="Feigenbaum δ" v={FEIGENBAUM.toFixed(5)} />
        </>
      }
      footnote={
        <span>
          One knob: as r rises, a stable equilibrium splits into a 2-cycle, then
          4, then 8 — the doublings accelerating into deterministic chaos at a
          universal rate (Feigenbaum δ&#8202;≈&#8202;4.669). May, 1976.
        </span>
      }
    />
  );
}

export function BifurcationThumb(): ReactNode {
  const fan = useRef<HTMLCanvasElement | null>(null);
  const [cref, csize] = useCanvas((w, h) => {
    const off = document.createElement("canvas");
    off.width = Math.max(1, w);
    off.height = Math.max(1, h);
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(off.width, off.height);
    const d = img.data;
    for (let c = 0; c < off.width; c++) {
      const r = R_MIN + (c / (off.width - 1)) * (R_MAX - R_MIN);
      let x = settle(r, SEED, 200);
      for (let s = 0; s < 90; s++) {
        x = f(r, x);
        const yy = (off.height - 1) - Math.round(x * (off.height - 1));
        if (yy < 0 || yy >= off.height) continue;
        const idx = (yy * off.width + c) * 4;
        d[idx] = 232;
        d[idx + 1] = 241;
        d[idx + 2] = 255;
        d[idx + 3] = Math.min(255, d[idx + 3] + 80);
      }
    }
    ctx.putImageData(img, 0, 0);
    fan.current = off;
  });
  useRAF(() => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    if (fan.current) ctx.drawImage(fan.current, 0, 0);
  }, true);
  return <canvas ref={cref} />;
}
