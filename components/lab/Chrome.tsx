/**
 * Drafting chrome for the Simulation Lab — topbar title-block, hero, section
 * rules, detail header, and footer title-block. Pure presentational markup
 * (no client hooks), so these render on the server.
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { pad2, type SimMeta } from "@/lib/lab/sims";

function Mark(): ReactNode {
  return (
    <div className="mark">
      <svg className="cross" viewBox="0 0 30 30">
        <line x1="15" y1="2" x2="15" y2="28" stroke="rgba(255,122,26,0.8)" strokeWidth="1" />
        <line x1="2" y1="15" x2="28" y2="15" stroke="rgba(255,122,26,0.8)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function Topbar({ sheet, total }: { sheet: number; total: number }): ReactNode {
  return (
    <div className="topbar">
      <Link href="/lab" className="brand">
        <Mark />
        <div>
          <h1>Simulation Lab</h1>
          <div className="sub">Interactive Models &amp; Visualizations</div>
        </div>
      </Link>
      <div className="tblock">
        <div className="cell">
          <span className="k">Sheet</span>
          <span className="v">
            {pad2(sheet)} / {pad2(total)}
          </span>
        </div>
        <div className="cell">
          <span className="k">Scale</span>
          <span className="v">1 : 1</span>
        </div>
        <div className="cell">
          <span className="k">Rev</span>
          <span className="v">C</span>
        </div>
        <div className="cell">
          <span className="k">Units</span>
          <span className="v">SI</span>
        </div>
      </div>
    </div>
  );
}

export function Hero({ count }: { count: number }): ReactNode {
  return (
    <section className="hero">
      <div>
        <h2>
          Adjust the
          <br />
          parameters.
          <br />
          <span className="o">Watch</span> it emerge.
        </h2>
        <p className="lede">
          A laboratory of live, playable models — flocks, epidemics, cellular
          automata and colonies. Every system here is computed in real time from
          simple local rules. Pull a slider; the global pattern reorganises
          before your eyes.
        </p>
      </div>
      <div className="meta">
        <div className="label" style={{ marginBottom: 6 }}>
          Models on sheet
        </div>
        <div className="bignum tnum">{String(count).padStart(2, "0")}</div>
        <div className="label" style={{ marginTop: 14, lineHeight: 1.9 }}>
          Emergence · Dynamics
          <br />
          Contagion · Automata
        </div>
      </div>
    </section>
  );
}

export function SectionBar({
  left,
  right,
  style,
}: {
  left: string;
  right?: string;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div className="sectionbar" style={style}>
      <span className="label">{left}</span>
      <span className="grow" />
      {right && <span className="label">{right}</span>}
    </div>
  );
}

export function DetailHead({ sim }: { sim: SimMeta }): ReactNode {
  return (
    <div className="detail-head">
      <div className="left">
        <span className="fig">FIG. {sim.fig}</span>
        <h2>{sim.title}</h2>
        <span className="sub">
          {sim.sub} · {sim.tag}
        </span>
      </div>
      <Link href="/lab" className="btn">
        ‹ All models
      </Link>
    </div>
  );
}

export function FooterBlock({ sheet, total }: { sheet: number; total: number }): ReactNode {
  return (
    <div className="footblock">
      <div className="cell">
        <span className="k">Drawing</span>
        <span className="v big">
          Simulation Lab — Sheet {pad2(sheet)} / {pad2(total)}
        </span>
      </div>
      <div className="cell">
        <span className="k">Discipline</span>
        <span className="v">Complex Systems</span>
      </div>
      <div className="cell">
        <span className="k">Method</span>
        <span className="v">Numerical / Agent</span>
      </div>
      <div className="cell">
        <span className="k">Date</span>
        <span className="v tnum">2026.05.30</span>
      </div>
    </div>
  );
}
