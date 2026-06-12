import { describe, it, expect } from "vitest";
import {
  ruleLookup,
  stepRow,
  singleSeed,
  randomSeed,
} from "../ca/elementary";

describe("elementary CA rule tables", () => {
  it("rule 30 expands to [0,1,1,1,1,0,0,0] for i = 0..7", () => {
    // 30 = 0b00011110, lookup[i] = (30 >> i) & 1
    expect(Array.from(ruleLookup(30))).toEqual([0, 1, 1, 1, 1, 0, 0, 0]);
  });

  it("rule 110 expands to [0,1,1,1,0,1,1,0] for i = 0..7", () => {
    // 110 = 0b01101110
    expect(Array.from(ruleLookup(110))).toEqual([0, 1, 1, 1, 0, 1, 1, 0]);
  });

  it("rule 90 expands to the XOR rule [0,1,0,1,1,0,1,0]", () => {
    // 90 = 0b01011010 ⇒ next = left XOR right
    expect(Array.from(ruleLookup(90))).toEqual([0, 1, 0, 1, 1, 0, 1, 0]);
  });

  it("clamps out-of-range / fractional rule numbers into 0..255 (mod 256)", () => {
    expect(Array.from(ruleLookup(256))).toEqual(Array.from(ruleLookup(0)));
    expect(Array.from(ruleLookup(-1))).toEqual(Array.from(ruleLookup(255)));
    expect(Array.from(ruleLookup(90.9))).toEqual(Array.from(ruleLookup(90)));
  });
});

describe("elementary CA single step", () => {
  it("rule 90 from a centred seed lights exactly the two cells adjacent to centre", () => {
    // The Sierpinski step: next = left XOR right, so a lone 1 spawns its two
    // neighbours and clears its own cell.
    const row = singleSeed(9); // centre index = 4
    const next = stepRow(row, ruleLookup(90));
    expect(next[3]).toBe(1); // left of centre
    expect(next[5]).toBe(1); // right of centre
    expect(next[4]).toBe(0); // centre itself goes dark
    let lit = 0;
    for (const v of next) lit += v;
    expect(lit).toBe(2); // and nothing else is alive
  });

  it("rule 110 matches a hand-computed step on a tiny row", () => {
    // row [0,1,1,0,0] under rule 110 (toroidal) → [1,1,1,0,0]
    const next = stepRow(Uint8Array.from([0, 1, 1, 0, 0]), ruleLookup(110));
    expect(Array.from(next)).toEqual([1, 1, 1, 0, 0]);
  });

  it("rule 30 matches a hand-computed step on a tiny row", () => {
    // row [0,0,1,0,0] under rule 30 (toroidal): centre seed grows asymmetrically
    // x2: idx 010=2 → 1 ; x3: idx 100=4 → 1 ; x1: idx 001=1 → 1 ; rest 0
    const next = stepRow(Uint8Array.from([0, 0, 1, 0, 0]), ruleLookup(30));
    expect(Array.from(next)).toEqual([0, 1, 1, 1, 0]);
  });

  it("wraps toroidally at both edges (rule 90)", () => {
    // [1,0,0,0,0]: cell 0's left is cell 4, cell 4's right is cell 0. Under XOR
    // the lone 1 reaches across the ring to light cell 1 AND cell 4.
    const next = stepRow(Uint8Array.from([1, 0, 0, 0, 0]), ruleLookup(90));
    expect(Array.from(next)).toEqual([0, 1, 0, 0, 1]);
  });

  it("does not mutate the input row", () => {
    const row = Uint8Array.from([0, 1, 0]);
    const copy = Uint8Array.from(row);
    stepRow(row, ruleLookup(110));
    expect(Array.from(row)).toEqual(Array.from(copy));
  });
});

describe("elementary CA seeds", () => {
  it("singleSeed places exactly one live cell, at the centre", () => {
    const row = singleSeed(7);
    let lit = 0;
    for (const v of row) lit += v;
    expect(lit).toBe(1);
    expect(row[3]).toBe(1); // centre of width 7
  });

  it("randomSeed is deterministic given a deterministic RNG", () => {
    expect(Array.from(randomSeed(4, 0.5, () => 0.0))).toEqual([1, 1, 1, 1]);
    expect(Array.from(randomSeed(4, 0.5, () => 0.9))).toEqual([0, 0, 0, 0]);
  });
});
