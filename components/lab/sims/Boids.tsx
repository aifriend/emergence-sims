"use client";

/* Flocking — Reynolds boids. Ported from the design bundle's sims/boids.jsx */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, Slider, SimLayout, Toggle, Transport } from "../controls";

type BoidP = {
  count: number;
  sep: number;
  ali: number;
  coh: number;
  speed: number;
  view: number;
  trails: boolean;
};
type Boid = { x: number; y: number; vx: number; vy: number };

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function makeFlock(n: number, w: number, h: number): Boid[] {
  const a: Boid[] = [];
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2);
    a.push({ x: rand(0, w), y: rand(0, h), vx: Math.cos(ang), vy: Math.sin(ang) });
  }
  return a;
}

export function Boids(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<BoidP>({
    count: 160,
    sep: 1.5,
    ali: 1.0,
    coh: 0.9,
    speed: 2.6,
    view: 46,
    trails: true,
  });
  const [fps, setFps] = useState(0);
  const live = useLive(p);
  live.current = p;

  const boidsRef = useRef<Boid[]>([]);
  const fpsRef = useRef({ t: 0, n: 0 });

  const [cref, csize] = useCanvas((w, h) => {
    if (boidsRef.current.length === 0)
      boidsRef.current = makeFlock(live.current.count, w, h);
  });

  function reset() {
    const { w, h } = csize.current;
    boidsRef.current = makeFlock(live.current.count, w, h);
  }

  function setCount(c: number) {
    setP((o) => ({ ...o, count: c }));
    const arr = boidsRef.current;
    const { w, h } = csize.current;
    if (c > arr.length) arr.push(...makeFlock(c - arr.length, w, h));
    else arr.length = c;
  }

  useRAF((dt) => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const P = live.current;
    const B = boidsRef.current;
    const vr = P.view,
      vr2 = vr * vr;
    const maxS = P.speed;

    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      let ax = 0,
        ay = 0,
        cx = 0,
        cy = 0,
        sx = 0,
        sy = 0,
        hx = 0,
        hy = 0,
        cnt = 0;
      for (let j = 0; j < B.length; j++) {
        if (i === j) continue;
        const o = B[j];
        let dx = o.x - b.x,
          dy = o.y - b.y;
        // wrap-aware distance
        if (dx > w / 2) dx -= w;
        else if (dx < -w / 2) dx += w;
        if (dy > h / 2) dy -= h;
        else if (dy < -h / 2) dy += h;
        const d2 = dx * dx + dy * dy;
        if (d2 < vr2 && d2 > 0.0001) {
          cnt++;
          cx += dx;
          cy += dy; // cohesion vector (toward)
          hx += o.vx;
          hy += o.vy; // alignment
          const inv = 1 / d2;
          sx -= dx * inv;
          sy -= dy * inv; // separation
        }
      }
      if (cnt > 0) {
        ax += (cx / cnt) * 0.0012 * P.coh;
        ay += (cy / cnt) * 0.0012 * P.coh;
        ax += (hx / cnt - b.vx) * 0.05 * P.ali;
        ay += (hy / cnt - b.vy) * 0.05 * P.ali;
        ax += sx * 0.9 * P.sep;
        ay += sy * 0.9 * P.sep;
      }
      b.vx += ax;
      b.vy += ay;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      if (sp > maxS) {
        b.vx = (b.vx / sp) * maxS;
        b.vy = (b.vy / sp) * maxS;
      } else if (sp < maxS * 0.5) {
        b.vx = (b.vx / sp) * maxS * 0.5;
        b.vy = (b.vy / sp) * maxS * 0.5;
      }
      b.x += b.vx * (dt / 16);
      b.y += b.vy * (dt / 16);
      if (b.x < 0) b.x += w;
      else if (b.x >= w) b.x -= w;
      if (b.y < 0) b.y += h;
      else if (b.y >= h) b.y -= h;
    }

    // draw
    if (P.trails) {
      ctx.fillStyle = "rgba(6,27,50,0.22)";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#061b32";
      ctx.fillRect(0, 0, w, h);
    }

    for (let i = 0; i < B.length; i++) {
      const b = B[i];
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = i % 9 === 0 ? "#ff7a1a" : "rgba(214,231,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, 3);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, -3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // fps
    const f = fpsRef.current;
    f.n++;
    f.t += dt;
    if (f.t > 500) {
      setFps(Math.round(1000 / (f.t / f.n)));
      f.t = 0;
      f.n = 0;
    }
  }, running);

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
          <span className="label tnum nowrap">
            {fps} FPS · {p.count} AGENTS
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Population">
            <Slider
              label="Agents"
              value={p.count}
              min={20}
              max={360}
              step={10}
              onChange={setCount}
            />
            <Slider
              label="Max speed"
              value={p.speed}
              min={1}
              max={5}
              step={0.1}
              unit=" px"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
            <Slider
              label="Vision radius"
              value={p.view}
              min={20}
              max={90}
              step={2}
              unit=" px"
              onChange={(v) => setP((o) => ({ ...o, view: v }))}
            />
          </Group>
          <Group title="Steering rules">
            <Slider
              label="Separation"
              value={p.sep}
              min={0}
              max={3}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, sep: v }))}
            />
            <Slider
              label="Alignment"
              value={p.ali}
              min={0}
              max={3}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, ali: v }))}
            />
            <Slider
              label="Cohesion"
              value={p.coh}
              min={0}
              max={3}
              step={0.05}
              onChange={(v) => setP((o) => ({ ...o, coh: v }))}
            />
          </Group>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="ctl-name">Motion trails</span>
            <Toggle
              value={p.trails}
              options={[
                { label: "On", value: true },
                { label: "Off", value: false },
              ]}
              onChange={(v) => setP((o) => ({ ...o, trails: v }))}
            />
          </div>
        </>
      }
      footnote={
        <span>
          Each agent follows three local rules —{" "}
          <b style={{ color: "var(--accent-2)" }}>separation</b>, alignment,
          cohesion. No leader, no plan: the flock is an emergent property of the
          swarm.
        </span>
      }
    />
  );
}

export function BoidsThumb(): ReactNode {
  const arr = useRef<Boid[]>([]);
  const [cref, csize] = useCanvas((w, h) => {
    arr.current = makeFlock(40, w, h);
  });
  useRAF(() => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const B = arr.current;
    ctx.fillStyle = "rgba(6,27,50,0.30)";
    ctx.fillRect(0, 0, w, h);
    for (const b of B) {
      let ax = 0,
        ay = 0,
        hx = 0,
        hy = 0,
        cx = 0,
        cy = 0,
        sx = 0,
        sy = 0,
        c = 0;
      for (const o of B) {
        if (o === b) continue;
        const dx = o.x - b.x,
          dy = o.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 2500 && d2 > 1) {
          c++;
          cx += dx;
          cy += dy;
          hx += o.vx;
          hy += o.vy;
          sx -= dx / d2;
          sy -= dy / d2;
        }
      }
      if (c) {
        ax += (cx / c) * 0.001 + (hx / c - b.vx) * 0.05 + sx * 0.8;
        ay += (cy / c) * 0.001 + (hy / c - b.vy) * 0.05 + sy * 0.8;
      }
      b.vx += ax;
      b.vy += ay;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / sp) * 1.8;
      b.vy = (b.vy / sp) * 1.8;
      b.x = (b.x + b.vx + w) % w;
      b.y = (b.y + b.vy + h) % h;
      ctx.fillStyle = "rgba(214,231,255,0.9)";
      ctx.fillRect(b.x, b.y, 2, 2);
    }
  }, true);
  return <canvas ref={cref} />;
}
