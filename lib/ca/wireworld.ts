/**
 * Wireworld (Brian Silverman, 1987) — the pure, React-free core behind the
 * Wireworld lab sim, extracted so it can be unit-tested. It is a 4-state
 * cellular automaton on a 2-D grid with a Moore (8-cell) neighbourhood that is
 * expressive enough to run digital logic: wires carry "electrons", and from
 * gates built out of wire you can assemble a full, Turing-complete computer.
 *
 * Each cell is one of four states and updates synchronously by these rules:
 *   EMPTY (0)            -> stays EMPTY
 *   HEAD  (1) electron   -> becomes TAIL
 *   TAIL  (2) electron   -> becomes WIRE
 *   WIRE  (3) conductor  -> becomes HEAD iff exactly 1 or 2 of its 8 Moore
 *                           neighbours are heads, else stays WIRE
 * An electron is the pair head→tail; the head advances along the wire because
 * the wire cell just ahead of it sees exactly one head, while the cell behind
 * has become a tail and is skipped. A closed loop of wire carrying one electron
 * is therefore a perpetual clock whose period equals the loop length.
 */

export const EMPTY = 0;
export const HEAD = 1;
export const TAIL = 2;
export const WIRE = 3;

/**
 * Advance one generation. Returns a NEW grid (does not mutate `grid`).
 * Neighbours wrap toroidally; pad circuits with empty cells so the wrap never
 * brings a head into a conductor's neighbourhood spuriously.
 */
export function stepWireworld(
  grid: Uint8Array,
  cols: number,
  rows: number,
): Uint8Array {
  const next = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const cell = grid[i];
      if (cell === HEAD) {
        next[i] = TAIL;
      } else if (cell === TAIL) {
        next[i] = WIRE;
      } else if (cell === WIRE) {
        let heads = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const ny = (y + dy + rows) % rows;
            const nx = (x + dx + cols) % cols;
            if (grid[ny * cols + nx] === HEAD) heads++;
          }
        }
        next[i] = heads === 1 || heads === 2 ? HEAD : WIRE;
      }
      // EMPTY (and any stray value) stays EMPTY: next[i] already 0.
    }
  }
  return next;
}

/**
 * Build a grid from ASCII art. Character map: '.' or ' ' = EMPTY, '#' = WIRE,
 * 'H' = HEAD, 't' = TAIL. The art is padded with `pad` empty cells on every
 * side (default 2) so that toroidal wrap cannot inflate a conductor's head
 * count. Rows are right-padded to the longest line so the grid is rectangular.
 */
export function fromAscii(
  art: string,
  pad = 2,
): { grid: Uint8Array; cols: number; rows: number } {
  const lines = art.replace(/^\n+|\n+$/g, "").split("\n");
  const width = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const cols = width + pad * 2;
  const rows = lines.length + pad * 2;
  const grid = new Uint8Array(cols * rows);
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < width; x++) {
      const ch = x < line.length ? line[x] : ".";
      const v =
        ch === "#" ? WIRE : ch === "H" ? HEAD : ch === "t" ? TAIL : EMPTY;
      if (v !== EMPTY) grid[(y + pad) * cols + (x + pad)] = v;
    }
  }
  return { grid, cols, rows };
}

/**
 * Closed wire loops of different sizes, each seeded with one electron ("tH",
 * tail-then-head, so the head propagates away from the tail). With one electron
 * a loop is a perpetual clock; its period equals the number of wire cells in the
 * ring. Different ring lengths give different periods, so the scenes stay alive
 * and visually busy forever.
 */
export const CIRCUITS: { name: string; art: string }[] = [
  {
    // Small ring (3 rows). One electron circulates a tight rectangular loop.
    name: "Small ring",
    art: ["##########", "#........#", "##tH######"].join("\n"),
  },
  {
    // Larger ring (6 rows): same idea, longer perimeter ⇒ slower clock.
    name: "Large ring",
    art: [
      "################",
      "#..............#",
      "#..............#",
      "#..............#",
      "#..............#",
      "##tH############",
    ].join("\n"),
  },
  {
    // Two independent rings side by side, electrons launched in opposite
    // directions ("tH" vs "Ht") so the two clocks tick out of phase.
    name: "Twin rings",
    art: [
      "#########..#########",
      "#.......#..#.......#",
      "##tH#####..#####Ht##",
    ].join("\n"),
  },
];
