// Pure, framework-agnostic scaled-dot-product multi-head self-attention —
// the mechanism at the heart of the Transformer (Vaswani et al., 2017).
// Weights are ILLUSTRATIVE (seeded, untrained): this shows the *shape* of the
// mechanism — how attention distributes — not learned linguistics. No React /
// canvas imports, so it stays unit-testable.

export interface AttentionModel {
  tokens: string[];
  nHeads: number;
  /** heads[h][i][j] = how much query token i attends to key token j (row i sums to 1) */
  heads: number[][][];
  dModel: number;
  dK: number;
}

const D_MODEL = 16; // embedding dimension
const D_K = 8; // per-head query/key dimension

/** deterministic PRNG (mulberry32) so the visualization is identical every load */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** standard normal via Box–Muller */
function randn(r: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** token embeddings = random content vector + sinusoidal positional encoding */
function embed(n: number, r: () => number): number[][] {
  const E: number[][] = [];
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(D_MODEL);
    for (let d = 0; d < D_MODEL; d++) {
      const denom = Math.pow(10000, (2 * Math.floor(d / 2)) / D_MODEL);
      const pos = d % 2 === 0 ? Math.sin(i / denom) : Math.cos(i / denom);
      e[d] = randn(r) * 0.6 + pos; // content (illustrative) + position
    }
    E.push(e);
  }
  return E;
}

/** project E (n×D_MODEL) through a random weight matrix (D_MODEL×D_K) */
function project(E: number[][], r: () => number): number[][] {
  const W: number[][] = [];
  for (let a = 0; a < D_MODEL; a++) {
    const row = new Array<number>(D_K);
    for (let b = 0; b < D_K; b++) row[b] = randn(r) / Math.sqrt(D_MODEL);
    W.push(row);
  }
  return E.map((e) => {
    const o = new Array<number>(D_K).fill(0);
    for (let b = 0; b < D_K; b++) {
      let s = 0;
      for (let a = 0; a < D_MODEL; a++) s += e[a] * W[a][b];
      o[b] = s;
    }
    return o;
  });
}

/** numerically-stable softmax over a row */
export function softmax(x: number[]): number[] {
  const m = Math.max(...x);
  const e = x.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** build the multi-head attention matrices for a token sequence */
export function buildAttention(
  tokens: string[],
  nHeads = 3,
  seed = 42,
): AttentionModel {
  const n = tokens.length;
  const E = embed(n, mulberry32(seed));
  const heads: number[][][] = [];
  for (let h = 0; h < nHeads; h++) {
    const Q = project(E, mulberry32(seed * 7 + h * 101 + 1));
    const K = project(E, mulberry32(seed * 13 + h * 211 + 1));
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      const scores = new Array<number>(n);
      for (let j = 0; j < n; j++) {
        let dot = 0;
        for (let b = 0; b < D_K; b++) dot += Q[i][b] * K[j][b];
        scores[j] = dot / Math.sqrt(D_K); // scaled dot-product
      }
      A.push(softmax(scores));
    }
    heads.push(A);
  }
  return { tokens, nHeads, heads, dModel: D_MODEL, dK: D_K };
}

export const DEFAULT_SENTENCE = [
  "The",
  "tired",
  "cat",
  "sat",
  "on",
  "the",
  "warm",
  "mat",
];
