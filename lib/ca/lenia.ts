/**
 * Lenia (Bert Wang-Chak Chan, 2018) — a continuous generalisation of Life:
 * continuous state, space and time. Cells hold real values in [0,1]; a smooth
 * radial kernel convolves the field and a smooth bell-shaped growth function
 * updates it. The result is lifelike motile "creatures" (the Orbium glider).
 *
 * Pure, framework-free model. We use direct (naive) radial convolution rather
 * than an FFT — at this grid size it's simpler and fast enough in-browser.
 *
 *   U  = K ⊛ A                                  (kernel convolution)
 *   A' = clip( A + (1/T)·G(U), 0, 1 )           (growth update)
 *   G(u) = 2·exp( -(u-mu)² / (2σ²) ) - 1         (growth function)
 */

export type LeniaParams = { R: number; T: number; mu: number; sigma: number };
/** Orbium reference parameters (Chan, Lenia paper). */
export const ORBIUM_PARAMS: LeniaParams = { R: 13, T: 10, mu: 0.15, sigma: 0.015 };

function bell(x: number, m: number, s: number): number {
  return Math.exp(-((x - m) * (x - m)) / (2 * s * s));
}

/** A precomputed radial kernel as a flat list of weighted offsets (sum = 1).
 * Single ring peaked at half-radius — Lenia's canonical Orbium kernel. */
export type Kernel = { dy: number; dx: number; w: number }[];

export function buildKernel(R: number): Kernel {
  const k: Kernel = [];
  let sum = 0;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.sqrt(dy * dy + dx * dx) / R;
      if (r < 1) {
        const w = bell(r, 0.5, 0.15);
        k.push({ dy, dx, w });
        sum += w;
      }
    }
  }
  for (const e of k) e.w /= sum;
  return k;
}

export function growth(u: number, mu: number, sigma: number): number {
  return 2 * bell(u, mu, sigma) - 1;
}

/** One Lenia step on a toroidal W×H field. Writes into `out`, returns total mass. */
export function stepLenia(
  A: Float32Array,
  out: Float32Array,
  W: number,
  H: number,
  kernel: Kernel,
  p: LeniaParams,
): number {
  const invT = 1 / p.T;
  const klen = kernel.length;
  let mass = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let u = 0;
      for (let i = 0; i < klen; i++) {
        const e = kernel[i];
        const ny = (y + e.dy + H) % H;
        const nx = (x + e.dx + W) % W;
        u += e.w * A[ny * W + nx];
      }
      let v = A[y * W + x] + invT * (2 * bell(u, p.mu, p.sigma) - 1);
      if (v < 0) v = 0;
      else if (v > 1) v = 1;
      out[y * W + x] = v;
      mass += v;
    }
  }
  return mass;
}

/** The Orbium glider (Lenia paper supplementary material), 20×20. */
export const ORBIUM: number[][] = [
  [0, 0, 0, 0, 0, 0, 0.1, 0.14, 0.1, 0, 0, 0.03, 0.03, 0, 0, 0.3, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0.08, 0.24, 0.3, 0.3, 0.18, 0.14, 0.15, 0.16, 0.15, 0.09, 0.2, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0.15, 0.34, 0.44, 0.46, 0.38, 0.18, 0.14, 0.11, 0.13, 0.19, 0.18, 0.45, 0, 0, 0],
  [0, 0, 0, 0, 0.06, 0.13, 0.39, 0.5, 0.5, 0.37, 0.06, 0, 0, 0, 0.02, 0.16, 0.68, 0, 0, 0],
  [0, 0, 0, 0.11, 0.17, 0.17, 0.33, 0.4, 0.38, 0.28, 0.14, 0, 0, 0, 0, 0, 0.18, 0.42, 0, 0],
  [0, 0, 0.09, 0.18, 0.13, 0.06, 0.08, 0.26, 0.32, 0.32, 0.27, 0, 0, 0, 0, 0, 0, 0.82, 0, 0],
  [0.27, 0, 0.16, 0.12, 0, 0, 0, 0.25, 0.38, 0.44, 0.45, 0.34, 0, 0, 0, 0, 0, 0.22, 0.17, 0],
  [0, 0.07, 0.2, 0.02, 0, 0, 0, 0.31, 0.48, 0.57, 0.6, 0.57, 0, 0, 0, 0, 0, 0, 0.49, 0],
  [0, 0.59, 0.19, 0, 0, 0, 0, 0.2, 0.57, 0.69, 0.76, 0.76, 0.49, 0, 0, 0, 0, 0, 0.36, 0],
  [0, 0.58, 0.19, 0, 0, 0, 0, 0, 0.67, 0.83, 0.9, 0.92, 0.87, 0.12, 0, 0, 0, 0, 0.22, 0.07],
  [0, 0, 0.46, 0, 0, 0, 0, 0, 0.7, 0.93, 1, 1, 1, 0.61, 0, 0, 0, 0, 0.18, 0.11],
  [0, 0, 0.82, 0, 0, 0, 0, 0, 0.47, 1, 1, 0.98, 1, 0.96, 0.27, 0, 0, 0, 0.19, 0.1],
  [0, 0, 0.46, 0, 0, 0, 0, 0, 0.25, 1, 1, 0.84, 0.92, 0.97, 0.54, 0.14, 0.04, 0.1, 0.21, 0.05],
  [0, 0, 0, 0.4, 0, 0, 0, 0, 0.09, 0.8, 1, 0.82, 0.8, 0.85, 0.63, 0.31, 0.18, 0.19, 0.2, 0.01],
  [0, 0, 0, 0.36, 0.1, 0, 0, 0, 0.05, 0.54, 0.86, 0.79, 0.74, 0.72, 0.6, 0.39, 0.28, 0.24, 0.13, 0],
  [0, 0, 0, 0.01, 0.3, 0.07, 0, 0, 0.08, 0.36, 0.64, 0.7, 0.64, 0.6, 0.51, 0.39, 0.29, 0.19, 0.04, 0],
  [0, 0, 0, 0, 0.1, 0.24, 0.14, 0.1, 0.15, 0.29, 0.45, 0.53, 0.52, 0.46, 0.4, 0.31, 0.21, 0.08, 0, 0],
  [0, 0, 0, 0, 0, 0.08, 0.21, 0.21, 0.22, 0.29, 0.36, 0.39, 0.37, 0.33, 0.26, 0.18, 0.09, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0.03, 0.13, 0.19, 0.22, 0.24, 0.24, 0.23, 0.18, 0.13, 0.05, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.06, 0.08, 0.09, 0.07, 0.05, 0.01, 0, 0, 0, 0, 0],
];

/** Place the Orbium creature near the centre of an empty W×H field. */
export function seedOrbium(W: number, H: number): Float32Array {
  const g = new Float32Array(W * H);
  const h = ORBIUM.length;
  const w = ORBIUM[0].length;
  const cy = Math.floor(H / 2 - h / 2);
  const cx = Math.floor(W / 2 - w / 2);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const y = cy + r;
      const x = cx + c;
      if (y >= 0 && y < H && x >= 0 && x < W) g[y * W + x] = ORBIUM[r][c];
    }
  }
  return g;
}

/** A localized random patch (radius ~R) in the centre — a "primordial soup". */
export function seedRandom(W: number, H: number, R: number, rand: () => number = Math.random): Float32Array {
  const g = new Float32Array(W * H);
  const cy = Math.floor(H / 2);
  const cx = Math.floor(W / 2);
  for (let dy = -R; dy < R; dy++) {
    for (let dx = -R; dx < R; dx++) {
      const y = cy + dy;
      const x = cx + dx;
      if (y >= 0 && y < H && x >= 0 && x < W) g[y * W + x] = rand();
    }
  }
  return g;
}
