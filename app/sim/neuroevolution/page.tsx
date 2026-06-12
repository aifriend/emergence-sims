import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import NeuroevolutionClient from "@/components/NeuroevolutionClient";

export const metadata: Metadata = {
  title: "Watch a Neural Net Learn to Drive | Emergence Sims",
  description:
    "A tiny neural network drives Formula-1 circuits in a top-down 2D view — seeing only 9 distance whiskers and its own speed. It was never trained by backprop: a genetic algorithm evolved it, and LoRA-style per-track adapters let one champion brain master a whole curriculum of tracks.",
};

export default function Page(): ReactNode {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-fg)]"
      >
        ← all simulations
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[var(--color-muted)]">
          Arc III · Agents
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[var(--color-muted)]">
          neuroevolution
        </span>
        <span className="rounded-full bg-[var(--color-accent-2)]/20 px-2 py-0.5 text-[var(--color-accent-2)]">
          ★ signature
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Evolution Behind the Wheel
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        This car has no map. It sees the world through nine{" "}
        <em>distance whiskers</em> and feels its own speed — that is the entire
        input to a 16-neuron net that outputs only <em>steer</em> and{" "}
        <em>gas</em>. Nothing here was taught by backpropagation: the brain was{" "}
        <em>evolved</em> by a genetic algorithm. Switch circuits and watch the
        same champion adapt — that is what the per-track adapters buy you.
      </p>

      <div className="mt-8">
        <NeuroevolutionClient />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Overview
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            The driver is a feed-forward network of just sixteen hidden neurons.
            Its only senses are nine forward range-finders — like a bat&apos;s
            echolocation — plus its current speed. No global view of the track,
            no racing line, no rules: only what the whiskers report, frame by
            frame.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Methodology
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            The weights were found by <em>neuroevolution</em> — a genetic
            algorithm that mutates and selects whole networks by lap fitness,
            never computing a gradient. One frozen base brain is specialized
            per circuit by <em>LoRA-style adapters</em>: small low-rank weight
            deltas, one per curriculum level, so a single champion masters
            Monaco through Ironcliff.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Applications
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Neuroevolution for control where gradients are unavailable,
            sim-to-real transfer of policies learned in simulation, and
            curriculum learning — bootstrapping hard tasks from easy ones with
            cheap per-task adapters instead of retraining from scratch.
          </p>
        </div>
      </section>
    </main>
  );
}
