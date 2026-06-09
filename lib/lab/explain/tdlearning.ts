import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "An agent runs the same conditioning trial over and over: a CUE appears, then a REWARD lands a fixed delay later. It keeps a value estimate V for each moment of the trial and computes the temporal-difference error δ = r + γV(s′) − V(s) — the surprise between what it now expects and what it expected a step ago. This δ behaves exactly like phasic dopamine (Schultz–Dayan–Montague 1997): on screen you watch the error burst migrate backward, trial by trial, from the reward to the cue that predicts it.",
  controls: [
    {
      label: "Trial ›",
      tip: "Run exactly one trial (enabled only when paused). Pause and step trial-by-trial to watch the positive δ peak slide one timestep leftward each trial as value V back-propagates from reward toward cue.",
    },
    {
      label: "Omit reward",
      tip: "Skip the reward on the next trial — the killer demo. After learning (δ at reward ≈ 0), hit this and watch δ plunge below baseline at reward time: the dopamine 'dip' for a predicted-but-absent reward.",
    },
    {
      label: "α rate",
      tip: "Learning rate (0.02–0.6): how hard each trial nudges V toward consistency. Low α learns slowly but smoothly; push past ~0.5 and V overshoots so δ rings and oscillates instead of cleanly settling to zero at reward time.",
    },
    {
      label: "γ discount",
      tip: "Discount factor (0.8–1.0) for how far value propagates back in time. Near 1 the value ramp stays nearly flat across the cue→reward gap and the error transfers crisply to the cue; lower it to ~0.8 and V decays steeply moving back from the reward.",
    },
    {
      label: "Cue time",
      tip: "Timestep where the predictive cue appears (clamped below reward time). Value can't exist before the cue, so this is where the backward march of δ halts — move it earlier to lengthen the cue→reward delay the agent must bridge.",
    },
    {
      label: "Reward time",
      tip: "Timestep where the reward lands (clamped after the cue). The gap between Cue time and Reward time is the conditioning delay; widen it and watch the error need more trials to walk all the way back to the cue.",
    },
    {
      label: "Speed",
      tip: "Auto-run pace in trials per second (1–20). Slow (~1) to study individual trials and the moving step marker; fast (~20) to fast-forward to the trained steady state where δ has fully shifted to the cue.",
    },
  ],
  watch:
    "Blue bars are the value estimate V(t) growing upward from the baseline; the orange/red bars are δ — the dopamine-like prediction error — above (positive surprise) or below (negative) the line. Early on the orange burst sits at REWARD; as learning completes it fades there and rises at CUE. The 'Prediction error' plot tracks δ-at-reward (orange) and δ-at-cue (blue) over trials — watch them cross over as the reward error decays to zero and the cue error climbs.",
};

export default explain;
