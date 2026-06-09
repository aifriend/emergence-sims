import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "An econophysics kinetic-exchange model: 400 agents start with identical wealth, then repeatedly pick a random pair to trade under a scrupulously fair, money-conserving rule. Inequality emerges anyway. Random-split (Dragulescu–Yakovenko 2000) relaxes to a Boltzmann–Gibbs exponential with Gini ≈ 0.5; the yard-sale wager condenses nearly all wealth onto a single agent (Gini → 1) unless redistribution skims it back. The bars are agents sorted poorest→richest; the dashed line is the conserved per-capita mean. The takeaway: extreme inequality is the generic outcome of fair random exchange, not evidence of cheating.",
  controls: [
    {
      label: "Random split / Yard-sale",
      tip: "The star control, choosing the trade rule. \"Random split\" pools two agents' money and reshuffles it at a uniform random ratio — settles to a gentle exponential, Gini parking near 0.5. \"Yard-sale\" wagers a fraction of the poorer agent's wealth on a coin flip — equally fair per trade, yet wealth inexorably condenses onto one agent, Gini → 1. Run each from reset and contrast the final bar shape.",
    },
    {
      label: "Savings λ",
      tip: "Fraction of wealth each agent shields from a trade (Random-split mode only — it has no effect under Yard-sale). At λ = 0 you get the pure exponential; raise it toward 0.9 and the distribution's peak lifts off zero into a Gamma-like \"middle class,\" visibly lowering the Gini. Sweep it up and watch the poorest bars rise off the floor.",
    },
    {
      label: "Redistribution τ",
      tip: "The policy lever: each step nudges every agent's wealth a fraction τ toward the mean. Switch to Yard-sale, let Gini climb toward 1, then dial τ up to even 0.5%/step and watch condensation arrest — the Gini snaps down to a stable finite value. Higher τ pins a flatter steady state. Set τ = 0 to let oligarchy run unchecked.",
    },
    {
      label: "Speed",
      tip: "Transactions simulated per second (200–20,000 tx/s). Keep it low (~1,000) to watch the bars rearrange trade by trade; max it to blast through millions of deals and reach the stationary distribution in seconds. Yard-sale condensation is dramatic at high speed.",
    },
  ],
  watch:
    "Total money is conserved every frame — the bars redistribute, never grow in sum, and the dashed mean line stays fixed. The Gini readout (and its scrolling trace) is the headline: it starts at 0 (everyone equal) and climbs toward 0.5 under Random split or toward 1 under Yard-sale, then drops the instant you engage Redistribution τ. \"Top 10%\" shows the richest decile's share heading toward 100% as one agent's bar towers over a flat, near-zero crowd.",
};

export default explain;
