/**
 * Neuroevolution F1 racer — the pure, framework-free model behind the "watch a
 * neural net drive" hero, ported faithfully from the standalone `sim games`
 * project (its headless physics, so behaviour is identical to the trainer).
 *
 * A tiny net drives the car: 9 forward "whisker" range sensors + current speed
 * → 16 tanh hidden → (steer, gas). Brains are evolved, not back-propagated, and
 * use LoRA-style per-level adapters so one champion drives a whole curriculum of
 * tracks. We only need INFERENCE here (load weights, pick the track's level,
 * drive) — no mutation/training. The brain JSON ships in /public/brains.
 */

// ── architecture ────────────────────────────────────────────────────────────
export const NUM_SENSORS = 9;
export const NUM_INPUTS = NUM_SENSORS + 1; // sensors + speed
export const HIDDEN_SIZE = 16;
export const OUTPUT_SIZE = 2; // steer, gas
const LORA_RANK = 2;

/** 9 forward-hemisphere sensor rays at 22.5° increments. */
export const SENSOR_ANGLES = [
  -Math.PI / 2, (-Math.PI * 3) / 8, -Math.PI / 4, -Math.PI / 8,
  0,
  Math.PI / 8, Math.PI / 4, (Math.PI * 3) / 8, Math.PI / 2,
];
export const SENSOR_LENGTH = 220;
const LAP_COMPLETION_PROGRESS = 0.995;
const STUCK_LIMIT = 120;

type Matrix = number[][];
type Adapter = { A1: Matrix; B1: Matrix; A2: Matrix; B2: Matrix };
export type BrainWeights = {
  version?: number;
  base: { w1: Matrix; b1: number[]; w2: Matrix; b2: number[] };
  adapters?: Record<string, Adapter>;
  currentLevel?: number;
  rank?: number;
};

// ── neural net (inference only) ───────────────────────────────────────────────
/** out = base + A·B (A is rows×r, B is r×cols). */
function matMulAdd(base: Matrix, A: Matrix, B: Matrix): Matrix {
  const rows = base.length;
  const cols = base[0].length;
  const r = A[0].length;
  const out: Matrix = [];
  for (let i = 0; i < rows; i++) {
    const baseRow = base[i];
    const aRow = A[i];
    const outRow = new Array<number>(cols);
    for (let j = 0; j < cols; j++) {
      let delta = 0;
      for (let k = 0; k < r; k++) delta += aRow[k] * B[k][j];
      outRow[j] = baseRow[j] + delta;
    }
    out.push(outRow);
  }
  return out;
}

function detectRank(adapters: Record<string, Adapter>): number | null {
  for (const k of Object.keys(adapters)) {
    const a = adapters[k];
    if (a && Array.isArray(a.A1) && Array.isArray(a.A1[0])) return a.A1[0].length;
  }
  return null;
}

export class Brain {
  private base: BrainWeights["base"];
  private adapters: Record<string, Adapter>;
  readonly rank: number;
  // effective weights for the active level (cached; level is fixed per drive).
  private w1!: Matrix;
  private b1!: number[];
  private w2!: Matrix;
  private b2!: number[];

  constructor(weights: BrainWeights) {
    this.base = weights.base;
    this.adapters = weights.adapters ?? {};
    this.rank = detectRank(this.adapters) ?? weights.rank ?? LORA_RANK;
    this.setLevel(0);
  }

  /** Pick the curriculum level: 0 ⇒ frozen base; ≥1 ⇒ base + that level's adapter. */
  setLevel(level: number): void {
    const adapter = level > 0 ? this.adapters[String(level)] : undefined;
    if (!adapter) {
      this.w1 = this.base.w1;
      this.b1 = this.base.b1;
      this.w2 = this.base.w2;
      this.b2 = this.base.b2;
    } else {
      this.w1 = matMulAdd(this.base.w1, adapter.A1, adapter.B1);
      this.b1 = this.base.b1; // biases shared across levels
      this.w2 = matMulAdd(this.base.w2, adapter.A2, adapter.B2);
      this.b2 = this.base.b2;
    }
  }

  think(inputs: number[]): { steer: number; gas: number } {
    const { w1, b1, w2, b2 } = this;
    const hidden = new Array<number>(HIDDEN_SIZE);
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      let sum = b1[j];
      for (let i = 0; i < inputs.length; i++) sum += inputs[i] * w1[i][j];
      hidden[j] = Math.tanh(sum);
    }
    const output = new Array<number>(OUTPUT_SIZE);
    for (let j = 0; j < OUTPUT_SIZE; j++) {
      let sum = b2[j];
      for (let i = 0; i < HIDDEN_SIZE; i++) sum += hidden[i] * w2[i][j];
      output[j] = Math.tanh(sum);
    }
    return { steer: output[0], gas: output[1] };
  }
}

// ── track geometry ────────────────────────────────────────────────────────────
type Pt = [number, number];
export type TrackDef = { name: string; width: number; points: Pt[] };

const MIN_STEPS = 20;
const MAX_STEPS = 64;
function computeInterpolationSteps(points: Pt[], targetSpacing = 4): number {
  if (points.length < 2) return MIN_STEPS;
  let maxSeg = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > maxSeg) maxSeg = len;
  }
  const raw = Math.ceil(maxSeg / Math.max(1, targetSpacing));
  return Math.max(MIN_STEPS, Math.min(MAX_STEPS, raw));
}

export class Track {
  readonly name: string;
  readonly trackWidth: number;
  readonly points: Pt[];
  readonly tangents: Pt[];
  readonly startX: number;
  readonly startZ: number;
  readonly startAngle: number;
  private gridSize = 5;
  private grid: Record<string, true> = {};

  constructor(def: TrackDef, widthOverride: number | null = null) {
    this.name = def.name;
    this.trackWidth = widthOverride !== null ? widthOverride : def.width;
    const steps = computeInterpolationSteps(def.points, this.gridSize * 0.8);
    this.points = this.interpolate(def.points, steps);
    this.tangents = this.computeTangents();
    const sp = this.points[0];
    const st = this.tangents[0];
    this.startX = sp[0];
    this.startZ = sp[1];
    this.startAngle = Math.atan2(st[1], st[0]);
    this.buildGrid();
  }

  private interpolate(pts: Pt[], steps: number): Pt[] {
    const result: Pt[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        const c0 = -0.5 * t3 + t2 - 0.5 * t;
        const c1 = 1.5 * t3 - 2.5 * t2 + 1;
        const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
        const c3 = 0.5 * t3 - 0.5 * t2;
        result.push([
          c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0],
          c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1],
        ]);
      }
    }
    return result;
  }

  private computeTangents(): Pt[] {
    const n = this.points.length;
    const tangents: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const next = this.points[(i + 1) % n];
      const curr = this.points[i];
      const dx = next[0] - curr[0];
      const dz = next[1] - curr[1];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      tangents.push([dx / len, dz / len]);
    }
    return tangents;
  }

  private buildGrid(): void {
    const n = this.points.length;
    const gs = this.gridSize;
    const hw = this.trackWidth;
    for (let i = 0; i < n; i++) {
      const px = this.points[i][0];
      const pz = this.points[i][1];
      const t = this.tangents[i];
      const nx = -t[1];
      const nz = t[0];
      for (let w = -hw; w <= hw; w += 1) {
        const gx = Math.floor((px + nx * w) / gs);
        const gz = Math.floor((pz + nz * w) / gs);
        this.grid[`${gx},${gz}`] = true;
      }
    }
  }

  isOnTrack(x: number, z: number): boolean {
    return (
      this.grid[`${Math.floor(x / this.gridSize)},${Math.floor(z / this.gridSize)}`] === true
    );
  }

  castRay(x: number, z: number, angle: number): number {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let d = 2; d < SENSOR_LENGTH; d += 2) {
      if (!this.isOnTrack(x + cosA * d, z + sinA * d)) return d;
    }
    return SENSOR_LENGTH;
  }

  getProgress(x: number, z: number): number {
    let minDist = Infinity;
    let bestIdx = 0;
    const n = this.points.length;
    for (let i = 0; i < n; i += 4) {
      const dx = x - this.points[i][0];
      const dz = z - this.points[i][1];
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    for (let offset = -6; offset <= 6; offset++) {
      const i = (((bestIdx + offset) % n) + n) % n;
      const dx = x - this.points[i][0];
      const dz = z - this.points[i][1];
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx / n;
  }

  getProgressLocal(
    x: number,
    z: number,
    hintIdx: number,
    searchRadius = 20,
  ): { progress: number; idx: number } {
    let minDist = Infinity;
    let bestIdx = hintIdx;
    const n = this.points.length;
    for (let offset = -searchRadius; offset <= searchRadius; offset++) {
      const i = (((hintIdx + offset) % n) + n) % n;
      const dx = x - this.points[i][0];
      const dz = z - this.points[i][1];
      const dist = dx * dx + dz * dz;
      if (dist < minDist) {
        minDist = dist;
        bestIdx = i;
      }
    }
    return { progress: bestIdx / n, idx: bestIdx };
  }
}

// ── car (headless physics, faithful to sim games) ─────────────────────────────
export class Car {
  x = 0;
  z = 0;
  angle = 0;
  speed = 0;
  sensors: number[] = new Array(NUM_SENSORS).fill(0);
  alive = true;
  finished = false;
  killReason = "active";
  frameCounter = 0;
  totalProgress = 0;
  lapTime = 0;
  private track: Track;
  private brain: Brain;
  private speedMult: number;
  private lastProgress: number;
  private lastProgressIdx: number;
  private progressAccum = 0;
  private stuckFrames = 0;
  private reverseAccum = 0;
  private wrongWayFrames = 0;
  private passedQuarter = false;
  private passedHalf = false;
  private passedThreeQuarter = false;

  constructor(track: Track, brain: Brain, speedMult = 1.0) {
    this.track = track;
    this.brain = brain;
    this.speedMult = speedMult;
    const t = track.tangents[0];
    const nx = -t[1];
    const nz = t[0];
    // single car: teamIdx 0 → row 0, col -0.5 (faithful to HeadlessCar)
    this.x = track.startX + nx * -0.5 * 8;
    this.z = track.startZ + nz * -0.5 * 8;
    this.angle = track.startAngle;
    const initProg = track.getProgress(this.x, this.z);
    this.lastProgress = initProg;
    this.lastProgressIdx = Math.round(initProg * track.points.length);
  }

  update(): void {
    if (!this.alive || this.finished) return;
    const track = this.track;

    for (let i = 0; i < SENSOR_ANGLES.length; i++) {
      this.sensors[i] = track.castRay(this.x, this.z, this.angle + SENSOR_ANGLES[i]) / SENSOR_LENGTH;
    }

    const inputs = [...this.sensors, this.speed / 8.1];
    const decision = this.brain.think(inputs);
    this.angle += decision.steer * 0.08;
    this.speed = (2.5 + (decision.gas + 1) * 2.8) * this.speedMult;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const newX = this.x + cosA * this.speed;
    const newZ = this.z + sinA * this.speed;

    const midX = (this.x + newX) * 0.5;
    const midZ = (this.z + newZ) * 0.5;
    if (!track.isOnTrack(midX, midZ) || !track.isOnTrack(newX, newZ)) {
      this.alive = false;
      this.killReason = "offtrack";
      return;
    }
    this.x = newX;
    this.z = newZ;

    const { progress, idx } = track.getProgressLocal(this.x, this.z, this.lastProgressIdx);
    this.lastProgressIdx = idx;
    const rawDelta = progress - this.lastProgress;
    let delta = rawDelta;
    const crossedFinish = rawDelta < -0.5;
    if (crossedFinish) delta += 1.0;
    if (delta > 0.5) delta -= 1.0;
    if (delta > 0.05) delta = 0.05;
    if (delta < -0.05) delta = -0.05;
    if (delta > 0) {
      this.progressAccum += delta;
      this.stuckFrames = 0;
      this.reverseAccum = 0;
    } else {
      this.stuckFrames++;
      this.reverseAccum += delta;
    }
    this.lastProgress = progress;
    this.totalProgress = this.progressAccum;

    if (this.stuckFrames > STUCK_LIMIT) {
      this.alive = false;
      this.killReason = "stuck";
      return;
    }
    if (this.reverseAccum < -0.05) {
      this.alive = false;
      this.killReason = "reverse";
      return;
    }
    if (this.speed > 0.5) {
      const tg = track.tangents[idx];
      const dot = cosA * tg[0] + sinA * tg[1];
      if (dot < -0.3) {
        this.wrongWayFrames++;
        if (this.wrongWayFrames > 5) {
          this.alive = false;
          this.killReason = "wrong_way";
          return;
        }
      } else {
        this.wrongWayFrames = 0;
      }
    }
    if (this.frameCounter > 200 && this.progressAccum < this.frameCounter * 0.00015) {
      this.alive = false;
      this.killReason = "loitering";
      return;
    }
    this.frameCounter++;

    if (!this.passedQuarter && progress >= 0.2 && progress <= 0.35) this.passedQuarter = true;
    if (this.passedQuarter && !this.passedHalf && progress >= 0.45 && progress <= 0.6)
      this.passedHalf = true;
    if (this.passedHalf && !this.passedThreeQuarter && progress >= 0.7 && progress <= 0.85)
      this.passedThreeQuarter = true;
    const allCheckpoints = this.passedQuarter && this.passedHalf && this.passedThreeQuarter;
    const reachedTarget = allCheckpoints && this.progressAccum >= LAP_COMPLETION_PROGRESS;
    const crossedFinishLine = allCheckpoints && crossedFinish;
    if (reachedTarget || crossedFinishLine) {
      this.finished = true;
      this.killReason = "finished";
      this.lapTime = this.frameCounter;
    }
  }
}

// ── curriculum demos (validated: this brain laps these tracks at these levels) ─
export type DemoConfig = { id: string; name: string; level: number; width: number };
export const DEMOS: DemoConfig[] = [
  { id: "monaco", name: "Monaco", level: 0, width: 28 },
  { id: "suzuka", name: "Suzuka", level: 1, width: 30 },
  { id: "silverstone", name: "Silverstone", level: 2, width: 32 },
  { id: "spaghetti", name: "Spaghetti", level: 3, width: 26 },
  { id: "inferno", name: "Inferno", level: 5, width: 22 },
  { id: "serpentine_bay", name: "Serpentine Bay", level: 6, width: 20 },
  { id: "ironcliff", name: "Ironcliff", level: 8, width: 18 },
];

/** Catmull-Rom control points (single source of truth, from sim games). */
export const TRACKS: Record<string, TrackDef> = {
  monaco: {
    name: "Monaco",
    width: 28,
    points: [
      [0, 0], [100, 5], [160, 35], [180, 85], [170, 145], [130, 180],
      [80, 185], [50, 160], [35, 120], [55, 85], [40, 45], [10, 15],
    ],
  },
  suzuka: {
    name: "Suzuka",
    width: 30,
    points: [
      [-200, 200], [-100, 205], [0, 205], [100, 205], [180, 200],
      [215, 188], [240, 162], [253, 130], [250, 95],
      [195, 60], [120, 10], [40, -50], [-30, -110], [-100, -150], [-150, -170],
      [-185, -185], [-210, -202], [-215, -222], [-200, -232],
      [-130, -218], [-50, -218], [50, -218], [150, -215], [200, -210],
      [260, -195], [295, -165], [315, -125], [325, -75],
      [335, 0], [342, 90], [335, 175], [320, 230],
      [285, 275], [225, 305], [130, 325], [0, 330], [-130, 325], [-225, 305],
      [-265, 268], [-265, 225],
    ],
  },
  silverstone: {
    name: "Silverstone",
    width: 32,
    points: [
      [-180, 200], [-90, 205], [0, 205], [90, 205], [180, 200],
      [240, 170], [255, 110], [240, 60],
      [180, 30], [90, 25], [0, 25], [-90, 25], [-180, 30],
      [-240, 0], [-255, -60], [-240, -110],
      [-180, -200], [-90, -205], [0, -205], [90, -205], [180, -200],
      [290, -180], [340, -100], [350, 0], [350, 110], [330, 220],
      [240, 300], [120, 320], [0, 325], [-120, 320], [-240, 300],
      [-290, 250],
    ],
  },
  spaghetti: {
    name: "Spaghetti",
    width: 26,
    points: [
      [-100, 300], [-30, 300],
      [-30, 230], [-30, 160], [-30, 90], [-30, 20], [-30, -50],
      [-15, -100], [40, -110],
      [110, -110], [180, -110], [240, -110],
      [270, -140], [270, -180],
      [200, -200], [120, -200], [40, -200], [-40, -200], [-100, -200],
      [-130, -170], [-130, -100], [-130, -30],
      [-130, 50], [-130, 130], [-130, 210], [-130, 280],
    ],
  },
  serpentine: {
    name: "Serpentine",
    width: 24,
    points: [
      [0, 0], [55, -20], [85, 15], [140, -10], [160, 25],
      [200, 55], [170, 100], [215, 135], [185, 180], [225, 215],
      [195, 265], [155, 285], [180, 325],
      [135, 345], [100, 315], [65, 350],
      [25, 320], [50, 280], [-10, 240],
      [30, 200], [-20, 155], [20, 110],
      [-30, 70], [10, 35], [-10, 10],
    ],
  },
  inferno: {
    name: "Inferno",
    width: 22,
    points: [
      [10, 270], [70, 275], [130, 273], [180, 263],
      [225, 240], [240, 210], [240, 175],
      [220, 140], [228, 95], [240, 50], [248, 0],
      [248, -45], [240, -85], [222, -120], [195, -145],
      [150, -180], [90, -200], [25, -210],
      [-40, -205], [-100, -190], [-150, -160], [-190, -120],
      [-215, -75], [-225, -30], [-215, 5], [-195, 15], [-175, 45],
      [-200, 90], [-235, 115], [-265, 130],
      [-280, 165], [-275, 200], [-250, 230],
      [-210, 248], [-170, 235], [-135, 220],
      [-100, 232], [-75, 218], [-50, 230], [-30, 268],
    ],
  },
  serpentine_bay: {
    name: "Serpentine Bay",
    width: 20,
    points: [
      [-200, 200],
      [-245, 205], [-275, 170], [-290, 110], [-285, 40], [-270, -30], [-240, -100],
      [-200, -155], [-140, -195], [-70, -215], [10, -220], [85, -215],
      [160, -200], [225, -170], [265, -120], [285, -55],
      [285, 15], [275, 85], [255, 140],
      [220, 180], [165, 205], [95, 215], [15, 218], [-65, 215], [-135, 210],
    ],
  },
  ironcliff: {
    name: "Ironcliff",
    width: 18,
    points: [
      [-140, -215], [-220, -220], [-275, -180], [-295, -120],
      [-292, -55], [-275, 5], [-245, 60], [-205, 105],
      [-165, 145], [-130, 185], [-85, 215], [-30, 228],
      [30, 225], [90, 210], [140, 185], [180, 150],
      [210, 105], [230, 50], [235, -10], [220, -65],
      [190, -110], [150, -145], [105, -170], [70, -205],
      [20, -225], [-40, -228], [-95, -223],
    ],
  },
  stormfront_gp: {
    name: "Stormfront GP",
    width: 20,
    points: [
      [-10, 216], [90, 220], [180, 218], [250, 200],
      [295, 160], [315, 100], [320, 30], [305, -35],
      [275, -95], [230, -145], [170, -185], [100, -210],
      [20, -220], [-70, -220], [-150, -205], [-215, -175],
      [-265, -130], [-300, -70], [-315, -5], [-310, 60],
      [-285, 125], [-240, 180], [-175, 220], [-95, 240], [-30, 235],
    ],
  },
};
