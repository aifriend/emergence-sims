"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import {
  cpReset,
  cpStep,
  discretize,
  QLearner,
  STEP_HZ,
  THETA_THRESH,
  X_THRESH,
  type CPState,
} from "@/lib/cartpole";

const STEP_MS = 1000 / STEP_HZ; // 20ms per physics step
const MAX_EP_STEPS = 600;
const CURVE_MAX = 200; // episodes kept for the plot

export default function CartPole(): ReactNode {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const curveRef = useRef<HTMLCanvasElement | null>(null);

  const [running, setRunning] = useState(true);
  const [watchBest, setWatchBest] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [stats, setStats] = useState({
    episode: 0,
    last: 0,
    best: 0,
    avg: 0,
    eps: 1,
  });

  const runningRef = useRef(running);
  const watchRef = useRef(watchBest);
  const speedRef = useRef(speed);
  runningRef.current = running;
  watchRef.current = watchBest;
  speedRef.current = speed;

  const agentRef = useRef<QLearner | null>(null);
  const resetAgentRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
    camera.position.set(0, 1.7, 5.4);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8090b0, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 2.2);
    dir.position.set(3, 6, 4);
    scene.add(dir);

    // ground grid for depth
    const grid = new THREE.GridHelper(14, 28, 0x2a3550, 0x18203a);
    grid.position.y = -0.02;
    scene.add(grid);

    // rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(2 * X_THRESH + 0.6, 0.08, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x141a2c,
        metalness: 0.3,
        roughness: 0.7,
      }),
    );
    rail.position.y = 0;
    scene.add(rail);

    // cart
    const cartH = 0.3;
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, cartH, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x5ad1ff,
        emissive: 0x0a3a55,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );
    const cartY = 0.04 + cartH / 2;
    cart.position.set(0, cartY, 0);
    scene.add(cart);

    // pole — pivot at cart top, rotate around z
    const poleLen = 1.1;
    const pivot = new THREE.Group();
    pivot.position.set(0, cartY + cartH / 2, 0);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xe7ecf5,
      emissive: 0x222633,
      metalness: 0.2,
      roughness: 0.5,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, poleLen, 16),
      poleMat,
    );
    pole.position.y = poleLen / 2;
    pivot.add(pole);
    const bob = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4d9d, emissive: 0x551025 }),
    );
    bob.position.y = poleLen;
    pivot.add(bob);
    scene.add(pivot);

    // sim/agent state
    agentRef.current = new QLearner();
    let agent = agentRef.current;
    let state: CPState = cpReset();
    let epLen = 0;
    let acc = 0;
    const curve: number[] = [];
    let best = 0;

    function applyResetAgent() {
      agent.reset();
      state = cpReset();
      epLen = 0;
      acc = 0;
      curve.length = 0;
      best = 0;
      resetAgentRef.current = false;
    }

    function drawCurve() {
      const cv = curveRef.current;
      if (!cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (w === 0 || h === 0) return;
      cv.width = w * dpr;
      cv.height = h * dpr;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // "solved" reference line at 195
      const yOf = (v: number) => h - (Math.min(v, MAX_EP_STEPS) / MAX_EP_STEPS) * (h - 6) - 3;
      ctx.strokeStyle = "rgba(90,209,255,0.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, yOf(195));
      ctx.lineTo(w, yOf(195));
      ctx.stroke();
      ctx.setLineDash([]);
      if (curve.length > 1) {
        ctx.beginPath();
        const denom = Math.max(1, curve.length - 1); // span the partial curve full-width
        for (let i = 0; i < curve.length; i++) {
          const x = (i / denom) * w;
          const y = yOf(curve[i]);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = "#5ad1ff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight || Math.round((w * 10) / 16);
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let last = performance.now();
    let raf = 0;
    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, t - last);
      last = t;
      if (mount!.clientWidth === 0) return;

      if (resetAgentRef.current) applyResetAgent();

      let endedThisFrame = false;
      if (runningRef.current) {
        acc += dt * speedRef.current;
        let guard = 0;
        while (acc >= STEP_MS && guard < 5000) {
          acc -= STEP_MS;
          guard++;
          const si = discretize(state);
          const { alpha, eps } = agent.schedule();
          const useEps = watchRef.current ? 0 : eps;
          const a = agent.act(si, useEps);
          const { state: ns, done } = cpStep(state, a);
          const nsi = discretize(ns);
          if (!watchRef.current) agent.update(si, a, nsi, done, alpha);
          state = ns;
          epLen++;
          if (done || epLen >= MAX_EP_STEPS) {
            curve.push(epLen);
            if (curve.length > CURVE_MAX) curve.shift();
            if (epLen > best) best = epLen;
            if (!watchRef.current) agent.episode++;
            state = cpReset();
            epLen = 0;
            endedThisFrame = true;
          }
        }
      }

      // render cart + pole at current state
      cart.position.x = state[0];
      pivot.position.x = state[0];
      pivot.rotation.z = -state[2]; // θ from vertical
      // tint the bob redder the closer the pole is to failing
      const danger = Math.min(1, Math.abs(state[2]) / THETA_THRESH);
      (bob.material as THREE.MeshStandardMaterial).color.setRGB(
        1,
        0.3 + 0.5 * (1 - danger),
        0.6,
      );
      renderer.render(scene, camera);

      if (endedThisFrame) {
        const recent = curve.slice(-50);
        const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
        setStats({
          episode: agent.episode,
          last: curve[curve.length - 1],
          best,
          avg: Math.round(avg),
          eps: agent.schedule().eps,
        });
        drawCurve();
      }
    }
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // built once; UI flows through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div ref={mountRef} className="aspect-[16/10] w-full" />

      <div className="border-t border-white/10 bg-[var(--color-bg-soft)] p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          {/* learning curve */}
          <div>
            <div className="mb-1 flex justify-between text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
              <span>Episode length (learning curve)</span>
              <span>{CURVE_MAX} episodes · dashed = solved (195)</span>
            </div>
            <canvas
              ref={curveRef}
              className="w-full rounded-md border border-white/5 bg-black/40"
              style={{ height: 90 }}
            />
          </div>
          {/* readouts */}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-2">
            <Stat k="Episode" v={stats.episode} />
            <Stat k="Last" v={stats.last} />
            <Stat k="Best" v={stats.best} accent />
            <Stat k="Avg₅₀" v={stats.avg} accent />
          </div>
        </div>

        {/* controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
          >
            {running ? "⏸ pause" : "▶ train"}
          </button>
          <button
            onClick={() => {
              resetAgentRef.current = true;
              setStats({ episode: 0, last: 0, best: 0, avg: 0, eps: 1 });
            }}
            className="rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            ↺ reset agent
          </button>
          <button
            onClick={() => setWatchBest((w) => !w)}
            className={`rounded-md px-3 py-1.5 text-xs transition ${
              watchBest
                ? "bg-[var(--color-accent-2)] text-black"
                : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
            }`}
            title="Act greedily with no exploration or learning"
          >
            {watchBest ? "watching greedy" : "watch greedy"}
          </button>
          <label className="ml-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
            speed
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-[var(--color-accent)]"
            />
            <span className="tabular-nums text-[var(--color-fg)]">{speed}×</span>
          </label>
          <span className="ml-auto text-xs text-[var(--color-muted)]">
            exploration ε ={" "}
            <span className="tabular-nums text-[var(--color-fg)]">
              {stats.eps.toFixed(2)}
            </span>
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
  v: number;
  accent?: boolean;
}): ReactNode {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
        {k}
      </div>
      <div
        className={`text-xl font-semibold tabular-nums ${
          accent ? "text-[var(--color-accent)]" : "text-[var(--color-fg)]"
        }`}
      >
        {v}
      </div>
    </div>
  );
}
