import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Schelling's 1971 segregation model — the founding parable of agent-based social science. Two colours of agents share a grid with some empty cells. Each agent is content as long as at least a fraction τ of its occupied neighbours match its colour; an unhappy agent relocates to a random empty cell. The shock is the magnitude: even when every agent happily accepts a 70% mixed neighbourhood (τ ≈ 30%), the salt-and-pepper grid still curdles into stark, hard-edged same-colour enclaves nobody intended.",
  controls: [
    {
      label: "Tolerance τ",
      tip: "The star control: the minimum share of like-coloured neighbours an agent needs to stay put. Set it to 0% and nothing ever moves — the grid stays randomly mixed (the control case). Nudge it to ~30% and watch dramatic clustering switch on despite agents tolerating 70% unlike. Push past ~60% and the system can never settle — gridlock, with the \"% unhappy\" badge never reaching Settled.",
    },
    {
      label: "Empty",
      tip: "Fraction of cells left vacant — the \"room to move.\" These empties are excluded from each agent's neighbour count. Drop it to 5% and relaxation stalls (few open spots, Happy plateaus below 100%); raise it to 40% and unhappy agents resettle quickly into clean blocks.",
    },
    {
      label: "Mix A:B",
      tip: "Population split between the white (A) and orange (B) agents, from 30:70 to 50:50. Set it to 30:70 to study minority dynamics — the scarce colour clumps into a few isolated islands; keep 50:50 for the classic balanced coarsening. Hit Randomise after changing it to reseed at the new ratio.",
    },
    {
      label: "Randomise",
      tip: "Re-scatters every agent into a fresh salt-and-pepper start at the current Empty and Mix settings, resetting the round counter. Press it after moving any slider to apply the new population, then press play to watch this seed coarsen — re-roll a few times to confirm the end-state segregation is robust, not a fluke of one layout.",
    },
  ],
  watch:
    "The grid is the hero: a blended checkerboard coarsens into monochrome blocks tick by tick. \"Segregation\" is the average same-colour-neighbour fraction — it climbs from its random baseline (≈ the mix ratio) toward 0.7–0.8+ even at τ = 30%, the quantitative twin of what you see. \"Happy\" rises to 100% (transport reads Settled ✓) when everyone is content; at high τ or low Empty it stalls below 100% — that residual is the gridlock failure mode. Agent counts never change: they move, never appear or vanish.",
};

export default explain;
