import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Causal entropic forcing (Wissner-Gross & Freer, 2013): a particle with no goal that still acts purposefully. Each step it samples many random futures down 12 candidate directions and moves toward the one whose reachable endpoints are most spread out — it maximizes the entropy of its accessible futures. From a corner of an open box it drifts to the open centre; with walls it routes around traps. Goal-like behaviour — seek openness, avoid dead ends — emerges from one principle: keep your options open. The faint dots are the 'imagined' future endpoints; this is a coarse Monte-Carlo approximation of the idea, which is itself debated as a model of intelligence.",
  controls: [
    {
      label: "Horizon τ",
      tip: "How many steps into the future each imagined rollout looks ahead. Short horizons make the particle near-sighted and jittery; stretch it toward 40 and it commits earlier to the genuinely open regions, because it can 'see' that distant freedom. Try low vs high horizon from the same corner and compare how directly it reaches the centre.",
    },
    {
      label: "Rollouts K",
      tip: "Number of random futures sampled per candidate direction — the Monte-Carlo sample size. Few rollouts make the future-entropy estimate noisy, so the path wanders; raise it toward 80 for a smoother, more decisive drift toward open space (at more compute per step).",
    },
    {
      label: "Open box",
      tip: "Empty arena: the cleanest demo. From any corner the particle climbs the future-entropy gradient straight to the centre, where the spread of reachable endpoints is largest. Pair with 'Drop in corner' to confirm it heads to the middle every time, regardless of where it starts.",
    },
    {
      label: "Obstacles",
      tip: "Adds wall rectangles forming a pocket/trap near the centre. Now maximizing future spread means avoiding dead ends — watch the particle hug the open side and route around the trap rather than wedging into it, since a corner of walls collapses its reachable futures.",
    },
    {
      label: "Drop in corner",
      tip: "Teleports the particle to a random corner and clears the trail. Hit it repeatedly to see the same emergent pull toward openness from every starting corner — the behaviour is a property of the entropy principle, not of where it began.",
    },
  ],
  watch:
    "The faint dot cloud is the particle's imagined futures — the chosen direction's reachable endpoints (brighter) over a thinned all-direction sample (fainter); it stretches toward open space and bunches up against walls. The Future entropy readout and plot measure the spread of those endpoints (Max = ln(64)≈4.16 for a perfectly uniform spread); it climbs as the particle reaches roomier positions and dips when boxed in.",
};

export default explain;
