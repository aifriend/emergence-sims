// Pure, framework-agnostic definitions of three classic strange attractors
// plus a 4th-order Runge–Kutta integrator. No three.js / React imports here so
// this stays unit-testable and reusable.

export type Vec3 = [number, number, number];

export interface ParamControl {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface AttractorSystem {
  key: string;
  name: string;
  /** d/dt of the state vector given current point and parameters. */
  deriv: (p: Vec3, params: Record<string, number>) => Vec3;
  defaultParams: Record<string, number>;
  controls: ParamControl[];
  init: Vec3;
  /** Integration step — chosen per system for numerical stability. */
  dt: number;
  /** Base RK4 steps per animation frame (scaled by the speed control). */
  baseSteps: number;
  /** Camera look-at target (rough geometric centre of the attractor). */
  center: Vec3;
  /** Camera orbit radius. */
  camDist: number;
  /** Point sprite size in world units. */
  pointSize: number;
}

const add = (a: Vec3, b: Vec3, s: number): Vec3 => [
  a[0] + b[0] * s,
  a[1] + b[1] * s,
  a[2] + b[2] * s,
];

/** One classical RK4 step. Returns the new state; does not mutate `p`. */
export function rk4Step(
  sys: AttractorSystem,
  p: Vec3,
  params: Record<string, number>,
  dt: number,
): Vec3 {
  const k1 = sys.deriv(p, params);
  const k2 = sys.deriv(add(p, k1, dt / 2), params);
  const k3 = sys.deriv(add(p, k2, dt / 2), params);
  const k4 = sys.deriv(add(p, k3, dt), params);
  return [
    p[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    p[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    p[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

export const LORENZ: AttractorSystem = {
  key: "lorenz",
  name: "Lorenz",
  // dx=σ(y−x); dy=x(ρ−z)−y; dz=xy−βz   (Lorenz 1963)
  deriv: ([x, y, z], { sigma, rho, beta }) => [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z,
  ],
  defaultParams: { sigma: 10, rho: 28, beta: 8 / 3 },
  controls: [
    { key: "sigma", label: "σ (Prandtl)", min: 0, max: 20, step: 0.1 },
    { key: "rho", label: "ρ (Rayleigh)", min: 0, max: 50, step: 0.1 },
    { key: "beta", label: "β", min: 0, max: 5, step: 0.01 },
  ],
  init: [0.1, 0, 0],
  dt: 0.005,
  baseSteps: 6,
  center: [0, 0, 25],
  camDist: 80,
  pointSize: 0.22,
};

export const ROSSLER: AttractorSystem = {
  key: "rossler",
  name: "Rössler",
  // dx=−y−z; dy=x+ay; dz=b+z(x−c)   (Rössler 1976)
  deriv: ([x, y, z], { a, b, c }) => [-y - z, x + a * y, b + z * (x - c)],
  defaultParams: { a: 0.2, b: 0.2, c: 5.7 },
  controls: [
    { key: "a", label: "a", min: 0, max: 0.4, step: 0.005 },
    { key: "b", label: "b", min: 0, max: 2, step: 0.01 },
    { key: "c", label: "c", min: 2, max: 12, step: 0.05 },
  ],
  init: [0.1, 0, 0],
  dt: 0.02,
  baseSteps: 5,
  center: [0, 0, 3],
  camDist: 55,
  pointSize: 0.12,
};

export const AIZAWA: AttractorSystem = {
  key: "aizawa",
  name: "Aizawa",
  // A bounded, visually rich attractor (standard parameter set below).
  deriv: ([x, y, z], { a, b, c, d, e, f }) => [
    (z - b) * x - d * y,
    d * x + (z - b) * y,
    c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x,
  ],
  defaultParams: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
  controls: [
    { key: "a", label: "a", min: 0.5, max: 1.2, step: 0.01 },
    { key: "b", label: "b", min: 0.3, max: 1.0, step: 0.01 },
    { key: "c", label: "c", min: 0.2, max: 1.0, step: 0.01 },
    { key: "d", label: "d", min: 2.5, max: 4.5, step: 0.05 },
  ],
  init: [0.1, 0, 0],
  dt: 0.01,
  baseSteps: 6,
  center: [0, 0, 0.4],
  camDist: 4.2,
  pointSize: 0.012,
};

export const SYSTEMS: Record<string, AttractorSystem> = {
  lorenz: LORENZ,
  rossler: ROSSLER,
  aizawa: AIZAWA,
};

export const SYSTEM_ORDER = ["lorenz", "rossler", "aizawa"] as const;
