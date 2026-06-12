import { describe, it, expect } from "vitest";
import {
  PATTERNS,
  parseRule,
  stampPattern,
  stepLifelike,
  type Pattern,
} from "../ca/lifelike";

const LIFE = parseRule("B3/S23");

function blank(cols: number, rows: number): Uint8Array {
  return new Uint8Array(cols * rows);
}
function set(g: Uint8Array, cols: number, cells: [number, number][]): void {
  for (const [y, x] of cells) g[y * cols + x] = 1;
}

describe("life-like model", () => {
  it("parses B/S rule codes", () => {
    expect(LIFE.born[3]).toBe(true);
    expect(LIFE.born[2]).toBe(false);
    expect(LIFE.survive[2]).toBe(true);
    expect(LIFE.survive[3]).toBe(true);
    expect(LIFE.survive[1]).toBe(false);
    const seeds = parseRule("B2/S");
    expect(seeds.born[2]).toBe(true);
    expect(seeds.survive.every((v) => v === false)).toBe(true);
  });

  it("a blinker oscillates with period 2 under Life", () => {
    const cols = 7;
    const rows = 7;
    let g = blank(cols, rows);
    let nx = blank(cols, rows);
    // horizontal 3-cell row at center
    set(g, cols, [[3, 2], [3, 3], [3, 4]]);
    // step 1 → vertical
    stepLifelike(g, nx, cols, rows, LIFE, true);
    expect(nx[2 * cols + 3]).toBe(1);
    expect(nx[3 * cols + 3]).toBe(1);
    expect(nx[4 * cols + 3]).toBe(1);
    expect(nx[3 * cols + 2]).toBe(0);
    // step 2 → back to horizontal
    [g, nx] = [nx, g];
    stepLifelike(g, nx, cols, rows, LIFE, true);
    expect(nx[3 * cols + 2]).toBe(1);
    expect(nx[3 * cols + 3]).toBe(1);
    expect(nx[3 * cols + 4]).toBe(1);
  });

  it("a glider translates by (1,1) every 4 generations", () => {
    const cols = 30;
    const rows = 30;
    const glider = PATTERNS.find((p) => p.name === "Glider") as Pattern;
    let g = blank(cols, rows);
    let nx = blank(cols, rows);
    stampPattern(g, cols, rows, glider, 5, 5);
    for (let i = 0; i < 4; i++) {
      stepLifelike(g, nx, cols, rows, LIFE, true);
      [g, nx] = [nx, g];
    }
    // the glider's 5 cells, shifted +1 row / +1 col from the stamp
    for (const [r, c] of glider.cells) {
      expect(g[(5 + r + 1) * cols + (5 + c + 1)], `cell ${r},${c}`).toBe(1);
    }
    let pop = 0;
    for (const v of g) pop += v;
    expect(pop).toBe(5); // still exactly one glider, nothing spurious
  });

  it("the Gosper gun emits gliders (population grows past its 36 cells)", () => {
    const cols = 90;
    const rows = 90;
    const gun = PATTERNS.find((p) => p.name === "Gosper gun") as Pattern;
    let g = blank(cols, rows);
    let nx = blank(cols, rows);
    const placed = stampPattern(g, cols, rows, gun, 2, 2);
    expect(placed).toBe(36);
    for (let i = 0; i < 120; i++) {
      stepLifelike(g, nx, cols, rows, LIFE, false); // walls: gliders fly free
      [g, nx] = [nx, g];
    }
    let pop = 0;
    for (const v of g) pop += v;
    expect(pop).toBeGreaterThan(36); // gun + several emitted gliders in flight
  });
});
