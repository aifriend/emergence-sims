import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Nowak & May's (1992) spatial Prisoner's Dilemma. Every cell on the lattice is a pure Cooperator or Defector. Each round it plays the one-shot game against its 8 neighbours and itself (payoffs R=1, T=b, P=S=0), then synchronously copies the strategy of the highest-scoring cell nearby. No memory, no reciprocity — yet cooperators that would be doomed in a well-mixed world huddle into clusters that defend their borders, so cooperation survives. Cells are coloured cooperator-blue and defector-orange, with lighter tints for freshly-switched cells so the invasion fronts read clearly.",
  controls: [
    {
      label: "b",
      tip: "The temptation payoff — the one knob that decides cooperation's fate. Below ~1.8 cooperators flood the grid; push it toward 2.0 and defection takes over. Try parking it at 1.85: the lattice settles into the famous stable coexistence near 32% cooperators with endlessly shimmering fronts. Nudge it to 1.7 vs 1.95 to see the two opposite regimes.",
    },
    {
      label: "Initial C",
      tip: "Starting fraction of cooperators in the random seed (applied when you Randomise). The long-run level is set by b, not by this — try seeding at just 20% with b≈1.85 and watch cooperation actually grow into clusters rather than vanish.",
    },
    {
      label: "Randomise",
      tip: "Reseeds a fresh random grid at the current Initial C fraction. Use it to confirm the steady-state cooperation level is reproducible across seeds at a fixed b, or to escape a frozen end-state after sweeping b.",
    },
    {
      label: "Click to seed a defector",
      tip: "Click anywhere on the lattice to paint a 2×2 block of defectors into the cooperator sea. Drop one into a calm blue region at b just above 1 and watch it probe outward — at low b the cooperators wall it off and heal; at higher b that single seed metastasizes across the grid.",
    },
  ],
  watch:
    "The four-colour scheme makes the fronts pop: persistent cooperators vs cells that just turned cooperator, persistent defectors vs cells that just defected — you literally see defection probing inward and cooperator clusters healing. The Cooperation plot and readout track the global cooperating fraction over time; near b≈1.85 it hovers around 32% while the pattern never stops churning, never disperses into isolated cells.",
};

export default explain;
