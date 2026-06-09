/** Explanatory content for a Simulation Lab model — rendered (SSR) on its detail sheet. */
export type SimExplain = {
  /** 2-4 sentences: the phenomenon, what's happening on screen, why it matters. */
  about: string;
  /** One entry per tunable control; `label` must match the on-screen control text. */
  controls: { label: string; tip: string }[];
  /** Optional: what to look for in the animation / what the readouts & plots mean. */
  watch?: string;
};
