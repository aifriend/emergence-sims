import { describe, it, expect } from "vitest";
import { advance, fresh, type MarketP, type Sim } from "../market";

/** run the model `steps` times, returning the worst |log-price| seen and whether
 * any state ever went non-finite — plus the live invariant that the chartist
 * fraction stays a valid probability. */
function run(P: MarketP, steps: number): { maxAbsP: number; sawNaN: boolean; s: Sim } {
  const s = fresh();
  let maxAbsP = 0;
  let sawNaN = false;
  for (let i = 0; i < steps; i++) {
    const r = advance(s, P);
    if (!Number.isFinite(r) || !Number.isFinite(s.p) || !Number.isFinite(s.nc)) sawNaN = true;
    maxAbsP = Math.max(maxAbsP, Math.abs(s.p));
    expect(s.nc).toBeGreaterThanOrEqual(0); // chartist fraction is a probability
    expect(s.nc).toBeLessThanOrEqual(1);
  }
  return { maxAbsP, sawNaN, s };
}

const BOUND = 1.2 + 1e-9; // the log-price clamp, with float slack

describe("market model", () => {
  it("stays finite and near fundamental at default settings", () => {
    const { maxAbsP, sawNaN } = run({ chartFrac: 0.5, gc: 0.55, noise: 0.012, speed: 1 }, 5000);
    expect(sawNaN).toBe(false);
    expect(maxAbsP).toBeLessThanOrEqual(BOUND);
  });

  it("does NOT diverge to NaN under chartist-dominant settings (regression: log-price blow-up)", () => {
    // Before the clamp, chartFrac=0.8 + gc=1.3 (both inside the slider ranges)
    // drove the log-price to ±Infinity within ~70 steps; thereafter exp(p), the
    // chart y-range and the chartist share all went NaN and the sim was dead
    // until reset. The clamp must keep every state finite and bounded.
    const { maxAbsP, sawNaN, s } = run({ chartFrac: 0.8, gc: 1.3, noise: 0.012, speed: 1 }, 5000);
    expect(sawNaN).toBe(false);
    expect(Number.isFinite(s.p)).toBe(true);
    expect(Number.isFinite(Math.exp(s.p))).toBe(true); // the price level the chart plots
    expect(maxAbsP).toBeLessThanOrEqual(BOUND);
  });

  it("holds the clamp invariant at every extreme corner of the slider ranges", () => {
    const corners: MarketP[] = [
      { chartFrac: 1, gc: 1.5, noise: 0.05, speed: 1 }, // max chartist + max trend gain
      { chartFrac: 0, gc: 0, noise: 0.05, speed: 1 }, // pure fundamentalist
      { chartFrac: 1, gc: 1.5, noise: 0, speed: 1 }, // deterministic feedback, no noise
    ];
    for (const P of corners) {
      const { maxAbsP, sawNaN } = run(P, 3000);
      expect(sawNaN).toBe(false);
      expect(maxAbsP).toBeLessThanOrEqual(BOUND);
    }
  });
});
