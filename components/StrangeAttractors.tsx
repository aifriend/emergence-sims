"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import {
  SYSTEMS,
  SYSTEM_ORDER,
  rk4Step,
  type Vec3,
  type AttractorSystem,
} from "@/lib/attractors";

const MAX_POINTS = 50000;

export default function StrangeAttractors(): ReactNode {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // UI state
  const [systemKey, setSystemKey] = useState<string>("lorenz");
  const [params, setParams] = useState<Record<string, number>>({
    ...SYSTEMS.lorenz.defaultParams,
  });
  const [speed, setSpeed] = useState<number>(1);
  const [paused, setPaused] = useState<boolean>(false);

  // Refs the animation loop reads (so UI changes don't tear down the scene)
  const sysRef = useRef<AttractorSystem>(SYSTEMS.lorenz);
  const paramsRef = useRef<Record<string, number>>(params);
  const speedRef = useRef<number>(speed);
  const pausedRef = useRef<boolean>(paused);
  const resetRef = useRef<boolean>(true); // request a fresh trajectory

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    sysRef.current = SYSTEMS[systemKey];
    resetRef.current = true;
  }, [systemKey]);

  // When the system changes, load its default params into the UI.
  useEffect(() => {
    setParams({ ...SYSTEMS[systemKey].defaultParams });
  }, [systemKey]);

  // Changing params should also restart the trajectory.
  useEffect(() => {
    resetRef.current = true;
  }, [params]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const positions = new Float32Array(MAX_POINTS * 3);
    const colors = new Float32Array(MAX_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: sysRef.current.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // bright moving "head"
    const headGeo = new THREE.SphereGeometry(1, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(headGeo, headMat);
    scene.add(head);

    let p: Vec3 = [...sysRef.current.init];
    let writeIdx = 0;
    let filled = false;
    let stepCounter = 0;
    let angle = 0;
    const color = new THREE.Color();

    function applyReset() {
      const sys = sysRef.current;
      p = [...sys.init];
      writeIdx = 0;
      filled = false;
      stepCounter = 0;
      // Pre-fill the buffer with the initial point (no clump at origin).
      for (let i = 0; i < MAX_POINTS; i++) {
        positions[i * 3] = sys.init[0];
        positions[i * 3 + 1] = sys.init[1];
        positions[i * 3 + 2] = sys.init[2];
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
      material.size = sys.pointSize;
      head.scale.setScalar(sys.pointSize * 2.2);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      resetRef.current = false;
    }

    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight || Math.round((w * 10) / 16);
      if (w === 0 || h === 0) return; // skip pre-layout / collapsed measures
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    applyReset();

    function loop() {
      const sys = sysRef.current;
      if (resetRef.current) applyReset();

      if (!pausedRef.current) {
        const steps = Math.max(
          1,
          Math.round(sys.baseSteps * speedRef.current),
        );
        for (let s = 0; s < steps; s++) {
          p = rk4Step(sys, p, paramsRef.current, sys.dt);
          // guard against numerical blow-up
          if (!Number.isFinite(p[0] + p[1] + p[2])) {
            p = [...sys.init];
          }
          positions[writeIdx * 3] = p[0];
          positions[writeIdx * 3 + 1] = p[1];
          positions[writeIdx * 3 + 2] = p[2];
          const hue = (stepCounter * 0.0006) % 1;
          color.setHSL(hue, 0.85, 0.6);
          colors[writeIdx * 3] = color.r;
          colors[writeIdx * 3 + 1] = color.g;
          colors[writeIdx * 3 + 2] = color.b;
          writeIdx = (writeIdx + 1) % MAX_POINTS;
          if (writeIdx === 0) filled = true;
          stepCounter++;
        }
        head.position.set(p[0], p[1], p[2]);
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        geometry.setDrawRange(0, filled ? MAX_POINTS : writeIdx);
      }

      // slow auto-orbit
      angle += 0.0016;
      const [cx, cy, cz] = sys.center;
      const el = 0.32;
      camera.position.set(
        cx + sys.camDist * Math.cos(angle) * Math.cos(el),
        cy + sys.camDist * Math.sin(el),
        cz + sys.camDist * Math.sin(angle) * Math.cos(el),
      );
      camera.lookAt(cx, cy, cz);
      renderer.render(scene, camera);
    }

    // Wait until layout gives the mount a real width before sizing & starting —
    // otherwise the canvas can lock to 0-width on first paint.
    let raf = requestAnimationFrame(function tryStart() {
      if (mount.clientWidth === 0) {
        raf = requestAnimationFrame(tryStart);
        return;
      }
      resize();
      renderer.setAnimationLoop(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      headGeo.dispose();
      headMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // Scene is built once; UI changes flow through refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sys = SYSTEMS[systemKey];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div ref={mountRef} className="aspect-[16/10] w-full" />

      {/* Controls overlay */}
      <div className="absolute left-3 top-3 w-56 rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur">
        <div className="mb-2 flex gap-1">
          {SYSTEM_ORDER.map((k) => (
            <button
              key={k}
              onClick={() => setSystemKey(k)}
              className={`flex-1 rounded-md px-2 py-1 text-xs transition ${
                systemKey === k
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
              }`}
            >
              {SYSTEMS[k].name}
            </button>
          ))}
        </div>

        {sys.controls.map((c) => (
          <label key={c.key} className="mb-2 block text-[11px] text-[var(--color-muted)]">
            <span className="flex justify-between">
              <span>{c.label}</span>
              <span className="tabular-nums text-[var(--color-fg)]">
                {(params[c.key] ?? 0).toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={params[c.key] ?? 0}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
              }
              className="mt-1 w-full accent-[var(--color-accent)]"
            />
          </label>
        ))}

        <label className="mb-2 block text-[11px] text-[var(--color-muted)]">
          <span className="flex justify-between">
            <span>speed</span>
            <span className="tabular-nums text-[var(--color-fg)]">
              {speed.toFixed(1)}×
            </span>
          </span>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--color-accent)]"
          />
        </label>

        <div className="flex gap-1">
          <button
            onClick={() => setPaused((v) => !v)}
            className="flex-1 rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            {paused ? "▶ play" : "⏸ pause"}
          </button>
          <button
            onClick={() => setParams({ ...SYSTEMS[systemKey].defaultParams })}
            className="flex-1 rounded-md bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
          >
            ↺ reset
          </button>
        </div>
      </div>
    </div>
  );
}
