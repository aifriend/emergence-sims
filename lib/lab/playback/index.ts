import type { PlaybackManifest } from "./types";

/**
 * id → recorded-run manifest, rendered (SSR) on a `kind: "playback"` detail sheet.
 * Populated in Phase 3 (openworm, atari-pong); wired here so the render path and
 * the [sim] branch exist ahead of the assets.
 */
export const PLAYBACK: Record<string, PlaybackManifest> = {};
