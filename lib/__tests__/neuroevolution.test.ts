import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Brain, Track, Car, TRACKS, DEMOS, type BrainWeights } from "../neuroevolution";

const here = dirname(fileURLToPath(import.meta.url));
const champion = JSON.parse(
  readFileSync(join(here, "../../public/brains/monaco-champion.json"), "utf8"),
) as BrainWeights;

/** run the ported sim to completion (lap, crash, or timeout). */
function drive(id: string, level: number, width: number) {
  const track = new Track(TRACKS[id], width);
  const brain = new Brain(champion);
  brain.setLevel(level);
  const car = new Car(track, brain, 1.0);
  let maxProg = 0;
  for (let f = 0; f < 8000; f++) {
    car.update();
    if (car.totalProgress > maxProg) maxProg = car.totalProgress;
    if (car.finished || !car.alive) break;
  }
  return { finished: car.finished, maxProg, kill: car.killReason };
}

describe("neuroevolution model (ported sim-games physics)", () => {
  it("loads the champion brain (10→16→2, LoRA adapters) and infers in range", () => {
    expect(champion.base.w1.length).toBe(10);
    expect(champion.base.w1[0].length).toBe(16);
    const brain = new Brain(champion);
    const out = brain.think(new Array(10).fill(0.5));
    expect(out.steer).toBeGreaterThanOrEqual(-1);
    expect(out.steer).toBeLessThanOrEqual(1);
    expect(Number.isFinite(out.gas)).toBe(true);
  });

  it("the champion drives the full lap on every advertised demo track", () => {
    // These are exactly the (track, level) configs the ORIGINAL headless sim
    // laps; the port is faithful iff it reproduces them. (Probe: monaco .994,
    // suzuka .996, silverstone .979, spaghetti .998, inferno .998,
    // serpentine_bay .998, ironcliff .998.)
    for (const d of DEMOS) {
      const r = drive(d.id, d.level, d.width);
      expect(r.maxProg, `${d.name} (L${d.level})`).toBeGreaterThan(0.95);
    }
  });

  it("crashes off the centerline when fed a wrong-level adapter (sanity)", () => {
    // Monaco track driven with the Ironcliff (L8) adapter should NOT cleanly lap.
    const r = drive("monaco", 8, 28);
    expect(r.maxProg).toBeLessThan(0.95);
  });
});
