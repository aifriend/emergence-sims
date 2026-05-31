"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { buildAttention, DEFAULT_SENTENCE } from "@/lib/attention";

const N_HEADS = 3;

// per-token hue (HSL hue 0..1) so a node and its text chip share a color
function tokenHue(i: number, n: number): number {
  return (i / n) * 0.8 + 0.02;
}

export default function Attention(): ReactNode {
  const model = useMemo(
    () => buildAttention(DEFAULT_SENTENCE, N_HEADS, 42),
    [],
  );
  const n = model.tokens.length;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [head, setHead] = useState(0);
  const [query, setQuery] = useState(0);
  const [playing, setPlaying] = useState(true);

  const headRef = useRef(head);
  const queryRef = useRef(query);
  const playingRef = useRef(playing);
  headRef.current = head;
  queryRef.current = query;
  playingRef.current = playing;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 1.4, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    // tilted, slowly-spinning group holding nodes + beams
    const group = new THREE.Group();
    group.rotation.x = -0.5;
    scene.add(group);

    const R = 5;
    const nodePos: THREE.Vector3[] = [];
    const nodes: THREE.Mesh[] = [];
    const nodeColor: THREE.Color[] = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const pos = new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0);
      nodePos.push(pos);
      const col = new THREE.Color().setHSL(tokenHue(i, n), 0.75, 0.6);
      nodeColor.push(col);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 20, 20),
        new THREE.MeshBasicMaterial({ color: col.clone() }),
      );
      mesh.position.copy(pos);
      group.add(mesh);
      nodes.push(mesh);
    }

    // beams: one segment from the active query node to each token node
    const beamPos = new Float32Array(n * 2 * 3);
    const beamCol = new Float32Array(n * 2 * 3);
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(beamPos, 3));
    beamGeo.setAttribute("color", new THREE.BufferAttribute(beamCol, 3));
    const beams = new THREE.LineSegments(
      beamGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(beams);

    const tmp = new THREE.Color();

    function refreshBeams() {
      const q = queryRef.current;
      const A = model.heads[headRef.current][q];
      const qp = nodePos[q];
      for (let j = 0; j < n; j++) {
        const tp = nodePos[j];
        const o = j * 6;
        beamPos[o] = qp.x;
        beamPos[o + 1] = qp.y;
        beamPos[o + 2] = qp.z;
        beamPos[o + 3] = tp.x;
        beamPos[o + 4] = tp.y;
        beamPos[o + 5] = tp.z;
        const w = A[j]; // attention weight 0..1
        tmp.copy(nodeColor[j]).multiplyScalar(0.15 + w * 2.4);
        // query end a touch dimmer, target end bright
        beamCol[o] = tmp.r * 0.5;
        beamCol[o + 1] = tmp.g * 0.5;
        beamCol[o + 2] = tmp.b * 0.5;
        beamCol[o + 3] = tmp.r;
        beamCol[o + 4] = tmp.g;
        beamCol[o + 5] = tmp.b;
      }
      beamGeo.attributes.position.needsUpdate = true;
      beamGeo.attributes.color.needsUpdate = true;
    }

    function refreshNodes() {
      const q = queryRef.current;
      for (let i = 0; i < n; i++) {
        const active = i === q;
        nodes[i].scale.setScalar(active ? 1.9 : 1);
        const m = nodes[i].material as THREE.MeshBasicMaterial;
        m.color.copy(active ? new THREE.Color(0xffffff) : nodeColor[i]);
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

    let advance = 0;
    function loop(_t: number, dtMs: number) {
      group.rotation.y += 0.0035;
      if (playingRef.current) {
        advance += dtMs;
        if (advance > 1500) {
          advance = 0;
          setQuery((q) => (q + 1) % n);
        }
      }
      refreshNodes();
      refreshBeams();
      renderer.render(scene, camera);
    }

    let last = performance.now();
    let raf = 0;
    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, t - last);
      last = t;
      if (mount!.clientWidth === 0) return; // wait for layout
      loop(t, dt);
    }
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      beamGeo.dispose();
      (beams.material as THREE.Material).dispose();
      nodes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // built once; UI flows through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, n]);

  const weights = model.heads[head][query];
  const maxW = Math.max(...weights);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div ref={mountRef} className="aspect-[16/10] w-full" />

      <div className="border-t border-white/10 bg-[var(--color-bg-soft)] p-4">
        {/* head selector + transport */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
            Head
          </span>
          {Array.from({ length: model.nHeads }, (_, h) => (
            <button
              key={h}
              onClick={() => setHead(h)}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                head === h
                  ? "bg-[var(--color-accent)] text-black"
                  : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
              }`}
            >
              {h + 1}
            </button>
          ))}
          <button
            onClick={() => setPlaying((p) => !p)}
            className="ml-2 rounded-md bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"
          >
            {playing ? "⏸ pause sweep" : "▶ play sweep"}
          </button>
          <span className="ml-auto text-xs text-[var(--color-muted)]">
            query: <span className="text-[var(--color-fg)]">“{model.tokens[query]}”</span>
          </span>
        </div>

        {/* sentence chips — click to set the query token */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {model.tokens.map((tok, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(i);
                setPlaying(false);
              }}
              style={{
                borderColor: `hsl(${tokenHue(i, n) * 360} 70% 60% / 0.6)`,
              }}
              className={`rounded-md border px-2 py-1 text-sm transition ${
                i === query
                  ? "bg-white/15 text-[var(--color-fg)]"
                  : "bg-white/5 text-[var(--color-muted)] hover:bg-white/10"
              }`}
            >
              {tok}
            </button>
          ))}
        </div>

        {/* attention weight bars for the active query */}
        <div className="flex items-end gap-1.5" style={{ height: 70 }}>
          {model.tokens.map((tok, j) => (
            <div key={j} className="flex flex-1 flex-col items-center justify-end">
              <div
                title={`${(weights[j] * 100).toFixed(1)}%`}
                style={{
                  height: `${Math.max(2, weights[j] * 56)}px`,
                  background:
                    weights[j] === maxW
                      ? "var(--color-accent)"
                      : `hsl(${tokenHue(j, n) * 360} 70% 60%)`,
                  opacity: weights[j] === maxW ? 1 : 0.55,
                }}
                className="w-full rounded-t"
              />
              <span className="mt-1 max-w-full truncate text-[10px] text-[var(--color-muted)]">
                {tok}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
