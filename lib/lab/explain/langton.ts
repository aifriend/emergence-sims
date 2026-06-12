import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Langton's Ant (1986) is a turmite — a tiny automaton — that walks a grid of black and white cells under just two rules: on a white cell it turns right, on a black cell it turns left, and either way it flips the colour of the cell it leaves. For roughly the first 10,000 steps its trail looks like featureless chaos, then it spontaneously locks into a periodic 104-step cycle that builds a straight diagonal 'highway' and marches off forever. That order is emergent — nothing in the two rules mentions highways — and the generalised turmite family is Turing-complete, so this trivial recipe can in principle compute anything.",
  controls: [
    {
      label: "Speed",
      tip: "How many ant steps are simulated per animation frame (1–2000). At 1 you can watch the rule fire cell by cell; the chaotic phase is ~10,000 steps long, so crank it toward 2000 to fast-forward through the mess and reach the moment the highway emerges within a second or two.",
    },
    {
      label: "Ants",
      tip: "How many ants share the board (1–6). One ant is the classic experiment with its clean transient-then-highway story. Add more — each starts at a random cell and heading — and their trails collide and overwrite each other, so the tidy highway rarely survives; it shows how fragile the emergent order is to interference. Changing this re-seeds the grid.",
    },
  ],
  watch:
    "Watch order condense out of noise. Hold Speed low at first to see the rule is genuinely trivial, then crank it: the black-cell smear churns chaotically (the Steps counter climbing into the thousands) until, with no warning and no change to the rules, the ant snaps into a repeating diagonal highway and leaves the chaos behind. The Black cells readout, which wandered erratically during the transient, then climbs in a steady periodic ramp — the signature of the highway.",
};

export default explain;
