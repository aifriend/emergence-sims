"use client";

/* The gallery sheet — specimen cards grouped into domain sections, each with a
 * live thumbnail. Sections + order come from `simsByDomain()`. */
import Link from "next/link";
import type { ReactNode } from "react";
import { simsByDomain } from "@/lib/lab/sims";
import { SIM_THUMBS } from "./registry";
import { SectionBar } from "./Chrome";

export default function LabGallery(): ReactNode {
  return (
    <>
      {simsByDomain().map(({ domain, sims }) => (
        <section className="domain-section" key={domain}>
          <SectionBar
            left={domain}
            right={`${sims.length} model${sims.length === 1 ? "" : "s"}`}
          />
          <div className="gallery">
            {sims.map((s) => {
              const Thumb = SIM_THUMBS[s.id];
              return (
                <Link href={`/lab/${s.id}`} className="card corners" key={s.id}>
                  <div className="thumb">{Thumb && <Thumb />}</div>
                  <span className="figtag">FIG. {s.fig}</span>
                  <span className="open-cue">OPEN ▸</span>
                  <div className="body">
                    <div className="tag">{s.tag}</div>
                    <h3>{s.title}</h3>
                    <div className="csub">{s.sub}</div>
                    <p>{s.desc}</p>
                    <div className="foot">
                      <span>
                        {s.kind === "playback" ? "Recorded run" : `${s.params} parameters`}
                      </span>
                      <span>{s.kind === "playback" ? "Video" : "Real-time"}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
