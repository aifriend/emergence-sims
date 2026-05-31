"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { cpReset, cpStep, STEP_HZ, THETA_THRESH, type CPState } from "@/lib/cartpole";
import { entropicAction } from "@/lib/entropic";

const STEP_MS = 1000 / STEP_HZ;

export default function EntropicCartPole(): ReactNode {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [running, setRunning] = useState(true);
  const [horizon, setHorizon] = useState(45);
  const [rollouts, setRollouts] = useState(12);
  const [speed, setSpeed] = useState(1);
  const [stats, setStats] = useState({
    held: 0,
    best: 0,
    left: 0,
    right: 0,
    action: 1,
  });

  const runningRef = useRef(running);
  const horizonRef = useRef(horizon);
  const rolloutsRef = useRef(rollouts);
  const speedRef = useRef(speed);
  const nudgeRef = useRef(0);
  runningRef.current = running;
  horizonRef.current = horizon;
  rolloutsRef.current = rollouts;
  speedRef.current = speed;

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

    const grid = new THREE.GridHelper(14, 28, 0x2a3550, 0x18203a);
    grid.position.y = -0.02;
    scene.add(grid);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(2 * 2.4 + 0.6, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x141a2c, metalness: 0.3, roughness: 0.7 }),
    );
    scene.add(rail);

    const cartH = 0.3;
    const cart = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, cartH, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0xff4d9d,
        emissive: 0x551025,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );
    const cartY = 0.04 + cartH / 2;
    cart.position.set(0, cartY, 0);
    scene.add(cart);

    const poleLen = 1.1;
    const pivot = new THREE.Group();
    pivot.position.set(0, cartY + cartH / 2, 0);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, poleLen, 16),
      new THREE.MeshStandardMaterial({ color: 0xe7ecf5, emissive: 0x222633, roughness: 0.5 }),
    );
    pole.position.y = poleLen / 2;
    pivot.add(pole);
    const bob = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x5ad1ff, emissive: 0x0a3a55 }),
    );
    bob.position.y = poleLen;
    pivot.add(bob);
    scene.add(pivot);

    let state: CPState = cpReset();
    let held = 0;
    let best = 0;
    let acc = 0;

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
    let lastL = 0;
    let lastR = 0;
    let lastA = 1;
    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, t - last);
      last = t;
      if (mount!.clientWidth === 0) return;

      let report = false;
      if (runningRef.current) {
        acc += dt * speedRef.current;
        let guard = 0;
        while (acc >= STEP_MS && guard < 12) {
          acc -= STEP_MS;
          guard++;
          if (nudgeRef.current !== 0) {
            state = [state[0], state[1], state[2], state[3] + nudgeRef.current];
            nudgeRef.current = 0;
          }
          const choice = entropicAction(state, horizonRef.current, rolloutsRef.current);
          lastL = choice.scores[0];
          lastR = choice.scores[1];
          lastA = choice.action;
          const { state: ns, done } = cpStep(state, choice.action);
          state = ns;
          held++;
          if (done) {
            if (held > best) best = held;
            held = 0;
            state = cpReset();
          }
          report = true;
        }
      }

      cart.position.x = state[0];
      pivot.position.x = state[0];
      pivot.rotation.z = -state[2];
      const danger = Math.min(1, Math.abs(state[2]) / THETA_THRESH);
      (bob.material as THREE.MeshStandardMaterial).color.setRGB(
        0.35 + 0.65 * danger,
        0.82 * (1 - danger) + 0.3 * danger,
        1 - 0.4 * danger,
      );
      renderer.render(scene, camera);

      if (report) {
        setStats({
          held,
          best: Math.max(best, held),
          left: lastL,
          right: lastR,
          action: lastA,
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxScore = Math.max(1, stats.left, stats.right);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div ref={mountRef} className="aspect-[16/10] w-full" />

      <div className="border-t border-white/10 bg-[var(--color-bg-soft)] p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          {/* the "decision": future-freedom of each action */}
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
              Future freedom per action (avg survival of sampled futures)
            </div>
            <div className="space-y-1.5">
              {([0, 1] as const).map((a) => {
                const v = a === 0 ? stats.left : stats.right;
                const chosen = stats.action === a;
                return (
                  <div key={a} className="flex items-center gap-2">
                    <span className="w-10 text-xs text-[var(--color-muted)]">
                      {a === 0 ? "←" : "→"}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-white/5">
                      <div
                        style={{
                          width: `${(v / maxScore) * 100}%`,
                          background: chosen
                            ? "var(--color-accent)"
                            : "rgba(231,236,245,0.4)",
                        }}
                        className="h-full transition-[width] duration-100"
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-[var(--color-fg)]">
                      {v.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat k="Balanced" v={stats.held} accent />
            <Stat k="Best" v={stats.best} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
          >
            {running ? "⏸ pause" : "▶ run"}
          </button>
          <button
            onClick={() => {
              nudgeRef.current = (Math.random() < 0.5 ? -1 : 1) * 0.9;
            }}
            className="rounded-md bg-[var(--color-accent-2)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
            title="Kick the pole and watch it recover"
          >
            ↯ nudge
          </button>
          <label className="ml-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
            lookahead
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="accent-[var(--color-accent)]"
            />
            <span className="tabular-nums text-[var(--color-fg)]">{horizon}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            rollouts
            <input
              type="range"
              min={4}
              max={32}
              step={2}
              value={rollouts}
              onChange={(e) => setRollouts(Number(e.target.value))}
              className="accent-[var(--color-accent)]"
            />
            <span className="tabular-nums text-[var(--color-fg)]">{rollouts}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
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
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: number; accent?: boolean }): ReactNode {
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
