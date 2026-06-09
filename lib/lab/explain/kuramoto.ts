import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Kuramoto's model of spontaneous synchronization. Each dot on the circle is a phase oscillator with its own preferred speed; a single global coupling K pulls every oscillator toward the population's mean phase. Below a critical coupling they smear all the way around the ring and drift independently; push K past threshold and a macroscopic fraction snaps into one rotating arc — the second-order phase transition behind fireflies flashing together and neurons firing in rhythm.",
  controls: [
    {
      label: "K  coupling",
      tip: "Strength of the pull toward the mean field — the star control. Start at 0 (dots spread evenly, order r ≈ 0) and slowly raise it: with σ ≈ 0.6 the order parameter r jumps off the floor near K ≈ 1, the moment the population locks. Crank to 5–6 and r → 1, every dot rotating as one.",
    },
    {
      label: "σ  spread",
      tip: "Standard deviation of the oscillators' natural frequencies (their disorder) — dots are colored cyan→orange by frequency. Wider spread raises the critical K, so the population is harder to synchronize. Try this: set K ≈ 1.5 to get partial lock, then drag σ from 0.2 up to 2.5 and watch the locked arc dissolve as the frequencies become too scattered to agree.",
    },
    {
      label: "M  oscillators",
      tip: "Population size. The order parameter r fluctuates by roughly 1/√M, so this is a finite-size knob, not a physics one. Set K right at the transition (~1) and compare M = 40 versus M = 300: the small crowd makes r jitter visibly while the large one traces a smooth, steady value.",
    },
  ],
  watch:
    "The orange arrow from the center is the order-parameter vector r·e^{iψ}: its length is the coherence r and its angle is the mean phase. The r(t) trace and the 'Order r' readout climb off ~0 the instant K crosses critical; the status flips Incoherent → Partial lock → Synchronized. Near threshold, r wobbles strongly — that flicker is real finite-size noise, not a glitch.",
};

export default explain;
