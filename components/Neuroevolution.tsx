"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Brain,
  Car,
  DEMOS,
  SENSOR_ANGLES,
  SENSOR_LENGTH,
  Track,
  TRACKS,
  type BrainWeights,
} from "@/lib/neuroevolution";

const BRAIN_URL = "/brains/monaco-champion.json";

type Stats = {
  track: string;
  laps: number;
  speed: number;
  progress: number;
};

/**
 * Top-down 2D racer hero. A pre-trained (evolved) net drives the champion's
 * curriculum of tracks. Pure 2D canvas — the validated physics lives in
 * lib/neuroevolution.ts and is never touched here; we only fetch the weights,
 * tick the car, and draw.
 */
export default function Neuroevolution(): ReactNode {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);
  const [demoId, setDemoId] = useState<string>(DEMOS[0].id);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(2); // physics steps per frame
  const [showSensors, setShowSensors] = useState(true);
  const [stats, setStats] = useState<Stats>({
    track: DEMOS[0].name,
    laps: 0,
    speed: 0,
    progress: 0,
  });

  // UI → loop live refs (loop is built once; params flow through refs)
  const demoRef = useRef(demoId);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const sensorsRef = useRef(showSensors);
  demoRef.current = demoId;
  runningRef.current = running;
  speedRef.current = speed;
  sensorsRef.current = showSensors;

  // brain weights, fetched once at mount
  const weightsRef = useRef<BrainWeights | null>(null);
  // sim objects (rebuilt on track switch / respawn)
  const trackRef = useRef<Track | null>(null);
  const brainRef = useRef<Brain | null>(null);
  const carRef = useRef<Car | null>(null);
  const lapsRef = useRef(0);
  // when the UI selects a different track, the loop rebuilds at the next frame
  const builtDemoRef = useRef<string>("");

  // ── load the champion brain ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(BRAIN_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`brain ${r.status}`);
        return r.json();
      })
      .then((json: BrainWeights) => {
        if (cancelled) return;
        weightsRef.current = json;
        setReady(true);
      })
      .catch((err) => {
        // leave `ready` false → the overlay stays up with a hint
        console.error("neuroevolution: failed to load brain", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── build / rebuild a demo (track + brain level + fresh car) ────────────────
  function buildDemo(id: string): void {
    const weights = weightsRef.current;
    if (!weights) return;
    const demo = DEMOS.find((d) => d.id === id) ?? DEMOS[0];
    const def = TRACKS[demo.id];
    if (!def) return;
    const track = new Track(def, demo.width);
    const brain = new Brain(weights);
    brain.setLevel(demo.level);
    trackRef.current = track;
    brainRef.current = brain;
    carRef.current = new Car(track, brain);
    lapsRef.current = 0;
    builtDemoRef.current = id;
    setStats({ track: track.name, laps: 0, speed: 0, progress: 0 });
  }

  function respawn(): void {
    const track = trackRef.current;
    const brain = brainRef.current;
    if (!track || !brain) return;
    carRef.current = new Car(track, brain);
  }

  // ── render loop (built once; reads everything through refs) ─────────────────
  useEffect(() => {
    if (!ready) return;
    const mount = mountRef.current;
    const canvas = canvasRef.current;
    if (!mount || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let size = { w: 0, h: 0, dpr: 1 };
    function fit(): void {
      const r = mount!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      size = { w, h, dpr };
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(mount);

    // world→canvas transform recomputed per track (cached by track identity)
    let fitTrack: Track | null = null;
    let scale = 1;
    let offX = 0;
    let offZ = 0;
    function computeFit(track: Track): void {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      const pad = track.trackWidth; // include the road's half-width in bounds
      for (const [x, z] of track.points) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      minX -= pad;
      maxX += pad;
      minZ -= pad;
      maxZ += pad;
      const worldW = Math.max(1, maxX - minX);
      const worldH = Math.max(1, maxZ - minZ);
      const padFrac = 0.08;
      const availW = size.w * (1 - padFrac * 2);
      const availH = size.h * (1 - padFrac * 2);
      scale = Math.min(availW / worldW, availH / worldH);
      // center the scaled world in the canvas
      offX = (size.w - worldW * scale) / 2 - minX * scale;
      offZ = (size.h - worldH * scale) / 2 - minZ * scale;
      fitTrack = track;
    }

    const sx = (x: number): number => x * scale + offX;
    const sz = (z: number): number => z * scale + offZ;

    function drawTrack(track: Track): void {
      const pts = track.points;
      if (pts.length < 2) return;
      // road as a thick closed stroke
      ctx!.beginPath();
      ctx!.moveTo(sx(pts[0][0]), sz(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx!.lineTo(sx(pts[i][0]), sz(pts[i][1]));
      ctx!.closePath();
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";
      ctx!.lineWidth = 2 * track.trackWidth * scale;
      ctx!.strokeStyle = "#13182a"; // dark asphalt
      ctx!.stroke();

      // subtle road edge
      ctx!.lineWidth = 2 * track.trackWidth * scale + 2;
      ctx!.strokeStyle = "rgba(90,209,255,0.08)";
      ctx!.stroke();
      ctx!.lineWidth = 2 * track.trackWidth * scale;
      ctx!.strokeStyle = "#13182a";
      ctx!.stroke();

      // dashed centerline
      ctx!.beginPath();
      ctx!.moveTo(sx(pts[0][0]), sz(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx!.lineTo(sx(pts[i][0]), sz(pts[i][1]));
      ctx!.closePath();
      ctx!.setLineDash([6, 10]);
      ctx!.lineWidth = Math.max(1, scale * 0.8);
      ctx!.strokeStyle = "rgba(231,236,245,0.25)";
      ctx!.stroke();
      ctx!.setLineDash([]);

      // start/finish tick — perpendicular to the tangent at points[0]
      const t = track.tangents[0];
      const nx = -t[1];
      const nz = t[0];
      const hw = track.trackWidth;
      ctx!.beginPath();
      ctx!.moveTo(sx(pts[0][0] + nx * hw), sz(pts[0][1] + nz * hw));
      ctx!.lineTo(sx(pts[0][0] - nx * hw), sz(pts[0][1] - nz * hw));
      ctx!.lineWidth = Math.max(2, scale * 1.5);
      ctx!.strokeStyle = "rgba(255,255,255,0.7)";
      ctx!.stroke();
    }

    function drawCar(car: Car, track: Track): void {
      const cx = sx(car.x);
      const cz = sz(car.z);

      // sensor whiskers
      if (sensorsRef.current) {
        ctx!.lineWidth = 1;
        for (let i = 0; i < SENSOR_ANGLES.length; i++) {
          const a = car.angle + SENSOR_ANGLES[i];
          const len = car.sensors[i] * SENSOR_LENGTH * scale;
          const ex = cx + Math.cos(a) * len;
          const ez = cz + Math.sin(a) * len;
          ctx!.beginPath();
          ctx!.moveTo(cx, cz);
          ctx!.lineTo(ex, ez);
          // shorter ray (closer wall) → warmer/brighter
          const prox = 1 - car.sensors[i];
          ctx!.strokeStyle = `rgba(255,77,157,${0.12 + prox * 0.35})`;
          ctx!.stroke();
          ctx!.beginPath();
          ctx!.arc(ex, ez, 1.6, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(255,77,157,0.5)";
          ctx!.fill();
        }
      }

      // car body — arrow pointing along .angle
      const r = Math.max(5, track.trackWidth * scale * 0.42);
      ctx!.save();
      ctx!.translate(cx, cz);
      ctx!.rotate(car.angle);
      ctx!.beginPath();
      ctx!.moveTo(r, 0);
      ctx!.lineTo(-r * 0.7, r * 0.62);
      ctx!.lineTo(-r * 0.4, 0);
      ctx!.lineTo(-r * 0.7, -r * 0.62);
      ctx!.closePath();
      ctx!.fillStyle = "#5ad1ff";
      ctx!.shadowColor = "rgba(90,209,255,0.8)";
      ctx!.shadowBlur = 12;
      ctx!.fill();
      ctx!.restore();
    }

    let raf = 0;
    function frame(): void {
      raf = requestAnimationFrame(frame);
      if (size.w === 0) return;

      // (re)build if the UI selected a different track
      if (builtDemoRef.current !== demoRef.current) {
        buildDemo(demoRef.current);
        fitTrack = null; // force a refit
      }

      const track = trackRef.current;
      const brain = brainRef.current;
      let car = carRef.current;
      if (!track || !brain || !car) return;

      if (fitTrack !== track) computeFit(track);

      // advance the sim
      if (runningRef.current) {
        const steps = speedRef.current;
        for (let s = 0; s < steps; s++) {
          car.update();
          if (car.finished) {
            lapsRef.current += 1;
            respawn();
            car = carRef.current!;
          } else if (!car.alive) {
            // crash (rare on these tracks) — respawn so the screen is never dead
            respawn();
            car = carRef.current!;
          }
        }
      }

      // draw — set the dpr transform first so clearRect covers the whole
      // backing store (under identity it would only clear the top-left on HiDPI).
      ctx!.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx!.clearRect(0, 0, size.w, size.h);
      drawTrack(track);
      drawCar(car, track);

      // readouts (cheap; reflects the live car)
      setStats({
        track: track.name,
        laps: lapsRef.current,
        speed: car.speed,
        progress: car.totalProgress,
      });
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // built once after the brain is ready; UI flows through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="relative">
        <div ref={mountRef} className="aspect-[16/10] w-full">
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-muted)]">
            loading champion brain…
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-[var(--color-bg-soft)] p-4">
        {/* track selector */}
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
            Circuit · the champion&apos;s curriculum
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDemoId(d.id)}
                className={`rounded-md px-3 py-1.5 text-xs transition ${
                  demoId === d.id
                    ? "bg-[var(--color-accent)] font-medium text-black"
                    : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
                }`}
                title={`Level ${d.level} adapter`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* readouts */}
        <div className="grid grid-cols-4 gap-3">
          <Stat k="Circuit" v={stats.track} />
          <Stat k="Laps" v={String(stats.laps)} accent />
          <Stat k="Speed" v={`${stats.speed.toFixed(1)}/f`} />
          <Stat k="Lap" v={`${Math.round(stats.progress * 100)}%`} accent />
        </div>

        {/* controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
          >
            {running ? "⏸ pause" : "▶ drive"}
          </button>
          <button
            onClick={() => setShowSensors((s) => !s)}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              showSensors
                ? "bg-[var(--color-accent-2)] text-black"
                : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
            }`}
            title="Show the 9 distance whiskers the net sees"
          >
            {showSensors ? "sensors on" : "show sensors"}
          </button>
          <label className="ml-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
            speed
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-[var(--color-accent)]"
            />
            <span className="tabular-nums text-[var(--color-fg)]">{speed}×</span>
          </label>
          <span className="ml-auto text-xs text-[var(--color-muted)]">
            9 sensors + speed →{" "}
            <span className="text-[var(--color-fg)]">16 neurons</span> → steer · gas
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}): ReactNode {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {k}
      </div>
      <div
        className={`truncate text-xl font-semibold tabular-nums ${
          accent ? "text-[var(--color-accent)]" : "text-[var(--color-fg)]"
        }`}
      >
        {v}
      </div>
    </div>
  );
}
