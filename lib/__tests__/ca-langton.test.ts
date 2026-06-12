import { describe, it, expect } from "vitest";
import {
  stepAnt,
  centreAnt,
  countBlack,
  N,
  E,
  S,
  W,
  type Ant,
} from "../ca/langton";

const COLS = 9;
const ROWS = 9;
const blank = () => new Uint8Array(COLS * ROWS);

describe("Langton's Ant — single step from a blank grid", () => {
  it("flips the start cell and turns right (N→E), then moves east", () => {
    const grid = blank();
    const ant = centreAnt(COLS, ROWS); // (4,4) facing N
    expect(ant).toEqual<Ant>({ row: 4, col: 4, dir: N });

    stepAnt(grid, COLS, ROWS, ant);

    // start cell is now black
    expect(grid[4 * COLS + 4]).toBe(1);
    // white cell ⇒ right turn N→E, then one step east (col+1)
    expect(ant).toEqual<Ant>({ row: 4, col: 5, dir: E });
    expect(countBlack(grid)).toBe(1);
  });
});

describe("Langton's Ant — the first four steps trace a 2×2 square", () => {
  it("walks the known clockwise square and back to the start cell facing N", () => {
    const grid = blank();
    const ant = centreAnt(COLS, ROWS); // (4,4) facing N

    // Step 1: white→right N→E, flip (4,4), move E → (4,5)
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant).toEqual<Ant>({ row: 4, col: 5, dir: E });
    expect(countBlack(grid)).toBe(1);

    // Step 2: white→right E→S, flip (4,5), move S → (5,5)
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant).toEqual<Ant>({ row: 5, col: 5, dir: S });
    expect(countBlack(grid)).toBe(2);

    // Step 3: white→right S→W, flip (5,5), move W → (5,4)
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant).toEqual<Ant>({ row: 5, col: 4, dir: W });
    expect(countBlack(grid)).toBe(3);

    // Step 4: white→right W→N, flip (5,4), move N → (4,4) (start cell, now black)
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant).toEqual<Ant>({ row: 4, col: 4, dir: N });
    expect(countBlack(grid)).toBe(4);

    // each of the first four steps painted a fresh cell — none revisited yet,
    // so the black-cell count equals the step count.
    expect(grid[4 * COLS + 4]).toBe(1);
    expect(grid[4 * COLS + 5]).toBe(1);
    expect(grid[5 * COLS + 5]).toBe(1);
    expect(grid[5 * COLS + 4]).toBe(1);
  });

  it("step 5 is the first revisit: it un-flips the start cell back to white", () => {
    const grid = blank();
    const ant = centreAnt(COLS, ROWS);
    for (let i = 0; i < 4; i++) stepAnt(grid, COLS, ROWS, ant);
    expect(countBlack(grid)).toBe(4); // four distinct black cells

    // ant is back on (4,4) which is now BLACK → turn left N→W, flip to white
    stepAnt(grid, COLS, ROWS, ant);
    expect(grid[4 * COLS + 4]).toBe(0); // un-flipped
    expect(ant).toEqual<Ant>({ row: 4, col: 3, dir: W }); // black→left N→W, step W
    expect(countBlack(grid)).toBe(3); // count went DOWN — proves the revisit
  });
});

describe("Langton's Ant — toroidal wrap", () => {
  it("wraps north off the top edge to the bottom row", () => {
    const grid = blank();
    // place the ant on the top row already standing on a BLACK cell so it turns
    // left (N→W) — instead force a clean north move by standing on white and
    // facing W so the right-turn yields N. Simpler: stand on white at row 0
    // facing W → right turn W→N, then move north → wraps to row ROWS-1.
    const ant: Ant = { row: 0, col: 2, dir: W };
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant.dir).toBe(N); // white ⇒ right turn W→N
    expect(ant.row).toBe(ROWS - 1); // wrapped off the top edge
    expect(ant.col).toBe(2);
  });

  it("wraps west off the left edge to the rightmost column", () => {
    const grid = blank();
    // stand on white at col 0 facing S → right turn S→W, then step west → wraps.
    const ant: Ant = { row: 3, col: 0, dir: S };
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant.dir).toBe(W); // white ⇒ right turn S→W
    expect(ant.col).toBe(COLS - 1); // wrapped off the left edge
    expect(ant.row).toBe(3);
  });

  it("wraps east off the right edge to column 0", () => {
    const grid = blank();
    // stand on white at the last column facing N → right turn N→E, step east → wraps.
    const ant: Ant = { row: 3, col: COLS - 1, dir: N };
    stepAnt(grid, COLS, ROWS, ant);
    expect(ant.dir).toBe(E);
    expect(ant.col).toBe(0);
    expect(ant.row).toBe(3);
  });
});
