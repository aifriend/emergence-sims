import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Reynolds' boids: each agent is a simple particle that steers using only what it can see within its vision radius — no leader and no global plan. Every frame it blends three local urges (don't crowd neighbours, match their heading, drift toward their centre) and caps its own speed. The coherent flock, with its splitting, merging and swirling, is pure emergence from those three rules.",
  controls: [
    {
      label: "Agents",
      tip: "Number of boids on the canvas (20–360). Push it toward 360 and loose clusters fuse into one dense, sloshing super-flock; drop it near 20 and the agents wander almost independently because few are ever inside each other's vision radius.",
    },
    {
      label: "Max speed",
      tip: "Caps how fast each boid can fly (1–5 px/step); they also refuse to drop below half this. Raise it to ~5 and the flock turns frantic and overshoots its own turns; lower it to ~1 to watch the steering geometry resolve into tidy lanes in slow motion.",
    },
    {
      label: "Vision radius",
      tip: "How far each boid senses neighbours (20–90 px). It is the coupling range of the whole system: widen it toward 90 and the population locks into a single global flock, narrow it toward 20 and it shatters into many small, independent swarms.",
    },
    {
      label: "Separation",
      tip: "Strength of the short-range push away from close neighbours. Crank it to 3 and the flock spreads into a loose, evenly-spaced gas that won't clump; set it to 0 and boids pile onto the same point until separation can no longer hold them apart.",
    },
    {
      label: "Alignment",
      tip: "How strongly a boid matches its neighbours' average heading. High alignment with low separation gives smooth, parallel streams flying as one; set it to 0 and headings never synchronise, so you get cohesive blobs that mill about without a shared direction.",
    },
    {
      label: "Cohesion",
      tip: "Pull toward the local centre of mass of visible neighbours. Raise it and the flock contracts into a tight ball; with cohesion high but separation near 0 the group collapses to a knot, showing why the three forces must stay balanced.",
    },
    {
      label: "Motion trails",
      tip: "On leaves a fading smear behind each boid by only partially clearing the canvas; Off repaints a clean background every frame. Flip it On to read the actual flow lines and vortices the flock traces, or Off to see crisp instantaneous positions.",
    },
  ],
  watch:
    "Watch order appear from disorder: from a random start the boids self-organise into streaming bands within seconds, with no boid 'deciding' the shape. The orange agents (every 9th boid) make individual paths easy to follow inside the crowd, and the FPS / AGENTS readout confirms the simulation is keeping up as you add boids.",
};

export default explain;
