import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Echo chambers from bounded-confidence opinion dynamics. Every agent holds a continuous opinion on [0,1] and is moved only by others already within a tolerance ε of itself — people too far apart simply don't hear each other. The braided timeline shows opinions merging into a few converging bundles while the side histogram collapses from a uniform smear into sharp spikes. One dial, ε, decides whether the crowd reaches a single consensus, hardens into two polarized camps, or shatters into many isolated fragments.",
  controls: [
    {
      label: "Deffuant",
      tip: "Selects the pairwise, gradual mechanism (Deffuant–Weisbuch): each step picks one random pair and, if they're within ε, both nudge a fraction μ toward each other — slow, gossip-like, one conversation at a time. Toggle to Hegselmann–Krause for the contrasting town-hall rule, then watch the same ε reach a similar end-state by a very different path.",
    },
    {
      label: "Hegselmann–Krause",
      tip: "Selects the simultaneous, decisive mechanism: every agent jumps at once to the mean of all opinions within ε of itself. It settles in far fewer rounds than Deffuant and self-halts ('Settled ✓') once no one moves. Note the μ slider disappears here — HK has no step-size, agents go straight to the local average.",
    },
    {
      label: "Confidence ε",
      tip: "Each agent's open-mindedness — the star control. The rough rule is final clusters ≈ 1/(2ε). Try this: start at ε ≈ 0.4 (everyone fuses into one consensus blob), then drag down through ~0.22 to watch two polarized strands split, and down to ~0.08 to shatter the crowd into many frozen fragments that never merge.",
    },
    {
      label: "Convergence μ",
      tip: "Deffuant only: how big a step a pair takes toward each other (μ = 0.5 jumps straight to the midpoint). This changes only the speed of convergence, not the number of clusters — set ε fixed and compare μ = 0.1 vs 0.5 to see the same final camps form much faster without changing how many there are.",
    },
    {
      label: "Agents N",
      tip: "Population size. Larger N gives smoother bundles and a cleaner histogram but the same cluster structure. Bump from 100 to 600 (then hit Reseed) to see the river-delta braid fill in and the surviving spikes sharpen.",
    },
    {
      label: "Reseed",
      tip: "Draws a fresh uniform-random set of opinions and restarts the run. Use it to test robustness: keep ε fixed in the polarization window and reseed a few times — you should keep landing on two camps even though the exact trajectory differs each time.",
    },
  ],
  watch:
    "Left panel (OPINION vs TIME) is the hero: faint per-agent lines braid into a few thick strands. Right panel (DISTRIBUTION) is a live histogram of opinions collapsing into spikes, with dashed guide-lines marking each cluster's center across both panels. The 'Clusters' readout and its plot, plus the status (Consensus / Polarized / N fragments), quantify the outcome; 'Largest' is the biggest camp's share.",
};

export default explain;
