"use client";

/**
 * Shared canvas/animation hooks for the Simulation Lab sims.
 * Ported from the design bundle's `shell.jsx`.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export type CanvasSize = { w: number; h: number; dpr: number };

// useLayoutEffect warns during SSR; these components only ever render on the
// client (loaded via dynamic ssr:false), but the isomorphic shim keeps it quiet.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** animation-frame loop that never restarts on param change */
export function useRAF(
  tick: (dt: number, t: number) => void,
  running: boolean,
): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const runRef = useRef(running);
  runRef.current = running;
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    const loop = (t: number) => {
      id = requestAnimationFrame(loop);
      const dt = Math.min(48, t - last);
      last = t;
      if (runRef.current) tickRef.current(dt, t);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
}

/** canvas that auto-sizes to its container with devicePixelRatio */
export function useCanvas(
  onResize?: (w: number, h: number, ctx: CanvasRenderingContext2D) => void,
): readonly [RefObject<HTMLCanvasElement | null>, RefObject<CanvasSize>] {
  const ref = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef<CanvasSize>({ w: 0, h: 0, dpr: 1 });
  useIsoLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      cv.width = w * dpr;
      cv.height = h * dpr;
      sizeRef.current = { w, h, dpr };
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onResize?.(w, h, ctx);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, sizeRef] as const;
}

/** keep a live ref mirror of a value so the RAF loop reads fresh values */
export function useLive<T>(value: T): RefObject<T> {
  const r = useRef(value);
  r.current = value;
  return r;
}
