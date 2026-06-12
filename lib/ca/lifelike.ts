/**
 * Life-like cellular automata — the pure, testable model behind the Game of Life
 * card. Generalises Conway's rule to any "B…/S…" birth/survival rule on a Moore
 * neighbourhood, and ships a few classic seed patterns. Framework-free.
 */

/** A born/survive rule: `born[n]`/`survive[n]` = does a dead/live cell with `n`
 * live Moore-neighbours turn on / stay on. Indices 0..8. */
export type LifeRule = { born: boolean[]; survive: boolean[] };

/** Parse "B3/S23"-style rule strings (Golly/RLE convention). */
export function parseRule(code: string): LifeRule {
  const born = new Array(9).fill(false);
  const survive = new Array(9).fill(false);
  const m = /B([0-8]*)\/S([0-8]*)/i.exec(code);
  if (m) {
    for (const c of m[1]) born[Number(c)] = true;
    for (const c of m[2]) survive[Number(c)] = true;
  }
  return { born, survive };
}

/** A handful of well-known life-like rules. */
export const RULES: { name: string; code: string }[] = [
  { name: "Life", code: "B3/S23" },
  { name: "HighLife", code: "B36/S23" },
  { name: "Day & Night", code: "B3678/S34678" },
  { name: "Seeds", code: "B2/S" },
];

/** One generation under a B/S rule. Writes into `next`, returns live population.
 * `wrap` toggles toroidal vs walled edges. */
export function stepLifelike(
  g: Uint8Array,
  next: Uint8Array,
  cols: number,
  rows: number,
  rule: LifeRule,
  wrap: boolean,
): number {
  let pop = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          let ny = y + dy;
          let nxx = x + dx;
          if (wrap) {
            ny = (ny + rows) % rows;
            nxx = (nxx + cols) % cols;
          } else if (ny < 0 || ny >= rows || nxx < 0 || nxx >= cols) {
            continue;
          }
          n += g[ny * cols + nxx];
        }
      }
      const alive = g[y * cols + x];
      const on = alive ? rule.survive[n] : rule.born[n];
      next[y * cols + x] = on ? 1 : 0;
      if (on) pop++;
    }
  }
  return pop;
}

/** A named seed pattern as relative [row, col] cells. */
export type Pattern = { name: string; cells: [number, number][] };

export const PATTERNS: Pattern[] = [
  {
    name: "Glider",
    cells: [
      [0, 1], [1, 2], [2, 0], [2, 1], [2, 2],
    ],
  },
  {
    name: "R-pentomino",
    cells: [
      [0, 1], [0, 2], [1, 0], [1, 1], [2, 1],
    ],
  },
  {
    // Gosper glider gun (Bill Gosper, 1970) — the first known gun; emits a
    // glider every 30 generations. 36 cells, needs the Life rule (B3/S23).
    name: "Gosper gun",
    cells: [
      [0, 24],
      [1, 22], [1, 24],
      [2, 12], [2, 13], [2, 20], [2, 21], [2, 34], [2, 35],
      [3, 11], [3, 15], [3, 20], [3, 21], [3, 34], [3, 35],
      [4, 0], [4, 1], [4, 10], [4, 16], [4, 20], [4, 21],
      [5, 0], [5, 1], [5, 10], [5, 14], [5, 16], [5, 17], [5, 22], [5, 24],
      [6, 10], [6, 16], [6, 24],
      [7, 11], [7, 15],
      [8, 12], [8, 13],
    ],
  },
];

/** Clear `g` and stamp `pattern` with its top-left at (oy, ox). Returns the
 * number of cells placed (those that fall inside the grid). */
export function stampPattern(
  g: Uint8Array,
  cols: number,
  rows: number,
  pattern: Pattern,
  oy: number,
  ox: number,
): number {
  g.fill(0);
  let pop = 0;
  for (const [r, c] of pattern.cells) {
    const y = oy + r;
    const x = ox + c;
    if (y >= 0 && y < rows && x >= 0 && x < cols) {
      g[y * cols + x] = 1;
      pop++;
    }
  }
  return pop;
}
