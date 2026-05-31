"use client";

/* Predator–Prey (Lotka–Volterra). Ported from the design bundle's sims/lotka.jsx */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Group, ReadOut, Slider, SimLayout, Transport } from "../controls";

type LotkaP = { a: number; b: number; d: number; g: number; speed: number };
type Pt = { x: number; y: number };

export function LotkaVolterra(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<LotkaP>({ a: 1.1, b: 0.4, d: 0.1, g: 0.4, speed: 1.0 });
  const [readout, setReadout] = useState({ prey: 10, pred: 5 });
  const live = useLive(p);
  live.current = p;

  const st = useRef({ x: 10, y: 5, t: 0 });
  const hist = useRef<Pt[]>([]);
  const MAXH = 900;

  const [cref, csize] = useCanvas();

  function reset() {
    st.current = { x: 10, y: 5, t: 0 };
    hist.current = [];
  }

  function deriv(x: number, y: number, P: LotkaP): [number, number] {
    return [P.a * x - P.b * x * y, P.d * x * y - P.g * y];
  }

  useRAF((dt) => {
    const P = live.current;
    if (running) {
      // integrate several small RK4 steps per frame
      const steps = 6;
      const h = ((dt / 1000) * P.speed * 1.6) / steps;
      let { x, y, t } = st.current;
      for (let s = 0; s < steps; s++) {
        const [k1x, k1y] = deriv(x, y, P);
        const [k2x, k2y] = deriv(x + (k1x * h) / 2, y + (k1y * h) / 2, P);
        const [k3x, k3y] = deriv(x + (k2x * h) / 2, y + (k2y * h) / 2, P);
        const [k4x, k4y] = deriv(x + k3x * h, y + k3y * h, P);
        x += ((k1x + 2 * k2x + 2 * k3x + k4x) * h) / 6;
        y += ((k1y + 2 * k2y + 2 * k3y + k4y) * h) / 6;
        x = Math.max(0.001, Math.min(60, x));
        y = Math.max(0.001, Math.min(60, y));
        t += h;
      }
      st.current = { x, y, t };
      hist.current.push({ x, y });
      if (hist.current.length > MAXH) hist.current.shift();
      setReadout({ prey: x, pred: y });
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
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    const pad = 14;
    const splitW = w > 620 ? Math.round(w * 0.6) : w; // time series width
    const stacked = w <= 620;
    const tsX = pad,
      tsY = pad,
      tsW = splitW - pad * 1.5,
      tsH = stacked ? h * 0.5 - pad * 1.5 : h - pad * 2;

    // ---- TIME SERIES ----
    drawFrame(ctx, tsX, tsY, tsW, tsH, "POPULATION  vs  TIME");
    const H = hist.current;
    const maxV = 24;
    const px = (i: number) => tsX + (i / (MAXH - 1)) * tsW;
    const py = (v: number) => tsY + tsH - (Math.min(v, maxV) / maxV) * tsH;
    // y ticks
    ctx.strokeStyle = "rgba(124,170,228,0.10)";
    ctx.lineWidth = 1;
    for (let gy = 0; gy <= 4; gy++) {
      const yy = tsY + (gy / 4) * tsH;
      ctx.beginPath();
      ctx.moveTo(tsX, yy);
      ctx.lineTo(tsX + tsW, yy);
      ctx.stroke();
    }
    const drawCurve = (key: "x" | "y", color: string) => {
      ctx.beginPath();
      for (let i = 0; i < H.length; i++) {
        const x = px(MAXH - H.length + i),
          y = py(H[i][key]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    drawCurve("y", "#ff7a1a"); // predators
    drawCurve("x", "#9fd0ff"); // prey
    // legend
    legend(ctx, tsX + 6, tsY + 12, [
      ["#9fd0ff", "PREY"],
      ["#ff7a1a", "PREDATOR"],
    ]);

    // ---- PHASE PORTRAIT ----
    let ppX: number, ppY: number, ppW: number, ppH: number;
    if (stacked) {
      ppX = pad;
      ppY = h * 0.5 + pad * 0.5;
      ppW = w - pad * 2;
      ppH = h * 0.5 - pad * 1.5;
    } else {
      ppX = splitW + pad * 0.5;
      ppY = pad;
      ppW = w - splitW - pad * 1.5;
      ppH = h - pad * 2;
    }
    drawFrame(ctx, ppX, ppY, ppW, ppH, "PHASE PORTRAIT");
    const m = 26;
    const qx = (v: number) => ppX + (Math.min(v, m) / m) * ppW;
    const qy = (v: number) => ppY + ppH - (Math.min(v, m) / m) * ppH;
    ctx.strokeStyle = "rgba(124,170,228,0.10)";
    for (let gx = 0; gx <= 4; gx++) {
      const xx = ppX + (gx / 4) * ppW;
      ctx.beginPath();
      ctx.moveTo(xx, ppY);
      ctx.lineTo(xx, ppY + ppH);
      ctx.stroke();
    }
    for (let gy = 0; gy <= 4; gy++) {
      const yy = ppY + (gy / 4) * ppH;
      ctx.beginPath();
      ctx.moveTo(ppX, yy);
      ctx.lineTo(ppX + ppW, yy);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < H.length; i++) {
      const x = qx(H[i].x),
        y = qy(H[i].y);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,162,81,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // current point + equilibrium
    const P = live.current;
    const eqx = P.g / P.d,
      eqy = P.a / P.b;
    ctx.strokeStyle = "rgba(159,208,255,0.5)";
    ctx.beginPath();
    ctx.arc(qx(eqx), qy(eqy), 3, 0, 7);
    ctx.stroke();
    if (H.length) {
      const c = H[H.length - 1];
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath();
      ctx.arc(qx(c.x), qy(c.y), 3.5, 0, 7);
      ctx.fill();
    }
    // axis labels
    ctx.fillStyle = "rgba(176,203,244,0.5)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("PREY →", ppX + ppW - 44, ppY + ppH - 5);
    ctx.save();
    ctx.translate(ppX + 9, ppY + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("PREDATOR →", 0, 0);
    ctx.restore();
  }

  function drawFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
  ) {
    ctx.strokeStyle = "rgba(196,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText(title, x + 6, y + 12);
  }
  function legend(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    items: [string, string][],
  ) {
    ctx.font = "9px 'IBM Plex Mono'";
    let yy = y + 14;
    items.forEach(([c, l]) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, yy - 6, 10, 3);
      ctx.fillStyle = "rgba(206,224,255,0.8)";
      ctx.fillText(l, x + 14, yy);
      yy += 13;
    });
  }

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        />
      }
      controls={
        <>
          <Group title="Prey  (dx/dt = αx − βxy)">
            <Slider
              label="α  growth"
              value={p.a}
              min={0.2}
              max={2}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, a: v }))}
            />
            <Slider
              label="β  predation"
              value={p.b}
              min={0.05}
              max={1}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, b: v }))}
            />
          </Group>
          <Group title="Predator  (dy/dt = δxy − γy)">
            <Slider
              label="δ  conversion"
              value={p.d}
              min={0.02}
              max={0.4}
              step={0.02}
              onChange={(v) => setP((o) => ({ ...o, d: v }))}
            />
            <Slider
              label="γ  death"
              value={p.g}
              min={0.1}
              max={1}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, g: v }))}
            />
          </Group>
          <Group title="Integration">
            <Slider
              label="Sim speed"
              value={p.speed}
              min={0.2}
              max={3}
              step={0.1}
              unit="×"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Prey" v={readout.prey.toFixed(1)} color="#9fd0ff" />
          <ReadOut k="Predator" v={readout.pred.toFixed(1)} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          Two coupled differential equations, integrated live (RK4). The
          populations never settle — they orbit a fixed point forever, predators
          always lagging prey.
        </span>
      }
    />
  );
}

export function LotkaThumb(): ReactNode {
  const st = useRef({ x: 10, y: 5 });
  const hist = useRef<Pt[]>([]);
  const [cref, csize] = useCanvas();
  useRAF(() => {
    const P = { a: 1.1, b: 0.4, d: 0.1, g: 0.4 };
    let { x, y } = st.current;
    const h = 0.04;
    for (let s = 0; s < 4; s++) {
      const dx = P.a * x - P.b * x * y,
        dy = P.d * x * y - P.g * y;
      x += dx * h;
      y += dy * h;
      x = Math.max(0.01, Math.min(50, x));
      y = Math.max(0.01, Math.min(50, y));
    }
    st.current = { x, y };
    hist.current.push({ x, y });
    if (hist.current.length > 200) hist.current.shift();
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h: H } = csize.current;
    ctx.clearRect(0, 0, w, H);
    const Hh = hist.current;
    const mv = 24;
    const drawSeries = (k: "x" | "y", c: string) => {
      ctx.beginPath();
      for (let i = 0; i < Hh.length; i++) {
        const px = (i / 199) * w,
          py = H - (Math.min(Hh[i][k], mv) / mv) * H;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };
    drawSeries("y", "#ff7a1a");
    drawSeries("x", "#9fd0ff");
  }, true);
  return <canvas ref={cref} />;
}
