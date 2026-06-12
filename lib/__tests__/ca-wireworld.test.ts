import { describe, it, expect } from "vitest";
import {
  stepWireworld,
  fromAscii,
  CIRCUITS,
  EMPTY,
  HEAD,
  TAIL,
  WIRE,
} from "../ca/wireworld";

/** Count cells in `grid` that equal `state`. */
function count(grid: Uint8Array, state: number): number {
  let c = 0;
  for (const v of grid) if (v === state) c++;
  return c;
}

/** Index of the (single) head cell, or -1. */
function headIndex(grid: Uint8Array): number {
  for (let i = 0; i < grid.length; i++) if (grid[i] === HEAD) return i;
  return -1;
}

describe("wireworld cell transitions", () => {
  it("an isolated electron goes head -> tail -> wire over two steps", () => {
    // A short straight wire with one electron (tail then head). With padding the
    // head sits in the middle so only the wire ahead of it can ever light up.
    const { grid, cols, rows } = fromAscii("#tH##");
    const h0 = headIndex(grid);
    expect(grid[h0]).toBe(HEAD);

    const g1 = stepWireworld(grid, cols, rows);
    // The original head cell becomes a tail after one step…
    expect(g1[h0]).toBe(TAIL);

    const g2 = stepWireworld(g1, cols, rows);
    // …and a wire (conductor) after the second step.
    expect(g2[h0]).toBe(WIRE);
  });

  it("the head advances exactly one cell per step along a straight wire", () => {
    const { grid, cols, rows } = fromAscii("tH##########");
    let g = grid;
    let prev = headIndex(g);
    // Step while the head is mid-wire (away from the far end) and assert it
    // moves by exactly +1 column each generation.
    for (let s = 0; s < 6; s++) {
      g = stepWireworld(g, cols, rows);
      const next = headIndex(g);
      expect(next).toBe(prev + 1); // one cell to the right, same row
      prev = next;
    }
  });

  it("a wire with three head-neighbours does NOT become a head", () => {
    // Centre wire cell with three heads packed around it (top-left, top, top-right).
    const { grid, cols, rows } = fromAscii(["HHH", ".#."].join("\n"));
    // Locate the lone wire cell.
    let wireIdx = -1;
    for (let i = 0; i < grid.length; i++) if (grid[i] === WIRE) wireIdx = i;
    expect(wireIdx).toBeGreaterThanOrEqual(0);
    expect(count(grid, HEAD)).toBe(3);

    const g1 = stepWireworld(grid, cols, rows);
    // Exactly-1-or-2 head-neighbours fire; three does not, so it stays wire.
    expect(g1[wireIdx]).toBe(WIRE);
  });

  it("empty cells stay empty", () => {
    const { grid, cols, rows } = fromAscii("#tH#");
    const g1 = stepWireworld(grid, cols, rows);
    // The padding border is all empty and must remain so.
    expect(g1[0]).toBe(EMPTY);
    expect(g1[g1.length - 1]).toBe(EMPTY);
  });
});

describe("wireworld clock loops", () => {
  it("the small ring returns a head to a fixed cell with a fixed period", () => {
    const small = CIRCUITS.find((c) => c.name === "Small ring");
    expect(small).toBeDefined();
    const { grid, cols, rows } = fromAscii(small!.art);

    // Observation cell = the seeded head's location.
    const obs = headIndex(grid);
    expect(obs).toBeGreaterThanOrEqual(0);

    // Find the first step (>0) at which a head is back on the observation cell.
    let g = grid;
    let period = -1;
    for (let s = 1; s <= 200; s++) {
      g = stepWireworld(g, cols, rows);
      if (g[obs] === HEAD) {
        period = s;
        break;
      }
    }
    expect(period).toBe(18); // verified loop period (one full lap of the ring)

    // And it is genuinely periodic: the head is back on `obs` again at 2×period.
    let g2 = grid;
    for (let s = 0; s < period * 2; s++) g2 = stepWireworld(g2, cols, rows);
    expect(g2[obs]).toBe(HEAD);
  });

  it("every shipped circuit is a self-sustaining clock (electrons never die or blow up)", () => {
    for (const circuit of CIRCUITS) {
      const { grid, cols, rows } = fromAscii(circuit.art);
      const seeds = count(grid, HEAD);
      expect(seeds).toBeGreaterThan(0);

      let g = grid;
      let minHeads = Infinity;
      let maxHeads = 0;
      for (let s = 0; s < 400; s++) {
        g = stepWireworld(g, cols, rows);
        const h = count(g, HEAD);
        if (h < minHeads) minHeads = h;
        if (h > maxHeads) maxHeads = h;
      }
      // Never extinguishes (a perpetual clock) and never multiplies without
      // bound: at most one extra transient head per electron at the corners.
      expect(minHeads).toBeGreaterThanOrEqual(1);
      expect(maxHeads).toBeLessThanOrEqual(seeds * 2);
    }
  });
});
