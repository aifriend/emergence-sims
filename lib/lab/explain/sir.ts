import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "An agent-based SIR epidemic: every dot is a person moving in a box, coloured Susceptible (blue), Infectious (orange) or Recovered (green). Starting from three infections near the centre, an infectious person passing within the contact radius of a susceptible one can transmit; after a fixed infectious period each case recovers and becomes immune. Out of these local, random contacts emerges the classic epidemic curve — a single wave of infection that rises, peaks, then burns out as susceptibles run dry.",
  controls: [
    {
      label: "Transmission β",
      tip: "Probability of infection per contact with an infectious neighbour (0.05–1). It is the per-edge transmission rate: raise it toward 1 and the outbreak ignites fast and infects nearly everyone; drop it low and many runs fizzle before spreading, since R₀ scales with β.",
    },
    {
      label: "Infectious period",
      tip: "How many seconds a case stays infectious before recovering (2–16 s). Longer periods give each infective more chances to transmit, raising R₀ and the final outbreak size; shorten it and infections recover before they can pass it on, helping the wave die out.",
    },
    {
      label: "Contact radius",
      tip: "The distance (6–28 px, drawn as the orange ring around each case) within which transmission can occur. Widen it and effectively everyone is a contact, so the epidemic explodes; narrow it and spread slows to a crawl as infectives must nearly touch a susceptible to pass it on.",
    },
    {
      label: "Size",
      tip: "Total population, 60–600 (takes effect on the next Re-seed). Larger populations give denser mixing and smoother, taller epidemic curves; smaller ones are noisier and more prone to chance burnout from the same three seeds.",
    },
    {
      label: "Mobility",
      tip: "Movement speed multiplier for everyone who is moving (0.1×–2.2×). High mobility mixes the population fast and accelerates a sharp, early peak; lower it toward 0.1× and the infection spreads as a slow local wave instead of igniting everywhere at once.",
    },
    {
      label: "Distancing",
      tip: "Fraction of people (0%–90%) who stay put instead of moving (set at the next Re-seed). This is the lockdown lever: push it up and most agents become stationary, fragmenting contact so the curve flattens and the peak drops — the whole point for not overwhelming a hospital.",
    },
    {
      label: "Re-seed outbreak",
      tip: "Rebuilds the population with current settings and reignites three fresh infections, clearing the history plot. Use it to A/B test an intervention: note the peak, raise Distancing or lower Transmission β, re-seed, and compare the new peak height.",
    },
  ],
  watch:
    "Watch orange bloom outward from the centre and chase the blue dots until it runs out of susceptibles and fades to green. The S / I / R readouts always sum to the population (conservation), and the epidemic curve below stacks them over time — the orange I(t) band is the wave whose height is labelled 'peak'. Flattening that peak with lower mobility, transmission, or higher distancing is the public-health money shot.",
};

export default explain;
