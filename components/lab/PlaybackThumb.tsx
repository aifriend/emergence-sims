"use client";

/**
 * Gallery thumbnail for a recorded-playback card. Unlike the interactive sims
 * (live canvas), these are videos — so the thumb is the run's poster (or first
 * trace plot) under a small "recorded" badge.
 */
import type { ComponentType, ReactNode } from "react";
import { PLAYBACK } from "@/lib/lab/playback";

export function makePlaybackThumb(id: string): ComponentType {
  const m = PLAYBACK[id];
  const src = m?.poster ?? m?.plots?.[0]?.src;
  function PlaybackThumb(): ReactNode {
    return (
      <div className="pb-thumb">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pb-thumb-img" />
        ) : null}
        <span className="pb-thumb-badge">▶ recorded</span>
      </div>
    );
  }
  return PlaybackThumb;
}
