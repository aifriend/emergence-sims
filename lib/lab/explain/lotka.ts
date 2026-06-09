import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "The Lotka–Volterra predator–prey model: two coupled differential equations integrated live with RK4. Prey (blue) grow on their own but are eaten on contact with predators; predators (orange) starve without prey but multiply by eating them. The result is a perpetual cycle — prey boom, predators follow and crash the prey, then predators starve and prey rebound — that never settles to a steady state.",
  controls: [
    {
      label: "α  growth",
      tip: "Prey birth rate in the absence of predators (the αx term, 0.2–2). Raise it and prey rebound faster after each crash, which drives taller, more frequent boom–bust cycles and pushes the predator equilibrium line (α/β) upward.",
    },
    {
      label: "β  predation",
      tip: "How efficiently predators consume prey on contact (the −βxy term, 0.05–1). Increase it and predators suppress prey harder, so the prey peaks shrink; it sets the predator equilibrium α/β, so larger β lowers the steady predator level.",
    },
    {
      label: "δ  conversion",
      tip: "How much eaten prey converts into new predators (the δxy term, 0.02–0.4). Turn it up and the predator population responds more violently to prey abundance, shrinking the orbit; it sets the prey equilibrium γ/δ, so larger δ lowers the steady prey level.",
    },
    {
      label: "γ  death",
      tip: "Predator death rate when prey is scarce (the −γy term, 0.1–1). Raise it and predators die off faster between prey booms, pushing the prey equilibrium (γ/δ) higher; lower it and predators linger, suppressing prey for longer.",
    },
    {
      label: "Sim speed",
      tip: "Time-step multiplier for the integrator (0.2×–3×). It only changes how fast the orbit is traced, not its shape — slow it to 0.2× to watch the predator peak lag behind the prey peak, or speed to 3× to fill the phase portrait quickly.",
    },
  ],
  watch:
    "The left panel plots both populations versus time: notice the orange predator wave always peaks just after the blue prey wave — predators chase prey with a built-in delay. The right Phase Portrait plots predators against prey; the trajectory forms a closed loop orbiting the fixed point (blue ring at prey = γ/δ, predators = α/β), and the orange dot is the current state circling it forever. Change any parameter and the equilibrium point and orbit shape jump immediately. The Prey and Predator readouts show the live counts.",
};

export default explain;
