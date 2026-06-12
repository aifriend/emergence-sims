import type { PlaybackManifest } from "./types";

/**
 * id → recorded-run manifest, rendered (SSR) on a `kind: "playback"` detail sheet.
 * These projects can't run in a static portal (Docker / PyTorch / GPU), so a
 * representative run is computed offline in its own repo and played back here.
 */
export const PLAYBACK: Record<string, PlaybackManifest> = {
  openworm: {
    title: "C. elegans — forward locomotion",
    about:
      "A whole-organism simulation of the 1-mm nematode C. elegans. Its ~300-neuron nervous system (c302, on the NEURON simulator) drives a soft-body physics model of the worm's body (Sibernetic) — and a forward-crawling gait emerges from the coupling, nothing scripted. The full pipeline needs Docker, NEURON and a physics engine, so this is a run computed offline and played back.",
    video: "/playback/openworm/locomotion.mp4",
    poster: "/playback/openworm/motion-poster.png",
    meta: [
      { label: "Organism", value: "C. elegans (hermaphrodite)" },
      { label: "Nervous system", value: "c302 0.11 · NEURON 8.2.6" },
      { label: "Body physics", value: "Sibernetic soft-body" },
      { label: "Gait reference", value: "C2 · forward" },
      { label: "Simulated time", value: "100 ms" },
      { label: "Compute", value: "~10 min CPU, offline" },
    ],
    plots: [
      { src: "/playback/openworm/neurons.png", caption: "Neuron activity over time" },
      { src: "/playback/openworm/muscles.png", caption: "Muscle activation over time" },
    ],
    source: { project: "OpenWorm", note: "openworm.org · c302 + Sibernetic" },
  },
  "atari-pong": {
    title: "IQN agent plays Atari Pong",
    about:
      "A distributional deep reinforcement-learning agent — Implicit Quantile Networks — playing Atari 2600 Pong from raw pixels, recorded during a greedy evaluation episode. The agent never sees the game's rules; it learned the full return distribution of each action by trial and error. Trained with PyTorch + the Arcade Learning Environment, far too heavy for a static site, so this is a recorded eval.",
    video: "/playback/atari-pong/pong.mp4",
    meta: [
      { label: "Algorithm", value: "IQN (Implicit Quantile Networks)" },
      { label: "Environment", value: "PongNoFrameskip-v4 (ALE)" },
      { label: "Input", value: "Raw 160×210 pixels" },
      { label: "Policy", value: "Greedy evaluation" },
      { label: "Framework", value: "PyTorch · deep_rl_zoo" },
    ],
    source: { project: "Atari57", note: "deep-RL zoo · IQN agent" },
  },
};
