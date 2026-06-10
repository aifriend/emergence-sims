"use client";

/* Agent-based financial market (Brock–Hommes 1998 / Lux–Marchesi 1999 flavour).
 * Log-price set by the tug-of-war between FUNDAMENTALISTS (demand ∝ p_f − p, pull
 * toward fair value) and CHARTISTS (demand ∝ recent trend, amplify it). A market
 * maker nudges the price by net excess demand; agents adaptively defect toward the
 * recently-more-profitable strategy via a logit choice. Bubbles, crashes, clustered
 * volatility and fat tails emerge — nothing exogenous required. */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";
import { advance, CRASH, fresh, PF, WIN, type MarketP, type Sim } from "@/lib/market";

export function Market(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<MarketP>({ chartFrac: 0.5, gc: 0.55, noise: 0.012, speed: 1.0 });
  const [stats, setStats] = useState({ price: 1, vol: 0, maxDD: 0 });
  const live = useLive(p);
  live.current = p;

  const sim = useRef<Sim>(fresh());
  const prices = useRef<number[]>([]); // log prices, length ≤ WIN
  const rets = useRef<number[]>([]); // log returns, length ≤ WIN
  const flash = useRef(0); // crash highlight fade (frames)
  const acc = useRef(0);

  const [cref, csize] = useCanvas(() => draw());

  function reset() {
    sim.current = fresh();
    prices.current = [PF];
    rets.current = [];
    flash.current = 0;
    setStats({ price: Math.exp(PF), vol: 0, maxDD: 0 });
    draw();
  }

  /** rolling stdev of the last `n` returns × √steps-per-display → volatility readout */
  function rollVol(): number {
    const r = rets.current;
    const n = Math.min(r.length, 120);
    if (n < 2) return 0;
    let m = 0;
    for (let i = r.length - n; i < r.length; i++) m += r[i];
    m /= n;
    let v = 0;
    for (let i = r.length - n; i < r.length; i++) v += (r[i] - m) ** 2;
    return Math.sqrt(v / (n - 1));
  }

  useRAF((dt) => {
    if (running) {
      const P = live.current;
      // run several market steps per frame, scaled by speed
      acc.current += (dt / 1000) * P.speed * 90;
      let steps = Math.floor(acc.current);
      if (steps > 0) acc.current -= steps;
      steps = Math.min(steps, 24);
      let bigMove = false;
      while (steps-- > 0) {
        const r = advance(sim.current, P);
        prices.current.push(sim.current.p);
        rets.current.push(r);
        if (prices.current.length > WIN) prices.current.shift();
        if (rets.current.length > WIN) rets.current.shift();
        if (Math.abs(r) > CRASH) bigMove = true;
      }
      if (bigMove) flash.current = 16;
      if (flash.current > 0) flash.current--;
      setStats({
        price: Math.exp(sim.current.p),
        vol: rollVol(),
        maxDD: sim.current.maxDD,
      });
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
    const retH = Math.max(56, Math.round(h * 0.26)); // bottom returns strip
    const pX = pad,
      pY = pad,
      pW = w - pad * 2,
      pH = h - retH - pad * 2.5;
    const rX = pad,
      rY = pY + pH + pad * 0.5,
      rW = w - pad * 2,
      rH = retH;

    const PR = prices.current;
    const RT = rets.current;

    // ---- PRICE CHART (hero) ----
    frame(ctx, pX, pY, pW, pH, "LOG PRICE  vs  TIME");
    // symmetric y-range around the fundamental, padded to the live extreme
    let span = 0.12;
    for (const v of PR) span = Math.max(span, Math.abs(v - PF) * 1.15);
    const yTop = PF + span,
      yBot = PF - span;
    const px = (i: number) => pX + (i / (WIN - 1)) * pW;
    const py = (v: number) => pY + pH - ((v - yBot) / (yTop - yBot)) * pH;
    // grid
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const yy = pY + (g / 4) * pH;
      ctx.beginPath();
      ctx.moveTo(pX, yy);
      ctx.lineTo(pX + pW, yy);
      ctx.stroke();
    }
    // fundamental dashed reference
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(159,208,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(pX, py(PF));
    ctx.lineTo(pX + pW, py(PF));
    ctx.stroke();
    ctx.setLineDash([]);
    // crash flash overlay
    if (flash.current > 0) {
      ctx.fillStyle = `rgba(255,122,69,${0.05 + 0.08 * (flash.current / 16)})`;
      ctx.fillRect(pX + 1, pY + 1, pW - 2, pH - 2);
    }
    // price line
    if (PR.length > 1) {
      ctx.beginPath();
      const off = WIN - PR.length;
      for (let i = 0; i < PR.length; i++) {
        const x = px(off + i),
          y = py(PR[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = "#e8f1ff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // leading dot
      const lx = px(WIN - 1),
        ly = py(PR[PR.length - 1]);
      ctx.fillStyle = flash.current > 0 ? "var(--accent-2)" : "#e8f1ff";
      ctx.beginPath();
      ctx.arc(lx, ly, 2.6, 0, 7);
      ctx.fill();
    }
    // fundamental label
    ctx.fillStyle = "rgba(159,208,255,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("fundamental  p_f", pX + pW - 96, py(PF) - 5);

    // ---- RETURN SERIES (volatility clustering) ----
    frame(ctx, rX, rY, rW, rH, "RETURNS  r_t");
    let rMax = 0.02;
    for (const v of RT) rMax = Math.max(rMax, Math.abs(v));
    const zeroY = rY + rH / 2;
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.beginPath();
    ctx.moveTo(rX, zeroY);
    ctx.lineTo(rX + rW, zeroY);
    ctx.stroke();
    if (RT.length > 1) {
      const off = WIN - RT.length;
      const barW = rW / WIN;
      for (let i = 0; i < RT.length; i++) {
        const x = rX + ((off + i) / (WIN - 1)) * rW;
        const hgt = (Math.abs(RT[i]) / rMax) * (rH / 2 - 2);
        const big = Math.abs(RT[i]) > CRASH;
        ctx.fillStyle = big ? "var(--accent-2)" : "rgba(159,208,255,0.6)";
        if (RT[i] >= 0) ctx.fillRect(x, zeroY - hgt, Math.max(0.6, barW), hgt);
        else ctx.fillRect(x, zeroY, Math.max(0.6, barW), hgt);
      }
    }
  }

  function frame(
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

  // returns sparkline for the rail (recent slice, absolute → shows the clusters)
  const tail = rets.current.slice(-160).map((v) => Math.abs(v));

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
          <span className="label nowrap" style={{ color: "var(--accent-2)" }}>
            {flash.current > 0 ? "⚠ crash" : "—"}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Trader mix">
            <Slider
              label="Chartist fraction"
              value={p.chartFrac}
              min={0}
              max={1}
              step={0.01}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, chartFrac: v }))}
            />
            <Slider
              label="Chartist aggressiveness  g_c"
              value={p.gc}
              min={0}
              max={1.5}
              step={0.01}
              onChange={(v) => setP((o) => ({ ...o, gc: v }))}
            />
          </Group>
          <Group title="Market noise">
            <Slider
              label="Noise  σ_ε"
              value={p.noise}
              min={0}
              max={0.05}
              step={0.001}
              fmt={(v) => v.toFixed(3)}
              onChange={(v) => setP((o) => ({ ...o, noise: v }))}
            />
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={0.2}
              max={3}
              step={0.1}
              unit="×"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Returns  |r_t|  (clustering)">
            <MiniPlot
              series={[
                {
                  data: tail,
                  color: "var(--accent-2)",
                  fill: "rgba(255,122,69,0.10)",
                },
              ]}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Price" v={stats.price.toFixed(3)} color="#e8f1ff" />
          <ReadOut k="Volatility" v={(stats.vol * 100).toFixed(2)} />
          <ReadOut
            k="Max drawdown"
            v={`${Math.round(stats.maxDD * 100)}%`}
            color="var(--accent-2)"
          />
        </>
      }
      footnote={
        <span>
          The price emerges from a tug-of-war between value-investors and
          trend-chasers, with agents defecting to whichever strategy lately paid.
          Trend-following breeds bubbles, crashes, and the fat-tailed, clustered
          volatility of real markets (Brock–Hommes 1998; Lux–Marchesi 1999).
          Params are illustrative regime-tuning, not fitted constants.
        </span>
      }
    />
  );
}

export function MarketThumb(): ReactNode {
  const sim = useRef<Sim>(fresh());
  const prices = useRef<number[]>([PF]);
  const acc = useRef(0);
  const P: MarketP = { chartFrac: 0.62, gc: 0.7, noise: 0.012, speed: 1 };
  const [cref, csize] = useCanvas();

  useRAF((dt) => {
    acc.current += (dt / 1000) * 90;
    let steps = Math.floor(acc.current);
    if (steps > 0) acc.current -= steps;
    steps = Math.min(steps, 20);
    while (steps-- > 0) {
      advance(sim.current, P);
      prices.current.push(sim.current.p);
      if (prices.current.length > 200) prices.current.shift();
    }
    // soft reset if it wanders too far (keeps the thumb lively)
    if (Math.abs(sim.current.p - PF) > 0.9) {
      sim.current = fresh();
      prices.current = [PF];
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    const PR = prices.current;
    let span = 0.18;
    for (const v of PR) span = Math.max(span, Math.abs(v - PF) * 1.1);
    const py = (v: number) => h - ((v - (PF - span)) / (2 * span)) * h;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(159,208,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(0, py(PF));
    ctx.lineTo(w, py(PF));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < PR.length; i++) {
      const x = (i / 199) * w,
        y = py(PR[i]);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = "#e8f1ff";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }, true);

  return <canvas ref={cref} />;
}
