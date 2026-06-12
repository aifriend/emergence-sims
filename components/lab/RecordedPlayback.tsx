/**
 * Detail-sheet renderer for a `kind: "playback"` sim — a native video player for
 * a pre-recorded run plus its run metadata. Pure presentational (no hooks, no
 * canvas), so it renders on the server. Real assets/manifests arrive in Phase 3;
 * until then `PLAYBACK[id]` is empty and it shows a graceful placeholder.
 */
import type { ReactNode } from "react";
import { PLAYBACK } from "@/lib/lab/playback";

export default function RecordedPlayback({ id }: { id: string }): ReactNode {
  const m = PLAYBACK[id];
  if (!m) {
    return (
      <div
        className="stage"
        style={{
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="label">recording unavailable</span>
      </div>
    );
  }
  return (
    <div className="playback">
      <div className="playback-stage">
        <video
          className="playback-video"
          src={m.video}
          poster={m.poster}
          controls
          loop
          playsInline
          preload="metadata"
        />
      </div>
      <div className="playback-side">
        <p className="lab-notes">{m.about}</p>
        <dl className="lab-params">
          {m.meta.map((kv) => (
            <div className="row" key={kv.label}>
              <dt>{kv.label}</dt>
              <dd>{kv.value}</dd>
            </div>
          ))}
        </dl>
        {m.plots?.length ? (
          <div className="playback-plots">
            {m.plots.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <figure key={p.src}>
                <img src={p.src} alt={p.caption} loading="lazy" />
                <figcaption className="label">{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        <div className="label playback-source">
          Source · {m.source.project}
          {m.source.note ? ` — ${m.source.note}` : ""}
        </div>
      </div>
    </div>
  );
}
