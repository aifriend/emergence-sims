"use client";

/* Epidemic Spread (SIR, agent-based). Ported from the design bundle's sims/sir.jsx */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";

const S = 0,
  I = 1,
  R = 2;

type SirP = {
  pop: number;
  beta: number;
  recover: number;
  radius: number;
  speed: number;
  distancing: number;
};
type Agent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  t: number;
  moving: boolean;
};

export function SIR(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<SirP>({
    pop: 320,
    beta: 0.5,
    recover: 6,
    radius: 12,
    speed: 0.9,
    distancing: 0,
  });
  const [counts, setCounts] = useState({ s: 0, i: 0, r: 0 });
  const live = useLive(p);
  live.current = p;

  const ag = useRef<Agent[]>([]);
  const dim = useRef({ w: 1, h: 1 });
  const hist = useRef<{ s: number; i: number; r: number }[]>([]);
  const frame = useRef(0);
  const peak = useRef(0);

  const [cref, csize] = useCanvas((w, h) => {
    dim.current = { w, h };
    if (ag.current.length === 0) init();
  });

  function init() {
    const { w, h } = dim.current;
    const P = live.current;
    const a: Agent[] = [];
    for (let k = 0; k < P.pop; k++) {
      const moving = Math.random() > P.distancing;
      const ang = Math.random() * Math.PI * 2;
      a.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(ang),
        vy: Math.sin(ang),
        s: S,
        t: 0,
        moving,
      });
    }
    // seed a few infections near centre
    for (let k = 0; k < 3; k++) {
      a[k].s = I;
      a[k].t = P.recover;
      a[k].x = w / 2 + (Math.random() - 0.5) * 30;
      a[k].y = h / 2 + (Math.random() - 0.5) * 30;
    }
    ag.current = a;
    hist.current = [];
    frame.current = 0;
    peak.current = 0;
  }
  function reset() {
    init();
  }

  useRAF((dt) => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const P = live.current;
    const A = ag.current;
    const sp = P.speed * (dt / 16);

    if (running) {
      // move
      for (const a of A) {
        if (!a.moving) continue;
        a.x += a.vx * sp;
        a.y += a.vy * sp;
        if (a.x < 0 || a.x > w) {
          a.vx *= -1;
          a.x = Math.max(0, Math.min(w, a.x));
        }
        if (a.y < 0 || a.y > h) {
          a.vy *= -1;
          a.y = Math.max(0, Math.min(h, a.y));
        }
        if (Math.random() < 0.02) {
          const ang = Math.random() * Math.PI * 2;
          a.vx = Math.cos(ang);
          a.vy = Math.sin(ang);
        }
      }
      // spatial hash for contacts
      const rad = P.radius,
        r2 = rad * rad,
        cs = rad;
      const cols = Math.max(1, Math.ceil(w / cs)),
        rows = Math.max(1, Math.ceil(h / cs));
      const grid: (number[] | undefined)[] = new Array(cols * rows);
      for (let idx = 0; idx < A.length; idx++) {
        const a = A[idx];
        const cx = Math.min(cols - 1, Math.max(0, Math.floor(a.x / cs))),
          cy = Math.min(rows - 1, Math.max(0, Math.floor(a.y / cs)));
        const key = cy * cols + cx;
        (grid[key] || (grid[key] = [])).push(idx);
      }
      const perContact = 1 - Math.pow(1 - P.beta, dt / 200);
      for (let idx = 0; idx < A.length; idx++) {
        const a = A[idx];
        if (a.s !== I) continue;
        const cx = Math.min(cols - 1, Math.floor(a.x / cs)),
          cy = Math.min(rows - 1, Math.floor(a.y / cs));
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const nx = cx + ox,
              ny = cy + oy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const bucket = grid[ny * cols + nx];
            if (!bucket) continue;
            for (const j of bucket) {
              const b = A[j];
              if (b.s !== S) continue;
              const dx = b.x - a.x,
                dy = b.y - a.y;
              if (dx * dx + dy * dy < r2 && Math.random() < perContact) {
                b.s = I;
                b.t = P.recover;
              }
            }
          }
        // recovery
        a.t -= dt / 1000;
        if (a.t <= 0) a.s = R;
      }
    }

    // counts
    let s = 0,
      i = 0,
      r = 0;
    for (const a of A) {
      if (a.s === S) s++;
      else if (a.s === I) i++;
      else r++;
    }
    if (i > peak.current) peak.current = i;

    // draw agents
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    for (const a of A) {
      ctx.fillStyle =
        a.s === S
          ? "rgba(159,208,255,0.85)"
          : a.s === I
            ? "#ff7a1a"
            : "rgba(87,214,160,0.7)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.s === I ? 3 : 2.4, 0, 7);
      ctx.fill();
      if (a.s === I) {
        ctx.strokeStyle = "rgba(255,122,26,0.18)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, P.radius, 0, 7);
        ctx.stroke();
      }
    }

    if (running) {
      frame.current++;
      if (frame.current % 4 === 0) {
        hist.current.push({ s, i, r });
        if (hist.current.length > 260) hist.current.shift();
      }
      setCounts({ s, i, r });
    }
  }, true);

  const total = p.pop;
  const histPlot = hist.current;

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
            ● Infected &nbsp;
            <span style={{ color: "#9fd0ff" }}>● Susceptible</span>&nbsp;{" "}
            <span style={{ color: "var(--green)" }}>● Recovered</span>
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Pathogen">
            <Slider
              label="Transmission β"
              value={p.beta}
              min={0.05}
              max={1}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, beta: v }))}
            />
            <Slider
              label="Infectious period"
              value={p.recover}
              min={2}
              max={16}
              step={1}
              unit=" s"
              onChange={(v) => setP((o) => ({ ...o, recover: v }))}
            />
            <Slider
              label="Contact radius"
              value={p.radius}
              min={6}
              max={28}
              step={1}
              unit=" px"
              onChange={(v) => setP((o) => ({ ...o, radius: v }))}
            />
          </Group>
          <Group title="Population">
            <Slider
              label="Size"
              value={p.pop}
              min={60}
              max={600}
              step={20}
              onChange={(v) => {
                setP((o) => ({ ...o, pop: v }));
                // Resize the live agent array so the dot count actually changes.
                // Previously only Reset re-seeded, so dragging Size just rescaled
                // the readouts/curve against a population that wasn't on screen.
                const a = ag.current;
                const { w, h } = dim.current;
                while (a.length < v) {
                  const ang = Math.random() * Math.PI * 2;
                  a.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: Math.cos(ang),
                    vy: Math.sin(ang),
                    s: S,
                    t: 0,
                    moving: Math.random() > live.current.distancing,
                  });
                }
                if (a.length > v) a.length = v;
              }}
            />
            <Slider
              label="Mobility"
              value={p.speed}
              min={0.1}
              max={2.2}
              step={0.1}
              unit="×"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
            <Slider
              label="Distancing"
              value={p.distancing}
              min={0}
              max={0.9}
              step={0.05}
              fmt={(v) => Math.round(v * 100)}
              unit="%"
              onChange={(v) => setP((o) => ({ ...o, distancing: v }))}
            />
          </Group>
          <Btn onClick={reset}>Re-seed outbreak</Btn>
        </>
      }
      readouts={
        <>
          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <ReadOut k="S" v={counts.s} color="#9fd0ff" />
            <ReadOut k="I" v={counts.i} color="var(--accent-2)" />
            <ReadOut k="R" v={counts.r} color="var(--green)" />
          </div>
          <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
            <div className="label" style={{ marginBottom: 6 }}>
              Epidemic curve · peak {peak.current}
            </div>
            <MiniPlot
              height={84}
              max={total}
              series={[
                { data: histPlot.map((d) => d.s), color: "rgba(159,208,255,0.8)" },
                { data: histPlot.map((d) => d.r), color: "rgba(87,214,160,0.8)" },
                {
                  data: histPlot.map((d) => d.i),
                  color: "#ff7a1a",
                  fill: "rgba(255,122,26,0.18)",
                },
              ]}
            />
          </div>
        </>
      }
      footnote={
        <span>
          Every dot is a person; orange rings are the infectious radius. Lower
          mobility or transmission and you flatten the curve — the peak that
          matters for a hospital.
        </span>
      }
    />
  );
}

export function SirThumb(): ReactNode {
  const ag = useRef<Agent[]>([]);
  const reseed = useRef(0);
  const [cref, csize] = useCanvas((w, h) => {
    const a: Agent[] = [];
    for (let k = 0; k < 90; k++) {
      const an = Math.random() * 6.28;
      a.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(an),
        vy: Math.sin(an),
        s: 0,
        t: 0,
        moving: true,
      });
    }
    a[0].s = 1;
    a[0].t = 6;
    ag.current = a;
  });
  useRAF((dt) => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const A = ag.current;
    let inf = 0;
    for (const a of A) {
      if (a.s === 1) inf++;
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 0 || a.y > h) a.vy *= -1;
    }
    for (const a of A) {
      if (a.s !== 1) continue;
      a.t -= dt / 1000;
      if (a.t <= 0) a.s = 2;
      for (const b of A) {
        if (b.s !== 0) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y;
        if (dx * dx + dy * dy < 160) {
          b.s = 1;
          b.t = 6;
        }
      }
    }
    reseed.current += dt;
    if (inf === 0 && reseed.current > 1500) {
      reseed.current = 0;
      for (const a of A) a.s = 0;
      A[0].s = 1;
      A[0].t = 6;
    }
    ctx.clearRect(0, 0, w, h);
    for (const a of A) {
      ctx.fillStyle =
        a.s === 0
          ? "rgba(159,208,255,0.8)"
          : a.s === 1
            ? "#ff7a1a"
            : "rgba(87,214,160,0.6)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.4, 0, 7);
      ctx.fill();
    }
  }, true);
  return <canvas ref={cref} />;
}
