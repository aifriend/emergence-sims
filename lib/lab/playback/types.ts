/**
 * A pre-recorded simulation run, shipped as static assets and played back on its
 * detail sheet. The portal can't run Python / GPU / Docker at runtime, so the
 * heavyweight projects (deep-RL, whole-organism biology) enter as recorded runs
 * produced offline in their own repos.
 */
export type PlaybackManifest = {
  /** headline shown above the player */
  title: string;
  /** 2–4 sentences: what this run shows and how it was produced. */
  about: string;
  /** video path under /public, e.g. "/playback/openworm/locomotion.mp4" */
  video: string;
  /** optional poster image (path under /public) */
  poster?: string;
  /** run metadata: engine, duration, agent, score, … (rendered as a table). */
  meta: { label: string; value: string }[];
  /** optional still plots (PNG paths under /public) shown beside the video. */
  plots?: { src: string; caption: string }[];
  /** optional time-series drawn as a learning / activity curve. */
  series?: { label: string; color: string; data: number[] };
  /** attribution: the standalone project this run came from. */
  source: { project: string; note?: string };
};
