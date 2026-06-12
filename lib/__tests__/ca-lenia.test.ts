import { describe, it, expect } from "vitest";
import {
  ORBIUM_PARAMS,
  buildKernel,
  growth,
  seedOrbium,
  stepLenia,
} from "../ca/lenia";

/** mass + centre-of-mass of a field. */
function stats(A: Float32Array, W: number, H: number) {
  let mass = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = A[y * W + x];
      mass += v;
      mx += v * x;
      my += v * y;
    }
  }
  return { mass, cx: mx / mass, cy: my / mass };
}

describe("Lenia model", () => {
  it("builds a normalized radial kernel", () => {
    const k = buildKernel(13);
    let sum = 0;
    for (const e of k) sum += e.w;
    expect(sum).toBeCloseTo(1, 6);
    expect(k.length).toBeGreaterThan(400); // ~530 cells in a radius-13 disc
  });

  it("growth peaks at mu and is -1 far away", () => {
    expect(growth(0.15, 0.15, 0.015)).toBeCloseTo(1, 6);
    expect(growth(0.9, 0.15, 0.015)).toBeCloseTo(-1, 6);
  });

  it("the Orbium glider stays alive and SWIMS (centre of mass translates)", () => {
    const N = 72;
    const kernel = buildKernel(ORBIUM_PARAMS.R);
    let A = seedOrbium(N, N);
    let B = new Float32Array(N * N);
    const start = stats(A, N, N);
    expect(start.mass).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) {
      stepLenia(A, B, N, N, kernel, ORBIUM_PARAMS);
      [A, B] = [B, A];
    }
    const end = stats(A, N, N);
    // alive: didn't dissolve to nothing or blow up to fill the grid
    expect(end.mass).toBeGreaterThan(start.mass * 0.4);
    expect(end.mass).toBeLessThan(start.mass * 3);
    // motile: the creature has visibly translated
    const moved = Math.hypot(end.cx - start.cx, end.cy - start.cy);
    expect(moved).toBeGreaterThan(2);
  });
});
