import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "A reinforcement-learning agent (orange dot) is dropped into a maze with no map. It must find the +1 goal and avoid the −1 pit purely by trial and error, backing up Q(s,a) ← Q + α[r + γ·max Q(s′,a′) − Q] after every step it takes. Watch \"value\" flood outward from the goal as a warm heatmap, and the greedy-policy arrows snap from chaos into a coherent flow that points home — the most iconic picture in RL (Watkins 1989).",
  controls: [
    {
      label: "α learning rate",
      tip: "How big a bite each step takes out of the TD error. Crank it to 0.8 and the heatmap fills in fast but flickers and overshoots; drop it to 0.05 and value seeps in smoothly but slowly. Try pushing it high mid-run and watch the arrows get jittery.",
    },
    {
      label: "γ discount",
      tip: "The far-sightedness knob — how much a distant reward is worth now. Set it to 0.80 and value decays steeply, barely reaching the far corners (myopic); set it to 0.99 and the warm glow floods the entire grid. Sweep it and watch how far from the goal the agent will still bother to head.",
    },
    {
      label: "ε exploration",
      tip: "Probability the agent ignores its best guess and moves at random. Drop it to 0% once arrows form and the agent locks onto its current route — but start from reset at 0% and it can get stuck behind a wall and never find the goal. Keep ~20% so it keeps probing.",
    },
    {
      label: "Speed",
      tip: "Learning steps simulated per second (5–400). Set it low (~10) to watch a single episode pick its way to the goal step by step; max it to 400 to blast through hundreds of episodes and see the Success readout climb toward 100% in seconds.",
    },
    {
      label: "Policy arrows",
      tip: "Show/Hide the greedy ▲▼◀▶ glyph in each learned cell. Set to Show to watch arrows reorganize into a single flow toward +1 as values settle; Hide to read the bare value heatmap and see the flood front by itself.",
    },
  ],
  watch:
    "The heatmap floods outward from the orange +1 goal; arrows should never point into the −1 pit from a safe neighbour once learning settles. The Success readout is the rolling win rate over the last 50 episodes, and the \"Return / episode\" plot rises bottom-to-top as the agent stops wandering and starts beelining — the \"it's learning\" line. A small living cost (−0.02/step) quietly favours shorter routes.",
};

export default explain;
