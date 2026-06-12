import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { DetailHead, FooterBlock, SectionBar, Topbar } from "@/components/lab/Chrome";
import LabSimMount from "@/components/lab/LabSimMount";
import RecordedPlayback from "@/components/lab/RecordedPlayback";
import { LAB_SIMS, LAB_TOTAL, getSim, pad2, sheetForFig } from "@/lib/lab/sims";
import { SIM_EXPLAIN } from "@/lib/lab/explain";

type Params = { sim: string };

export function generateStaticParams(): Params[] {
  return LAB_SIMS.map((s) => ({ sim: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { sim: id } = await params;
  const sim = getSim(id);
  if (!sim) return { title: "Simulation Lab | Emergence Sims" };
  return {
    title: `${sim.title} — ${sim.sub} | Simulation Lab`,
    description: sim.desc,
  };
}

export default async function LabSimPage({
  params,
}: {
  params: Promise<Params>;
}): Promise<ReactNode> {
  const { sim: id } = await params;
  const sim = getSim(id);
  if (!sim) notFound();

  const sheet = sheetForFig(sim.fig);
  const ex = SIM_EXPLAIN[sim.id];

  return (
    <>
      <Topbar sheet={sheet} total={LAB_TOTAL} />
      <div className="fade">
        <DetailHead sim={sim} />
        {sim.kind === "playback" ? (
          <RecordedPlayback id={sim.id} />
        ) : (
          <LabSimMount id={sim.id} />
        )}
        {ex ? (
          <>
            <SectionBar
              left="What's happening"
              right={`FIG. ${sim.fig} · Sheet ${pad2(sheet)}`}
              style={{ marginTop: 26 }}
            />
            <p className="lab-notes">{ex.about}</p>
            <SectionBar
              left="Parameters — how to use them"
              style={{ marginTop: 26 }}
            />
            <dl className="lab-params">
              {ex.controls.map((c) => (
                <div className="row" key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>{c.tip}</dd>
                </div>
              ))}
            </dl>
            {ex.watch ? (
              <>
                <SectionBar left="What to watch for" style={{ marginTop: 26 }} />
                <p className="lab-notes">{ex.watch}</p>
              </>
            ) : null}
          </>
        ) : (
          <>
            <SectionBar
              left="Notes"
              right={`FIG. ${sim.fig} · Sheet ${pad2(sheet)}`}
              style={{ marginTop: 26 }}
            />
            <p className="lab-notes">{sim.desc}</p>
          </>
        )}
        <FooterBlock sheet={sheet} total={LAB_TOTAL} />
      </div>
    </>
  );
}
