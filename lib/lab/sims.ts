/**
 * Simulation Lab — pure metadata registry.
 *
 * Framework-agnostic, server-importable (no React, no canvas). Drives routing,
 * static params, SSR metadata, the drafting "sheet" numbers, and the gallery.
 * The live React/canvas renderers live in `components/lab/` and are mapped by
 * `id` in `components/lab/registry.tsx`.
 */

export type SimMeta = {
  /** route id, e.g. "boids" -> /lab/boids */
  id: string;
  /** figure number, zero-padded "01".."06" */
  fig: string;
  title: string;
  /** short attribution line, e.g. "Reynolds boids" */
  sub: string;
  /** taxonomy lens, e.g. "Emergence" */
  tag: string;
  /** number of tunable parameters (shown on the card) */
  params: number;
  desc: string;
};

export const LAB_SIMS: SimMeta[] = [
  {
    id: "boids",
    fig: "01",
    title: "Flocking",
    sub: "Reynolds boids",
    tag: "Emergence",
    params: 7,
    desc: "Local rules, global order. Hundreds of agents self-organise into a murmuration.",
  },
  {
    id: "life",
    fig: "02",
    title: "Game of Life",
    sub: "Conway, 1970",
    tag: "Cellular automata",
    params: 3,
    desc: "A two-state cellular automaton. Four rules give rise to gliders, guns and universal computation.",
  },
  {
    id: "lotka",
    fig: "05",
    title: "Predator – Prey",
    sub: "Lotka–Volterra",
    tag: "Dynamical system",
    params: 5,
    desc: "Coupled ODEs for two species. Watch the eternal oscillation and its phase-space orbit.",
  },
  {
    id: "sir",
    fig: "07",
    title: "Epidemic Spread",
    sub: "SIR · agent-based",
    tag: "Contagion",
    params: 6,
    desc: "Susceptible, infected, recovered. A contact network in motion — flatten the curve in real time.",
  },
  {
    id: "ants",
    fig: "08",
    title: "Ant Colony",
    sub: "Stigmergy",
    tag: "Swarm intelligence",
    params: 5,
    desc: "Pheromone foraging. Trails self-organise between nest and food with no central control.",
  },
  {
    id: "reaction",
    fig: "03",
    title: "Reaction – Diffusion",
    sub: "Gray–Scott",
    tag: "Turing patterns",
    params: 3,
    desc: "Two chemicals, diffusing and reacting. Turing's morphogenesis grows spots, mazes and coral from noise.",
  },
  {
    id: "hopfield",
    fig: "10",
    title: "Associative Memory",
    sub: "Hopfield, 1982",
    tag: "Neural memory",
    params: 4,
    desc: "Store patterns as energy minima. Feed in a corrupted cue and watch the network fall back into the memory it most resembles.",
  },
  {
    id: "tdlearning",
    fig: "11",
    title: "Reward Prediction",
    sub: "TD-learning",
    tag: "Reinforcement",
    params: 4,
    desc: "A value signal learns to predict reward — and its prediction error behaves like dopamine, marching from the reward back to the cue.",
  },
  {
    id: "qlearning",
    fig: "12",
    title: "Q-Learning",
    sub: "Watkins, 1989",
    tag: "Reinforcement",
    params: 4,
    desc: "An agent learns a gridworld by trial and error; value floods outward from the goal and the greedy policy snaps into place.",
  },
  {
    id: "schelling",
    fig: "14",
    title: "Segregation",
    sub: "Schelling, 1971",
    tag: "Social dynamics",
    params: 3,
    desc: "Each agent only wants a few like-minded neighbours — yet that mild preference tips a mixed city into stark, self-organised segregation.",
  },
  {
    id: "voting",
    fig: "16",
    title: "Voting Methods",
    sub: "Social choice",
    tag: "Decision",
    params: 3,
    desc: "The same voters, four fair-looking rules, four different winners — a live tour of the spoiler effect and Arrow's impossibility theorem.",
  },
  {
    id: "wealth",
    fig: "19",
    title: "Wealth & Inequality",
    sub: "Kinetic exchange",
    tag: "Econophysics",
    params: 4,
    desc: "Start everyone equal and let them trade by fair coin flips; a Pareto elite emerges from pure chance — and tax policy fights back.",
  },
  {
    id: "kuramoto",
    fig: "06",
    title: "Synchrony",
    sub: "Kuramoto",
    tag: "Synchronization",
    params: 3,
    desc: "Hundreds of oscillators with their own rhythms; turn up the coupling and they snap into lockstep — the math behind brain waves and firefly flashing.",
  },
  {
    id: "opinion",
    fig: "15",
    title: "Echo Chambers",
    sub: "Bounded confidence",
    tag: "Social dynamics",
    params: 3,
    desc: "People only listen to those who already think like them. Tune the open-mindedness and watch a society reach consensus — or fracture into camps.",
  },
  {
    id: "market",
    fig: "18",
    title: "Market",
    sub: "Fundamentalists vs chartists",
    tag: "Markets",
    params: 4,
    desc: "Price emerges from value-investors versus trend-chasers. Trend-following breeds bubbles, crashes and the clustered volatility of real markets.",
  },
  {
    id: "minority",
    fig: "17",
    title: "Minority Game",
    sub: "El Farol",
    tag: "Bounded rationality",
    params: 3,
    desc: "Selfish agents with no communication and short memories self-organise to share a scarce resource, hovering right at its capacity.",
  },
  {
    id: "neuron",
    fig: "09",
    title: "Action Potential",
    sub: "Hodgkin–Huxley",
    tag: "Neuroscience",
    params: 4,
    desc: "The all-or-nothing nerve impulse from real ion-channel kinetics — inject current and watch a single neuron fire the spike behind every thought.",
  },
  {
    id: "spatialpd",
    fig: "13",
    title: "Cooperation",
    sub: "Spatial Prisoner's Dilemma",
    tag: "Game theory",
    params: 3,
    desc: "Defection wins in a well-mixed crowd — but on a grid, cooperators huddle into clusters that defend their borders, and cooperation survives.",
  },
  {
    id: "bifurcation",
    fig: "04",
    title: "Route to Chaos",
    sub: "Logistic map",
    tag: "Chaos",
    params: 2,
    desc: "Turn one knob and a stable population splits into 2-, 4-, 8-cycles and then deterministic chaos — at Feigenbaum's universal rate.",
  },
  {
    id: "entropica",
    fig: "20",
    title: "Future Freedom",
    sub: "Causal entropic forces",
    tag: "Emergence",
    params: 3,
    desc: "A particle with no goal, drifting to wherever its futures stay most open — Wissner-Gross's thesis that intelligence is a force toward freedom of action.",
  },
].sort((a, b) => a.fig.localeCompare(b.fig));

/** index sheet (gallery) + one sheet per model */
export const LAB_TOTAL = LAB_SIMS.length + 1;

export const pad2 = (n: number): string => String(n).padStart(2, "0");

/** the gallery is sheet 01; each model is its figure number + 1 */
export const sheetForFig = (fig: string): number => parseInt(fig, 10) + 1;

export const getSim = (id: string): SimMeta | undefined =>
  LAB_SIMS.find((s) => s.id === id);
