import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FooterBlock, Hero, SectionBar, Topbar } from "@/components/lab/Chrome";
import LabGallery from "@/components/lab/LabGallery";
import { DOMAIN_ORDER, LAB_SIMS, LAB_TOTAL } from "@/lib/lab/sims";

export const metadata: Metadata = {
  title: "Simulation Lab — Interactive Models | Emergence Sims",
  description:
    "A blueprint laboratory of live, playable complex-systems models: flocking, Game of Life, predator–prey, epidemic spread, ant colonies and reaction–diffusion. Pull a slider and watch the pattern reorganise.",
};

export default function LabHome(): ReactNode {
  return (
    <>
      <Topbar sheet={1} total={LAB_TOTAL} />
      <div className="fade">
        <Hero count={LAB_SIMS.length} />
        <SectionBar
          left="FIG. INDEX — The Constellation"
          right={`${LAB_SIMS.length} models · ${DOMAIN_ORDER.length} domains`}
        />
        <p className="lab-notes constellation-intro">
          One family of simulations across {DOMAIN_ORDER.length} domains —
          cellular automata, agent-based worlds, nonlinear dynamics, learning
          systems and biology. Each card is a live in-browser model (or a
          recorded run) distilled from a deeper standalone research project.
        </p>
        <LabGallery />
        <FooterBlock sheet={1} total={LAB_TOTAL} />
      </div>
    </>
  );
}
