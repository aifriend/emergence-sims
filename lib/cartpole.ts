// CartPole control task (Barto–Sutton–Anderson / OpenAI Gym physics) + a tabular
// Q-learning agent over a discretized state. Pure & testable. Hyperparameters
// autoresearch-tuned over a 5-seed validation set: solves to the 500-step cap on
// every seed (median ~129 episodes) — see .autoresearch/ for the optimization run.

export type CPState = [number, number, number, number]; // x, ẋ, θ, θ̇

const G = 9.8;
const MASS_CART = 1.0;
const MASS_POLE = 0.1;
const TOTAL_MASS = MASS_CART + MASS_POLE;
const HALF_LENGTH = 0.5; // half the pole's length
const POLEMASS_LENGTH = MASS_POLE * HALF_LENGTH;
const FORCE_MAG = 10;
const TAU = 0.02; // 50 Hz

export const X_THRESH = 2.4;
export const THETA_THRESH = (12 * Math.PI) / 180; // ≈0.2095 rad
export const STEP_HZ = 1 / TAU;

export function cpReset(rand: () => number = Math.random): CPState {
  return [
    rand() * 0.1 - 0.05,
    rand() * 0.1 - 0.05,
    rand() * 0.1 - 0.05,
    rand() * 0.1 - 0.05,
  ];
}

/** one 0.02 s Euler step. action 0 = push left, 1 = push right. */
export function cpStep(s: CPState, a: number): { state: CPState; done: boolean } {
  const [x, xd, th, thd] = s;
  const force = a === 1 ? FORCE_MAG : -FORCE_MAG;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const temp = (force + POLEMASS_LENGTH * thd * thd * st) / TOTAL_MASS;
  const thacc =
    (G * st - ct * temp) /
    (HALF_LENGTH * (4 / 3 - (MASS_POLE * ct * ct) / TOTAL_MASS));
  const xacc = temp - (POLEMASS_LENGTH * thacc * ct) / TOTAL_MASS;
  const ns: CPState = [
    x + TAU * xd,
    xd + TAU * xacc,
    th + TAU * thd,
    thd + TAU * thacc,
  ];
  const done = Math.abs(ns[0]) > X_THRESH || Math.abs(ns[2]) > THETA_THRESH;
  return { state: ns, done };
}

// --- state discretization: ignore cart x / ẋ; θ → 6 bins, θ̇ → 12 bins (72 states)
const NBINS = [1, 1, 6, 12];
const LO = [-X_THRESH, -3.0, -THETA_THRESH, -3.0];
const HI = [X_THRESH, 3.0, THETA_THRESH, 3.0];
export const N_STATES = NBINS.reduce((a, b) => a * b, 1);

export function discretize(s: CPState): number {
  let idx = 0;
  let mul = 1;
  for (let d = 0; d < 4; d++) {
    let b = Math.floor(((s[d] - LO[d]) / (HI[d] - LO[d])) * NBINS[d]);
    b = Math.max(0, Math.min(NBINS[d] - 1, b));
    idx += b * mul;
    mul *= NBINS[d];
  }
  return idx;
}

export class QLearner {
  Q: Float64Array;
  gamma = 0.99;
  episode = 0;
  constructor() {
    this.Q = new Float64Array(N_STATES * 2);
  }
  /** decaying learning rate & exploration (log schedule; autoresearch-tuned floors) */
  schedule(): { alpha: number; eps: number } {
    const v = Math.max(0, 1 - Math.log10((this.episode + 1) / 14));
    return {
      alpha: Math.max(0.02, Math.min(0.5, v)),
      eps: Math.max(0.01, Math.min(1, v)),
    };
  }
  act(si: number, eps: number): number {
    if (Math.random() < eps) return Math.random() < 0.5 ? 0 : 1;
    const o = si * 2;
    return this.Q[o] >= this.Q[o + 1] ? 0 : 1;
  }
  /** Q(s,a) ← Q + α[r + γ·maxₐ′Q(s′,a′) − Q]; reward +1/step, −10 on fall */
  update(si: number, a: number, nsi: number, done: boolean, alpha: number): void {
    const o = si * 2 + a;
    const target = done
      ? -10
      : 1 + this.gamma * Math.max(this.Q[nsi * 2], this.Q[nsi * 2 + 1]);
    this.Q[o] += alpha * (target - this.Q[o]);
  }
  reset(): void {
    this.Q.fill(0);
    this.episode = 0;
  }
}
