/**
 * Langton's Ant (Chris Langton, 1986) — the pure, React-free core behind the
 * Langton's Ant lab sim, extracted so it can be unit-tested. A single "ant"
 * (a 2-state turmite) walks a toroidal grid of binary cells under two trivial
 * rules: on a WHITE cell it turns right, on a BLACK cell it turns left; either
 * way it flips the cell it is standing on, then steps forward one cell. From
 * this minimal recipe comes a long chaotic transient (~10,000 steps) that then
 * spontaneously, and forever, builds a periodic diagonal "highway". The general
 * turmite family is Turing-complete.
 */

/** Heading: 0=N, 1=E, 2=S, 3=W. Indexed by the DELTA tables below. */
export const N = 0;
export const E = 1;
export const S = 2;
export const W = 3;

/** Row deltas per heading {N,E,S,W}: N goes up (-1), S goes down (+1). */
export const DR = [-1, 0, 1, 0] as const;
/** Col deltas per heading {N,E,S,W}: E goes right (+1), W goes left (-1). */
export const DC = [0, 1, 0, -1] as const;

/** An ant: grid position (row, col) and a heading `dir` in {0..3}. */
export type Ant = { row: number; col: number; dir: number };

/**
 * Advance the simulation by one step, mutating BOTH `grid` and `ant` in place.
 *
 * Reads the ant's current cell, then:
 *   - white (0): turn right  → dir = (dir + 1) % 4
 *   - black (1): turn left   → dir = (dir + 3) % 4
 * flips the current cell colour (^= 1), and finally moves the ant forward one
 * cell with toroidal wrapping on both axes.
 *
 * `grid` is a row-major Uint8Array of length `cols * rows`; index = row*cols+col.
 */
export function stepAnt(
  grid: Uint8Array,
  cols: number,
  rows: number,
  ant: Ant,
): void {
  const i = ant.row * cols + ant.col;
  // 1. turn based on the current cell colour
  if (grid[i] === 0) ant.dir = (ant.dir + 1) % 4; // white → right
  else ant.dir = (ant.dir + 3) % 4; // black → left
  // 2. flip the current cell
  grid[i] ^= 1;
  // 3. step forward one cell, wrapping toroidally
  ant.row = (ant.row + DR[ant.dir] + rows) % rows;
  ant.col = (ant.col + DC[ant.dir] + cols) % cols;
}

/** Convenience: a fresh ant at the grid centre, facing North. */
export function centreAnt(cols: number, rows: number): Ant {
  return { row: rows >> 1, col: cols >> 1, dir: N };
}

/** Count the black (1) cells in a grid — the live readout / thumbnail trigger. */
export function countBlack(grid: Uint8Array): number {
  let n = 0;
  for (let k = 0; k < grid.length; k++) n += grid[k];
  return n;
}
