import { describe, it, expect } from "vitest";
import {
  cpReset,
  cpStep,
  discretize,
  N_STATES,
  X_THRESH,
  THETA_THRESH,
} from "../cartpole";

describe("cartpole physics", () => {
  it("cpReset is deterministic given a deterministic RNG", () => {
    // each component: rand() * 0.1 - 0.05 = 0 when rand returns 0.5
    const s = cpReset(() => 0.5);
    expect(s).toEqual([0, 0, 0, 0]);
  });

  it("a single right-push step from rest accelerates xd > 0 and thd < 0", () => {
    const { state, done } = cpStep([0, 0, 0, 0], 1);
    // cart-position x stays 0 on this tick (xd was 0); velocity & angular
    // velocity update immediately
    expect(state[1]).toBeGreaterThan(0); // xd: cart starts moving right
    expect(state[3]).toBeLessThan(0); // thd: pole begins tipping backward
    expect(done).toBe(false);
  });

  it("a single left-push step from rest accelerates xd < 0 and thd > 0", () => {
    const { state, done } = cpStep([0, 0, 0, 0], 0);
    expect(state[1]).toBeLessThan(0);
    expect(state[3]).toBeGreaterThan(0);
    expect(done).toBe(false);
  });

  it("terminates when |x| exceeds X_THRESH", () => {
    // xd=0, so the next x stays beyond the threshold
    const { done } = cpStep([X_THRESH + 0.1, 0, 0, 0], 1);
    expect(done).toBe(true);
  });

  it("terminates when |theta| exceeds THETA_THRESH", () => {
    const { done } = cpStep([0, 0, THETA_THRESH + 0.01, 0], 0);
    expect(done).toBe(true);
  });
});

describe("cartpole state discretization", () => {
  it("exposes 72 discrete states (1 * 1 * 6 * 12)", () => {
    expect(N_STATES).toBe(72);
  });

  it("clamps out-of-range states into valid bin indices", () => {
    const idx = discretize([1e9, 1e9, 1e9, 1e9]);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(N_STATES);
  });

  it("maps the resting state into a valid bin", () => {
    const idx = discretize([0, 0, 0, 0]);
    expect(idx).toBeLessThan(N_STATES);
  });
});
