"use client";

/* Elementary Cellular Automaton (Wolfram's 1-D, 2-state, radius-1 rules).
   A spacetime diagram: each generation computes the next 1-D row and the history
   scrolls downward, newest row at the bottom. Same pure-model + canvas-renderer
   pattern as Life. */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Toggle, Transport } from "../controls";
import {
  FAMOUS,
  randomSeed,
  ruleLookup,
  singleSeed,
  stepRow,
} from "@/lib/ca/elementary";

const CELL = 4; // px per cell on stage
const PRESETS = [30, 90, 110, 184]; // surfaced as quick buttons
const BG = "#061b32";
const ALIVE = "#e8f1ff";

type SeedKind = "single" | "random";
type ElemP = { rule: number; speed: number; seed: SeedKind };

function makeSeed(width: number, kind: SeedKind): Uint8Array {
  return kind === "random" ? randomSeed(width, 0.5) : singleSeed(width);
}

export function Elementary(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<ElemP>({ rule: 90, speed: 24, seed: "single" });
  const [gen, setGen] = useState(0);
  const live = useLive(p);
  live.current = p;

  // rolling spacetime history: hist[0] is the oldest (top), last is newest (bottom)
  const hist = useRef<Uint8Array[]>([]);
  const cur = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const genRef = useRef(0);

  function seedFresh() {
    const { cols, rows } = dim.current;
    if (cols <= 0 || rows <= 0) return;
    const first = makeSeed(cols, live.current.seed);
    cur.current = first;
    hist.current = [first];
    genRef.current = 0;
  }

  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / CELL));
    const rows = Math.max(8, Math.floor(h / CELL));
    dim.current = { cols, rows };
    // rebuild from a fresh seed on (re)size, like Life rebuilds its grid
    seedFresh();
    draw();
  });

  function step() {
    const c = cur.current;
    if (!c) return;
    const next = stepRow(c, ruleLookup(live.current.rule));
    cur.current = next;
    const h = hist.current;
    h.push(next);
    const { rows } = dim.current;
    while (h.length > rows) h.shift();
    genRef.current++;
  }

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { cols, rows } = dim.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    const rec = hist.current;
    if (!rec.length) return;
    // newest row sits at the bottom; older rows stack upward
    ctx.fillStyle = ALIVE;
    const top = rows - rec.length; // empty rows above until history fills
    for (let r = 0; r < rec.length; r++) {
      const row = rec[r];
      const y = (top + r) * CELL;
      for (let x = 0; x < cols; x++) {
        if (row[x]) ctx.fillRect(x * CELL, y, CELL, CELL);
      }
    }
  }

  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const interval = 1000 / live.current.speed;
    let did = false;
    while (acc.current >= interval) {
      step();
      acc.current -= interval;
      did = true;
    }
    if (did) {
      draw();
      setGen(genRef.current);
    }
  }, true);

  // initial paint
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    acc.current = 0;
    seedFresh();
    setGen(0);
    draw();
  }

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <Btn
            onClick={() => {
              if (!running) {
                step();
                draw();
                setGen(genRef.current);
              }
            }}
            disabled={running}
          >
            Step ›
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Spacetime scrolls down</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Rule">
            <Slider
              label="Rule"
              value={p.rule}
              min={0}
              max={255}
              step={1}
              onChange={(v) => setP((o) => ({ ...o, rule: v }))}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESETS.map((r) => (
                <Btn
                  key={r}
                  on={p.rule === r}
                  onClick={() => setP((o) => ({ ...o, rule: r }))}
                >
                  {r}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={60}
              step={1}
              unit=" rows/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="ctl-name">Seed</span>
            <Toggle
              value={p.seed}
              options={[
                { label: "Single", value: "single" },
                { label: "Random", value: "random" },
              ]}
              onChange={(v) => {
                setP((o) => ({ ...o, seed: v }));
                // re-seed immediately so the change is visible
                live.current = { ...live.current, seed: v };
                reset();
              }}
            />
          </div>
        </>
      }
      readouts={
        <>
          <ReadOut k="Rule" v={p.rule} />
          <ReadOut k="Generation" v={gen} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          One integer 0–255 sets eight neighbourhood outputs; from that local
          recipe come fractals (90), chaos (30) and a Turing-complete machine
          (110). Pick a rule or a preset and watch the spacetime grow.
        </span>
      }
    />
  );
}

export function ElementaryThumb(): ReactNode {
  const hist = useRef<Uint8Array[]>([]);
  const cur = useRef<Uint8Array | null>(null);
  const dim = useRef({ cols: 0, rows: 0 });
  const acc = useRef(0);
  const lut = useRef(ruleLookup(90)); // Sierpinski preview
  const C = 3;
  const [cref, csize] = useCanvas((w, h) => {
    const cols = Math.max(8, Math.floor(w / C));
    const rows = Math.max(8, Math.floor(h / C));
    dim.current = { cols, rows };
    const first = singleSeed(cols);
    cur.current = first;
    hist.current = [first];
  });
  useRAF((dt) => {
    acc.current += dt;
    if (acc.current < 70) return;
    acc.current = 0;
    const { cols, rows } = dim.current;
    const c = cur.current;
    if (!c) return;
    const next = stepRow(c, lut.current);
    cur.current = next;
    const h = hist.current;
    h.push(next);
    while (h.length > rows) h.shift();
    // restart the fractal once it scrolls off the top
    if (h.length >= rows) {
      const first = singleSeed(cols);
      cur.current = first;
      hist.current = [first];
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h: hh } = csize.current;
    ctx.clearRect(0, 0, w, hh);
    ctx.fillStyle = "rgba(232,241,255,0.92)";
    const rec = hist.current;
    const top = rows - rec.length;
    for (let r = 0; r < rec.length; r++) {
      const row = rec[r];
      const y = (top + r) * C;
      for (let x = 0; x < cols; x++) if (row[x]) ctx.fillRect(x * C, y, C, C);
    }
  }, true);
  return <canvas ref={cref} />;
}
