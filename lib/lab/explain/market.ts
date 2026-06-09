import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "An agent-based financial market in the Brock–Hommes / Lux–Marchesi tradition. The price is a tug-of-war between fundamentalists, who buy when price is below fair value and pull it back, and chartists, who chase the recent trend and amplify it. A market-maker moves the log price by net excess demand, and agents continuously defect toward whichever strategy lately paid more. Bubbles, crashes, fat-tailed returns and clustered volatility all emerge endogenously — the fundamental value never moves, yet the price still booms and busts.",
  controls: [
    {
      label: "Chartist fraction",
      tip: "Baseline tilt of the crowd toward trend-following (the steady-state chartist share the adaptive switching gravitates to). Below ~50% the price hugs the dashed fundamental quietly; push it to 70–80% and self-reinforcing trends take over — watch bubbles inflate and snap into crashes with no change in fair value.",
    },
    {
      label: "Chartist aggressiveness  g_c",
      tip: "How hard trend-followers extrapolate the last move — the trend amplifier. With a chartist-heavy mix, raise g_c from ~0.3 toward 1.5 and the price destabilizes: larger overshoots, sharper reversals, more frequent ⚠ crash flashes. Drop it low and even a chartist majority can't sustain a bubble.",
    },
    {
      label: "Noise  σ_ε",
      tip: "Amplitude of the liquidity/news noise added each step — the random floor under returns. Set it to 0 to see the pure deterministic dynamics (clean trends and reversals), then raise toward 0.05 to roughen the series; large σ_ε can itself seed the trend that chartists then run with.",
    },
    {
      label: "Speed",
      tip: "Market steps simulated per second (0.2×–3×) — a clock, not a physics knob. Crank to 3× to fast-forward through many bubble–crash cycles and let the volatility and max-drawdown statistics build; drop to 0.2× to watch a single crash unfold step by step.",
    },
  ],
  watch:
    "Top panel (LOG PRICE vs TIME) is the hero: the white line inflates and snaps around the dashed fundamental p_f, and the whole panel flashes orange on a crash. Bottom panel (RETURNS r_t) shows volatility clustering — long calm stretches broken by bursts of big bars (orange = flagged crashes). The |r_t| rail plot makes the same clustering pop. Readouts: Price level, rolling Volatility, and worst Max drawdown.",
};

export default explain;
