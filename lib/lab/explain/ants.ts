import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Hundreds of near-mindless ants forage from a central nest, yet a clean shortest path to food crystallizes on its own. Ants carrying food head home and drip orange pheromone; ants searching steer toward the strongest scent ahead, so good routes reinforce themselves while unused trails evaporate. The intelligence lives in the shared scent map (stigmergy), never in any single ant — this is Dorigo's Ant Colony Optimization made visible.",
  controls: [
    {
      label: "Ants",
      tip: "Size of the colony (30–400). More ants average out faster and find food sooner; drop it to ~40 to watch a single trail form slowly, one explorer at a time.",
    },
    {
      label: "Sensor reach",
      tip: "How far ahead (in px) each ant samples pheromone before deciding to turn. Short reach (4) makes ants follow trails tightly but wander into them late; crank to 20 and ants lock onto distant trails, producing straighter, stiffer highways.",
    },
    {
      label: "Wander",
      tip: "Random jitter added to each ant's heading. At 0 ants follow scent almost deterministically and can get stuck on one route; push toward 1.2 to inject exploration that discovers food in fresh directions but smears the trails.",
    },
    {
      label: "Deposit strength",
      tip: "Pheromone laid per step by a homebound ant (10–120). High deposit makes the first lucky route blaze bright and dominate fast (premature lock-in); low deposit keeps trails faint, so the colony stays exploratory and balances multiple food sources.",
    },
    {
      label: "Evaporation",
      tip: "The per-frame scent retention factor (0.95–0.998); higher = slower forgetting. Set it near 0.998 and stale trails to depleted food linger and mislead ants; drop toward 0.95 and trails fade fast, letting the colony re-route quickly as food runs out — the classic forgetting-rate trade-off.",
    },
    {
      label: "Click stage to drop food",
      tip: "Click anywhere on the canvas to deposit a fresh green food cluster. Drop one far from the existing trails and watch a brand-new pheromone road grow toward it from the nest.",
    },
  ],
  watch:
    "Watch faint scattered trails thicken into one bright orange road between nest and food. 'Food home' counts deliveries (rising = the colony is exploiting a good route); 'Food left' is the green reserve shrinking as clusters are mined out, after which the trail to that spot dims and ants redistribute.",
};

export default explain;
