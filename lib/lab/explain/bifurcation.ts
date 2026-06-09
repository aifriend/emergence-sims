import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "The logistic map x → r·x·(1−x), the simplest equation that produces chaos (May, 1976). Read it as a toy population: r·x is growth, (1−x) is crowding. The bifurcation fan plots the long-run attractor for every growth rate r from 2.5 to 4.0 — one steady value splits into a 2-cycle, then 4, then 8, the doublings accelerating into chaos at the universal Feigenbaum rate δ≈4.669. A linked cobweb staircase at the cursor's r shows why: vertical to the parabola, horizontal to the diagonal y=x, repeat. The fan is the WHAT; the cobweb is the WHY.",
  controls: [
    {
      label: "r",
      tip: "The growth rate — the single knob, marked as a bright vertical line on the fan and re-running the cobweb. Try r=2.8: one stable value (1−1/r≈0.643), cobweb spirals to a point. Step to 3.2 for a clean 2-cycle (the staircase boxes), then 3.5 (4-cycle), then 3.9 — the cobweb fills the square chaotically. The Period readout names the cycle (1/2/4/8) or reads 'chaos'.",
    },
    {
      label: "Warm-up",
      tip: "Iterations discarded per column before plotting, to let transients decay. Drop it toward 100 and faint false branches ghost in above the true attractor; raise it near 1000 to clean them up — essential when looking close to the chaos onset at r∞≈3.570, where convergence is slowest.",
    },
    {
      label: "Samples",
      tip: "Points plotted per r-column after warm-up. Low values leave the chaotic band sparse; raise it toward 400 to fill in the density (darker = the orbit visits that x more often), making the period-3 window and the band structure inside chaos far clearer.",
    },
    {
      label: "r → 3.2",
      tip: "Jumps r to 3.2, the textbook period-2 case. Watch the cobweb settle into a clean rectangle bouncing between two values (≈0.799 and ≈0.513) — the simplest non-trivial attractor, a good anchor before exploring deeper doublings.",
    },
    {
      label: "P-3 window",
      tip: "Jumps r to 3.828 (=1+√8), the period-3 window carved out of the chaotic region. The smear suddenly collapses to a crisp three-point cycle — the most striking demonstration that order re-emerges inside chaos, and the clearest check that the r-axis is calibrated.",
    },
    {
      label: "drag the diagram to scrub r",
      tip: "Click and drag left–right across the fan to scrub r continuously and watch the cobweb redraw live. Drag slowly through r≈3.0 → 3.45 → 3.54 → 3.57 to feel the doublings arrive faster and faster before dissolving — the cascade that defines the Feigenbaum constant.",
    },
  ],
  watch:
    "The fan's landmarks (P2 at r=3, P4≈3.449, P8≈3.544, r∞≈3.570, P3≈3.828) mark the route to chaos; the doubling intervals shrink by the universal ratio shown as Feigenbaum δ≈4.66920. The cobweb inset is the live mechanism — spiral into a point below r=3, a box around a cycle in the periodic windows, a square-filling tangle in chaos.",
};

export default explain;
