"use client";

/* Ant Colony (stigmergy). Ported from the design bundle's sims/ants.jsx */
import { useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Group, ReadOut, Slider, SimLayout, Transport } from "../controls";

const CELL = 5;

type AntP = {
  ants: number;
  evap: number;
  deposit: number;
  sensor: number;
  wander: number;
};
type Ant = { x: number; y: number; a: number; carry: boolean };
type Grid = {
  cols: number;
  rows: number;
  pher: Float32Array;
  food: Float32Array;
  off: HTMLCanvasElement;
  octx: CanvasRenderingContext2D;
  img: ImageData;
};

export function AntColony(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<AntP>({
    ants: 200,
    evap: 0.985,
    deposit: 60,
    sensor: 9,
    wander: 0.5,
  });
  const [stat, setStat] = useState({ food: 0, remaining: 0 });
  const live = useLive(p);
  live.current = p;

  const grid = useRef<Grid | null>(null);
  const ants = useRef<Ant[]>([]);
  const nest = useRef({ x: 0, y: 0 });
  const dim = useRef({ w: 1, h: 1 });
  const collected = useRef(0);

  const [cref, csize] = useCanvas((w, h) => {
    dim.current = { w, h };
    setup();
  });

  function placeFood(gx: number, gy: number, radius: number, amount: number) {
    const g = grid.current;
    if (!g) return;
    for (let y = -radius; y <= radius; y++)
      for (let x = -radius; x <= radius; x++) {
        const cx = gx + x,
          cy = gy + y;
        if (cx < 0 || cy < 0 || cx >= g.cols || cy >= g.rows) continue;
        if (x * x + y * y <= radius * radius) g.food[cy * g.cols + cx] = amount;
      }
  }

  function setup() {
    const { w, h } = dim.current;
    const cols = Math.max(8, Math.ceil(w / CELL)),
      rows = Math.max(8, Math.ceil(h / CELL));
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d");
    if (!octx) return;
    grid.current = {
      cols,
      rows,
      pher: new Float32Array(cols * rows),
      food: new Float32Array(cols * rows),
      off,
      octx,
      img: octx.createImageData(cols, rows),
    };
    nest.current = { x: w / 2, y: h / 2 };
    // food clusters
    collected.current = 0;
    const clusters = 3;
    for (let c = 0; c < clusters; c++) {
      const ang = (c / clusters) * Math.PI * 2 + 0.6;
      const dist = Math.min(w, h) * 0.36;
      const fx = Math.floor((w / 2 + Math.cos(ang) * dist) / CELL);
      const fy = Math.floor((h / 2 + Math.sin(ang) * dist) / CELL);
      placeFood(fx, fy, 6, 1);
    }
    // ants
    spawn(live.current.ants);
  }
  function spawn(n: number) {
    const a: Ant[] = [];
    const { x, y } = nest.current;
    for (let i = 0; i < n; i++)
      a.push({ x, y, a: Math.random() * Math.PI * 2, carry: false });
    ants.current = a;
  }
  function setAnts(n: number) {
    setP((o) => ({ ...o, ants: n }));
    const a = ants.current;
    const { x, y } = nest.current;
    if (n > a.length) {
      for (let i = a.length; i < n; i++)
        a.push({ x, y, a: Math.random() * 6.28, carry: false });
    } else a.length = n;
  }
  function reset() {
    setup();
  }

  function sense(g: Grid, x: number, y: number, ang: number, d: number): number {
    const sx = x + Math.cos(ang) * d,
      sy = y + Math.sin(ang) * d;
    const cx = Math.floor(sx / CELL),
      cy = Math.floor(sy / CELL);
    if (cx < 1 || cy < 1 || cx >= g.cols - 1 || cy >= g.rows - 1) return -1;
    let s = 0;
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) s += g.pher[(cy + oy) * g.cols + cx + ox];
    return s;
  }

  useRAF(() => {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const P = live.current;
    const g = grid.current;
    if (!g) return;
    const A = ants.current;
    const N = nest.current;
    const SA = 0.7,
      turn = 0.5,
      sd = P.sensor;

    if (running) {
      for (const ant of A) {
        if (ant.carry) {
          // head home
          const dxh = N.x - ant.x,
            dyh = N.y - ant.y;
          const target = Math.atan2(dyh, dxh);
          const diff = ((target - ant.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          ant.a +=
            Math.max(-0.3, Math.min(0.3, diff)) + (Math.random() - 0.5) * 0.2;
          // deposit pheromone
          const ci =
            Math.floor(ant.y / CELL) * g.cols + Math.floor(ant.x / CELL);
          if (ci >= 0 && ci < g.pher.length)
            g.pher[ci] = Math.min(255, g.pher[ci] + P.deposit);
          if (dxh * dxh + dyh * dyh < 100) {
            ant.carry = false;
            collected.current++;
            ant.a += Math.PI + (Math.random() - 0.5);
          }
        } else {
          // follow pheromone
          const sc = sense(g, ant.x, ant.y, ant.a, sd);
          const sl = sense(g, ant.x, ant.y, ant.a - SA, sd);
          const sr = sense(g, ant.x, ant.y, ant.a + SA, sd);
          if (sc >= sl && sc >= sr) {
            /* straight */
          } else if (sl > sr) ant.a -= turn;
          else if (sr > sl) ant.a += turn;
          ant.a += (Math.random() - 0.5) * P.wander;
          // food pickup
          const fx = Math.floor(ant.x / CELL),
            fy = Math.floor(ant.y / CELL);
          if (
            fx >= 0 &&
            fy >= 0 &&
            fx < g.cols &&
            fy < g.rows &&
            g.food[fy * g.cols + fx] > 0
          ) {
            g.food[fy * g.cols + fx] -= 0.02;
            ant.carry = true;
            ant.a += Math.PI;
          }
        }
        // move
        ant.x += Math.cos(ant.a) * 1.4;
        ant.y += Math.sin(ant.a) * 1.4;
        if (ant.x < 2) {
          ant.x = 2;
          ant.a = Math.PI - ant.a;
        }
        if (ant.x > w - 2) {
          ant.x = w - 2;
          ant.a = Math.PI - ant.a;
        }
        if (ant.y < 2) {
          ant.y = 2;
          ant.a = -ant.a;
        }
        if (ant.y > h - 2) {
          ant.y = h - 2;
          ant.a = -ant.a;
        }
      }
      // evaporate
      const pher = g.pher,
        ev = P.evap;
      for (let i = 0; i < pher.length; i++) pher[i] *= ev;
    }

    // ---- render pheromone field to offscreen, scale up ----
    const img = g.img.data;
    const pher = g.pher,
      food = g.food;
    for (let i = 0; i < pher.length; i++) {
      const v = pher[i];
      const f = food[i];
      let r: number, gg: number, b: number, al: number;
      if (f > 0.01) {
        r = 87;
        gg = 214;
        b = 160;
        al = 235;
      } // food = green
      else if (v > 0.5) {
        // trail = orange
        const t = Math.min(1, v / 90);
        r = 255;
        gg = 122 + t * 40;
        b = 26;
        al = Math.min(220, 30 + t * 230);
      } else {
        r = 0;
        gg = 0;
        b = 0;
        al = 0;
      }
      const k = i * 4;
      img[k] = r;
      img[k + 1] = gg;
      img[k + 2] = b;
      img[k + 3] = al;
    }
    g.octx.putImageData(g.img, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(g.off, 0, 0, g.cols, g.rows, 0, 0, w, h);

    // ants
    for (const ant of A) {
      ctx.fillStyle = ant.carry ? "#ffd9a8" : "rgba(232,241,255,0.92)";
      ctx.fillRect(ant.x - 1, ant.y - 1, 2.2, 2.2);
    }
    // nest
    ctx.strokeStyle = "#ff7a1a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(N.x, N.y, 9, 0, 7);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,122,26,0.18)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,162,81,0.9)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("NEST", N.x - 12, N.y - 13);

    if (running) {
      let rem = 0;
      for (let i = 0; i < food.length; i++) rem += food[i];
      setStat({
        food: collected.current,
        remaining: Math.max(0, Math.round(rem)),
      });
    }
  }, true);

  function addFoodAt(e: MouseEvent) {
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / CELL),
      gy = Math.floor((e.clientY - r.top) / CELL);
    placeFood(gx, gy, 6, 1);
  }

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={addFoodAt}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Click stage to drop food</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Colony">
            <Slider
              label="Ants"
              value={p.ants}
              min={30}
              max={400}
              step={10}
              onChange={setAnts}
            />
            <Slider
              label="Sensor reach"
              value={p.sensor}
              min={4}
              max={20}
              step={1}
              unit=" px"
              onChange={(v) => setP((o) => ({ ...o, sensor: v }))}
            />
            <Slider
              label="Wander"
              value={p.wander}
              min={0}
              max={1.2}
              step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, wander: v }))}
            />
          </Group>
          <Group title="Pheromone">
            <Slider
              label="Deposit strength"
              value={p.deposit}
              min={10}
              max={120}
              step={5}
              onChange={(v) => setP((o) => ({ ...o, deposit: v }))}
            />
            <Slider
              label="Evaporation"
              value={p.evap}
              min={0.95}
              max={0.998}
              step={0.001}
              fmt={(v) => v.toFixed(3)}
              onChange={(v) => setP((o) => ({ ...o, evap: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Food home" v={stat.food} color="var(--accent-2)" />
          <ReadOut k="Food left" v={stat.remaining} color="var(--green)" />
        </>
      }
      footnote={
        <span>
          No ant sees the big picture. Each lays scent on the way home and
          follows the strongest scent out. Shortest paths reinforce themselves —
          the trail is a memory the colony writes on the ground.
        </span>
      }
    />
  );
}

export function AntsThumb(): ReactNode {
  const grid = useRef<Grid | null>(null);
  const ants = useRef<Ant[]>([]);
  const nest = useRef({ x: 0, y: 0 });
  const C = 5;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.ceil(w / C),
      rows = Math.ceil(h / C);
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d");
    if (!octx) return;
    const food = new Float32Array(cols * rows);
    for (let c = 0; c < 2; c++) {
      const ang = c * 2.6 + 0.6,
        d = Math.min(w, h) * 0.35;
      const fx = Math.floor((w / 2 + Math.cos(ang) * d) / C),
        fy = Math.floor((h / 2 + Math.sin(ang) * d) / C);
      for (let y = -4; y <= 4; y++)
        for (let x = -4; x <= 4; x++) {
          const cx = fx + x,
            cy = fy + y;
          if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && x * x + y * y <= 16)
            food[cy * cols + cx] = 1;
        }
    }
    grid.current = {
      cols,
      rows,
      pher: new Float32Array(cols * rows),
      food,
      off,
      octx,
      img: octx.createImageData(cols, rows),
    };
    nest.current = { x: w / 2, y: h / 2 };
    const a: Ant[] = [];
    for (let i = 0; i < 70; i++)
      a.push({ x: w / 2, y: h / 2, a: Math.random() * 6.28, carry: false });
    ants.current = a;
  });
  useRAF(() => {
    const g = grid.current;
    if (!g) return;
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const A = ants.current;
    const N = nest.current;
    const sense = (x: number, y: number, ang: number): number => {
      const sx = x + Math.cos(ang) * 7,
        sy = y + Math.sin(ang) * 7;
      const cx = Math.floor(sx / C),
        cy = Math.floor(sy / C);
      if (cx < 1 || cy < 1 || cx >= g.cols - 1 || cy >= g.rows - 1) return -1;
      return g.pher[cy * g.cols + cx];
    };
    for (const ant of A) {
      if (ant.carry) {
        const t = Math.atan2(N.y - ant.y, N.x - ant.x);
        const d = ((t - ant.a + 9.42) % 6.28) - 3.14;
        ant.a += Math.max(-0.3, Math.min(0.3, d));
        const ci = Math.floor(ant.y / C) * g.cols + Math.floor(ant.x / C);
        if (ci >= 0 && ci < g.pher.length)
          g.pher[ci] = Math.min(255, g.pher[ci] + 55);
        if ((N.x - ant.x) ** 2 + (N.y - ant.y) ** 2 < 90) {
          ant.carry = false;
          ant.a += 3.14;
        }
      } else {
        const sc = sense(ant.x, ant.y, ant.a),
          sl = sense(ant.x, ant.y, ant.a - 0.7),
          sr = sense(ant.x, ant.y, ant.a + 0.7);
        if (sc >= sl && sc >= sr) {
          /* straight */
        } else if (sl > sr) ant.a -= 0.5;
        else ant.a += 0.5;
        ant.a += (Math.random() - 0.5) * 0.5;
        const fx = Math.floor(ant.x / C),
          fy = Math.floor(ant.y / C);
        if (
          fx >= 0 &&
          fy >= 0 &&
          fx < g.cols &&
          fy < g.rows &&
          g.food[fy * g.cols + fx] > 0
        ) {
          ant.carry = true;
          ant.a += 3.14;
        }
      }
      ant.x += Math.cos(ant.a) * 1.3;
      ant.y += Math.sin(ant.a) * 1.3;
      if (ant.x < 2 || ant.x > w - 2) ant.a = 3.14 - ant.a;
      if (ant.y < 2 || ant.y > h - 2) ant.a = -ant.a;
      ant.x = Math.max(2, Math.min(w - 2, ant.x));
      ant.y = Math.max(2, Math.min(h - 2, ant.y));
    }
    for (let i = 0; i < g.pher.length; i++) g.pher[i] *= 0.985;
    const img = g.img.data;
    for (let i = 0; i < g.pher.length; i++) {
      const v = g.pher[i],
        f = g.food[i];
      const k = i * 4;
      if (f > 0.01) {
        img[k] = 87;
        img[k + 1] = 214;
        img[k + 2] = 160;
        img[k + 3] = 230;
      } else if (v > 0.5) {
        const t = Math.min(1, v / 90);
        img[k] = 255;
        img[k + 1] = 122 + t * 40;
        img[k + 2] = 26;
        img[k + 3] = Math.min(220, 30 + t * 230);
      } else img[k + 3] = 0;
    }
    g.octx.putImageData(g.img, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(g.off, 0, 0, g.cols, g.rows, 0, 0, w, h);
    ctx.fillStyle = "rgba(232,241,255,0.85)";
    for (const ant of A) ctx.fillRect(ant.x - 1, ant.y - 1, 2, 2);
    ctx.strokeStyle = "#ff7a1a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(N.x, N.y, 6, 0, 7);
    ctx.stroke();
  }, true);
  return <canvas ref={cref} />;
}
