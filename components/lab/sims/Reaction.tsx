"use client";

/* Reaction–Diffusion (Gray–Scott). Ported from the design bundle's sims/reaction.jsx */
import { useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, Slider, SimLayout, Transport } from "../controls";

const CELL = 5;
const PRESETS: Record<string, { f: number; k: number }> = {
  Coral: { f: 0.0545, k: 0.062 },
  Mitosis: { f: 0.0367, k: 0.0649 },
  Maze: { f: 0.029, k: 0.057 },
  Spots: { f: 0.025, k: 0.06 },
};

type ReactP = { f: number; k: number; speed: number; preset: string };
type RDGrid = {
  cols: number;
  rows: number;
  A: Float32Array;
  B: Float32Array;
  A2: Float32Array;
  B2: Float32Array;
  off: HTMLCanvasElement;
  octx: CanvasRenderingContext2D;
  img: ImageData;
};

export function ReactionDiffusion(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<ReactP>({ f: 0.0545, k: 0.062, speed: 8, preset: "Coral" });
  const live = useLive(p);
  live.current = p;

  const g = useRef<RDGrid | null>(null);
  const dim = useRef({ w: 1, h: 1 });

  const [cref, csize] = useCanvas((w, h) => {
    dim.current = { w, h };
    setup();
  });

  function seed(cx: number, cy: number, r: number) {
    const G = g.current;
    if (!G) return;
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const ix = cx + x,
          iy = cy + y;
        if (ix < 0 || iy < 0 || ix >= G.cols || iy >= G.rows) continue;
        if (x * x + y * y <= r * r) G.B[iy * G.cols + ix] = 1;
      }
  }
  function setup() {
    const { w, h } = dim.current;
    const cols = Math.max(8, Math.ceil(w / CELL)),
      rows = Math.max(8, Math.ceil(h / CELL));
    const n = cols * rows;
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d");
    if (!octx) return;
    const A = new Float32Array(n).fill(1),
      B = new Float32Array(n);
    g.current = {
      cols,
      rows,
      A,
      B,
      A2: new Float32Array(n),
      B2: new Float32Array(n),
      off,
      octx,
      img: octx.createImageData(cols, rows),
    };
    // a few seeds
    for (let s = 0; s < 6; s++)
      seed((Math.random() * cols) | 0, (Math.random() * rows) | 0, 4);
    seed((cols / 2) | 0, (rows / 2) | 0, 6);
  }
  function reset() {
    setup();
  }

  function applyPreset(name: string) {
    const pr = PRESETS[name];
    setP((o) => ({ ...o, preset: name, f: pr.f, k: pr.k }));
  }

  useRAF(() => {
    const G = g.current;
    if (!G) return;
    const P = live.current;
    const { cols, rows } = G;
    const Da = 1.0,
      Db = 0.5,
      f = P.f,
      k = P.k;

    if (running) {
      let A = G.A,
        B = G.B,
        A2 = G.A2,
        B2 = G.B2;
      // Bound per-frame work: full `speed` × rows×cols can blow the frame
      // budget on a large canvas and hitch. Cap total cell-updates per frame.
      const itCap = Math.max(1, Math.min(P.speed, Math.floor(240000 / (rows * cols))));
      for (let it = 0; it < itCap; it++) {
        for (let y = 0; y < rows; y++) {
          const ym = (y - 1 + rows) % rows,
            yp = (y + 1) % rows;
          for (let x = 0; x < cols; x++) {
            const xm = (x - 1 + cols) % cols,
              xp = (x + 1) % cols;
            const i = y * cols + x;
            const a = A[i],
              b = B[i];
            // laplacian (orthogonal .2, diagonal .05, center -1)
            const lapA =
              A[ym * cols + x] * 0.2 +
              A[yp * cols + x] * 0.2 +
              A[y * cols + xm] * 0.2 +
              A[y * cols + xp] * 0.2 +
              A[ym * cols + xm] * 0.05 +
              A[ym * cols + xp] * 0.05 +
              A[yp * cols + xm] * 0.05 +
              A[yp * cols + xp] * 0.05 -
              a;
            const lapB =
              B[ym * cols + x] * 0.2 +
              B[yp * cols + x] * 0.2 +
              B[y * cols + xm] * 0.2 +
              B[y * cols + xp] * 0.2 +
              B[ym * cols + xm] * 0.05 +
              B[ym * cols + xp] * 0.05 +
              B[yp * cols + xm] * 0.05 +
              B[yp * cols + xp] * 0.05 -
              b;
            const abb = a * b * b;
            const na = a + (Da * lapA - abb + f * (1 - a));
            const nb = b + (Db * lapB + abb - (k + f) * b);
            A2[i] = na < 0 ? 0 : na > 1 ? 1 : na;
            B2[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
          }
        }
        const tA = A;
        A = A2;
        A2 = tA;
        const tB = B;
        B = B2;
        B2 = tB;
      }
      G.A = A;
      G.B = B;
      G.A2 = A2;
      G.B2 = B2;
    }

    // render B field
    const img = G.img.data,
      B = G.B;
    for (let i = 0; i < B.length; i++) {
      const v = B[i]; // 0..~0.4
      const t = Math.min(1, v / 0.35);
      const k4 = i * 4;
      // blueprint base -> orange ridges
      img[k4] = 255 * t + 8 * (1 - t);
      img[k4 + 1] = 122 * t + 30 * (1 - t);
      img[k4 + 2] = 26 * t + 60 * (1 - t);
      img[k4 + 3] = 255;
    }
    G.octx.putImageData(G.img, 0, 0);
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(G.off, 0, 0, G.cols, G.rows, 0, 0, w, h);
  }, true);

  function paint(e: MouseEvent) {
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    seed(
      Math.floor((e.clientX - r.left) / CELL),
      Math.floor((e.clientY - r.top) / CELL),
      5,
    );
  }

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "crosshair" }}
          onMouseDown={paint}
          onMouseMove={(e) => {
            if (e.buttons) paint(e);
          }}
        />
      }
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Click stage to inject reagent</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Pattern preset">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(PRESETS).map((name) => (
                <Btn
                  key={name}
                  accent
                  on={p.preset === name}
                  onClick={() => applyPreset(name)}
                >
                  {name}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Gray–Scott rates">
            <Slider
              label="Feed  f"
              value={p.f}
              min={0.01}
              max={0.1}
              step={0.0005}
              fmt={(v) => v.toFixed(4)}
              onChange={(v) => setP((o) => ({ ...o, f: v, preset: "—" }))}
            />
            <Slider
              label="Kill  k"
              value={p.k}
              min={0.045}
              max={0.07}
              step={0.0005}
              fmt={(v) => v.toFixed(4)}
              onChange={(v) => setP((o) => ({ ...o, k: v, preset: "—" }))}
            />
          </Group>
          <Group title="Integration">
            <Slider
              label="Steps / frame"
              value={p.speed}
              min={1}
              max={16}
              step={1}
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
        </>
      }
      footnote={
        <span>
          Two chemicals diffuse and react: one feeds, one kills. From a uniform
          soup, Alan Turing&apos;s mechanism grows spots, mazes and coral — the
          same maths behind the patterns on shells and skins.
        </span>
      }
    />
  );
}

export function ReactionThumb(): ReactNode {
  const g = useRef<RDGrid | null>(null);
  const C = 4;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.ceil(w / C),
      rows = Math.ceil(h / C),
      n = cols * rows;
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const octx = off.getContext("2d");
    if (!octx) return;
    const A = new Float32Array(n).fill(1),
      B = new Float32Array(n);
    for (let s = 0; s < 5; s++) {
      const cx = (Math.random() * cols) | 0,
        cy = (Math.random() * rows) | 0;
      for (let y = -3; y <= 3; y++)
        for (let x = -3; x <= 3; x++) {
          const ix = cx + x,
            iy = cy + y;
          if (ix >= 0 && iy >= 0 && ix < cols && iy < rows) B[iy * cols + ix] = 1;
        }
    }
    g.current = {
      cols,
      rows,
      A,
      B,
      A2: new Float32Array(n),
      B2: new Float32Array(n),
      off,
      octx,
      img: octx.createImageData(cols, rows),
    };
  });
  useRAF(() => {
    const G = g.current;
    if (!G) return;
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { cols, rows } = G;
    const f = 0.0545,
      k = 0.062,
      Da = 1,
      Db = 0.5;
    let A = G.A,
      B = G.B,
      A2 = G.A2,
      B2 = G.B2;
    for (let it = 0; it < 6; it++) {
      for (let y = 0; y < rows; y++) {
        const ym = (y - 1 + rows) % rows,
          yp = (y + 1) % rows;
        for (let x = 0; x < cols; x++) {
          const xm = (x - 1 + cols) % cols,
            xp = (x + 1) % cols;
          const i = y * cols + x;
          const a = A[i],
            b = B[i];
          const lapA =
            A[ym * cols + x] * 0.2 +
            A[yp * cols + x] * 0.2 +
            A[y * cols + xm] * 0.2 +
            A[y * cols + xp] * 0.2 +
            A[ym * cols + xm] * 0.05 +
            A[ym * cols + xp] * 0.05 +
            A[yp * cols + xm] * 0.05 +
            A[yp * cols + xp] * 0.05 -
            a;
          const lapB =
            B[ym * cols + x] * 0.2 +
            B[yp * cols + x] * 0.2 +
            B[y * cols + xm] * 0.2 +
            B[y * cols + xp] * 0.2 +
            B[ym * cols + xm] * 0.05 +
            B[ym * cols + xp] * 0.05 +
            B[yp * cols + xm] * 0.05 +
            B[yp * cols + xp] * 0.05 -
            b;
          const abb = a * b * b;
          const na = a + (Da * lapA - abb + f * (1 - a));
          const nb = b + (Db * lapB + abb - (k + f) * b);
          A2[i] = na < 0 ? 0 : na > 1 ? 1 : na;
          B2[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
        }
      }
      let t = A;
      A = A2;
      A2 = t;
      t = B;
      B = B2;
      B2 = t;
    }
    G.A = A;
    G.B = B;
    G.A2 = A2;
    G.B2 = B2;
    const img = G.img.data;
    for (let i = 0; i < B.length; i++) {
      const tt = Math.min(1, B[i] / 0.35);
      const k4 = i * 4;
      img[k4] = 255 * tt + 8 * (1 - tt);
      img[k4 + 1] = 122 * tt + 30 * (1 - tt);
      img[k4 + 2] = 26 * tt + 60 * (1 - tt);
      img[k4 + 3] = 255;
    }
    G.octx.putImageData(G.img, 0, 0);
    const { w, h } = csize.current;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(G.off, 0, 0, G.cols, G.rows, 0, 0, w, h);
  }, true);
  return <canvas ref={cref} />;
}
