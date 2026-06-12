/**
 * Wolfram's elementary cellular automata — the pure, React-free core behind the
 * Elementary CA lab sim, extracted so it can be unit-tested. A 1-D row of binary
 * cells evolves in lock-step: each cell's next state depends only on itself and
 * its two immediate neighbours (radius-1, 2-state), with the row wrapped into a
 * ring (toroidal). The update is fully specified by a single integer 0..255 — the
 * "rule" — whose 8 bits are the outputs for the 8 possible 3-cell neighbourhoods.
 * From this trivially local recipe come Sierpinski fractals (90), pseudo-random
 * chaos (30, used for randomness in Mathematica) and Turing-completeness (110).
 */

/** A neighbourhood is (left<<2)|(centre<<1)|right ⇒ an index 0..7. */
export type Rule = number;

/**
 * Expand a rule number 0..255 into its length-8 output table.
 * `lookup[i]` is the next centre-state for neighbourhood index `i`, where
 * `i = (left<<2) | (centre<<1) | right`. So `lookup[i] = (rule >> i) & 1`.
 */
export function ruleLookup(rule: Rule): Uint8Array {
  const r = ((Math.trunc(rule) % 256) + 256) % 256; // clamp into 0..255
  const t = new Uint8Array(8);
  for (let i = 0; i < 8; i++) t[i] = (r >> i) & 1;
  return t;
}

/**
 * Advance one generation. Returns a NEW row (does not mutate `row`). Neighbours
 * wrap toroidally, so cell 0's left is the last cell and the last cell's right is
 * cell 0.
 */
export function stepRow(row: Uint8Array, lookup: Uint8Array): Uint8Array {
  const n = row.length;
  const next = new Uint8Array(n);
  if (n === 0) return next;
  for (let x = 0; x < n; x++) {
    const left = row[x === 0 ? n - 1 : x - 1];
    const centre = row[x];
    const right = row[x === n - 1 ? 0 : x + 1];
    const idx = (left << 2) | (centre << 1) | right;
    next[x] = lookup[idx];
  }
  return next;
}

/** A row of `width` zeros with a single 1 at the centre — the classic seed. */
export function singleSeed(width: number): Uint8Array {
  const row = new Uint8Array(Math.max(0, width));
  if (row.length > 0) row[row.length >> 1] = 1;
  return row;
}

/** A row of `width` cells, each independently alive with probability `p`. */
export function randomSeed(
  width: number,
  p = 0.5,
  rand: () => number = Math.random,
): Uint8Array {
  const row = new Uint8Array(Math.max(0, width));
  for (let i = 0; i < row.length; i++) row[i] = rand() < p ? 1 : 0;
  return row;
}

/** Curated rules with characterful behaviour, surfaced as preset buttons. */
export const FAMOUS: { rule: Rule; name: string }[] = [
  { rule: 30, name: "Chaos" },
  { rule: 90, name: "Sierpinski" },
  { rule: 110, name: "Universal" },
  { rule: 184, name: "Traffic" },
  { rule: 150, name: "XOR-3" },
  { rule: 54, name: "Class IV" },
];
