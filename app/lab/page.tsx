import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FooterBlock, Hero, SectionBar, Topbar } from "@/components/lab/Chrome";
import LabGallery from "@/components/lab/LabGallery";
import { LAB_SIMS, LAB_TOTAL } from "@/lib/lab/sims";

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
        <SectionBar left="FIG. INDEX — Specimens" right="Drag sliders · live" />
        <LabGallery />
        <FooterBlock sheet={1} total={LAB_TOTAL} />
      </div>
    </>
  );
}
