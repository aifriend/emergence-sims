import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "The Minority Game / El Farol bar problem — bounded rationality in action. N selfish agents, none communicating, each carry a few fixed lookup tables mapping the shared m-bit history of past winning sides to a choice of 0 or 1; the side in the minority wins. Every round, agents play their current best-scoring table, then virtually re-score all their tables on whether they'd have called the winner. No one aims for it, yet attendance self-organizes around N/2 and stays there forever, never converging — coordination with no coordinator.",
  controls: [
    {
      label: "m  bits",
      tip: "History depth — the star control. Each step changing m rebuilds the society and resets the trace. It sets the control ratio α = 2^m/N: at small m (small α) agents share short memories and herd, so fluctuations run worse than a coin toss; near α ≈ 0.34 the volatility σ²/N bottoms out (efficient phase); large m approaches random. Sweep m = 1 → 6 at fixed N and watch the band around N/2 tighten then loosen.",
    },
    {
      label: "Strategies / agent  S",
      tip: "How many fixed tables each agent can switch between. Adaptation comes only from picking the best of these — set S = 1 and there's no learning at all, just a frozen random split. Raise to 3–4 to make agents more adaptive and watch coordination improve (the fluctuation band narrows).",
    },
    {
      label: "Population  N (odd)",
      tip: "Crowd size, forced odd so the minority is always strictly defined. It's the denominator of α = 2^m/N, so growing N at fixed m pushes you toward the herding (worse-than-random) regime. Try N = 31 vs 301 at m = 3 and compare how wide attendance swings relative to its own N/2 line.",
    },
    {
      label: "Speed",
      tip: "Rounds simulated per frame (1–20) — a clock only. Crank to ~20 to fast-forward past the transient and let the σ²/N volatility readout settle to its stationary value; drop to 1 to watch the minority flip round by round.",
    },
  ],
  watch:
    "The hero plot is ATTENDANCE A(t) vs ROUND: the trace endlessly fluctuates around the dashed orange N/2 capacity line — never locking on, never running away. The shaded orange band is ±σ from the stationary tail; its width IS the coordination efficiency. The α = 2ᵐ/N badge tells you where you sit on the phase curve; the 'Volatility σ²/N' readout is the number to minimize (best near α ≈ 0.34).",
};

export default explain;
