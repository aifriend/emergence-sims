"use client";

/* The gallery sheet — one "specimen" card per model, each with a live thumbnail. */
import Link from "next/link";
import type { ReactNode } from "react";
import { LAB_SIMS } from "@/lib/lab/sims";
import { SIM_THUMBS } from "./registry";

export default function LabGallery(): ReactNode {
  return (
    <div className="gallery">
      {LAB_SIMS.map((s) => {
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
                <span>{s.params} parameters</span>
                <span>Real-time</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
