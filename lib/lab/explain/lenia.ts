import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Lenia is Conway's Life made fully continuous — continuous states, space and time. Each cell holds a real value in [0,1]; a smooth ring-shaped kernel sums a weighted neighbourhood, and a bell-shaped 'growth' function nudges every cell up or down by a tiny step. From this come the most lifelike patterns of any cellular automaton: smooth, motile 'creatures' that swim, rotate and recover from damage. The Orbium — a stable glider discovered by Bert Chan in 2018 — is the simplest.",
  controls: [
    {
      label: "Seed",
      tip: "Orbium drops in the famous swimming creature; Soup fills the centre with random values. The Orbium is finely tuned — it glides and holds its shape — whereas a random soup almost always collapses or congeals into static blobs, which is exactly how rare a stable creature is in the space of starting states.",
    },
    {
      label: "Speed",
      tip: "Lenia steps computed per animation frame (1–3). Each step advances time by only 1/T = 0.1, so a single step is a tiny continuous nudge rather than a discrete generation; raise it to fast-forward the Orbium's swim.",
    },
    {
      label: "Growth μ",
      tip: "The centre of the growth bell — the neighbourhood density a cell 'wants' around it. The Orbium only survives near μ = 0.15; nudge it a few thousandths away and the creature bloats, shrinks or dissolves. That razor-thin viability window is the whole point: lifelike order lives in a narrow band of the rule space.",
    },
  ],
  watch:
    "Watch the Orbium glide as a coherent, deformable blob — not the rigid cell-by-cell hops of discrete Life. Drag on the field to smear extra mass into it and see it either absorb the perturbation or break apart. The Mass readout is the total field value: roughly steady for the Orbium, spiking then crashing when a soup self-destructs.",
};

export default explain;
