import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import AttentionClient from "@/components/AttentionClient";

export const metadata: Metadata = {
  title: "Attention, Visualized — How a Transformer Attends | Emergence Sims",
  description:
    "Watch the self-attention mechanism behind modern AI in 3D: every token sends a query, weighs every other token by a scaled dot product, and reads back a softmax-weighted blend.",
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
          machine-learning
        </span>
        <span className="rounded-full bg-[var(--color-accent-2)]/20 px-2 py-0.5 text-[var(--color-accent-2)]">
          ★ signature
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Attention, Visualized
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        The one mechanism behind every modern language model. Each token asks a
        question (its <em>query</em>), compares it against what every other token
        offers (its <em>key</em>), and reads back a weighted blend of their
        values. Click a token, or watch the sweep, to see where attention flows.
      </p>

      <div className="mt-8">
        <AttentionClient />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Overview
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Brightness of each beam is how strongly the active query token
            attends to another. Switch heads to see the same sentence read
            through different relationships — attention is many parallel lenses,
            not one.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Methodology
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Scaled dot-product attention: weights ={" "}
            <code>softmax(QKᵀ/√dₖ)</code>, applied per head, with sinusoidal
            positional encodings. The projection weights here are illustrative
            (untrained) — this is the shape of the mechanism, not learned
            linguistics.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Applications
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            The Transformer (Vaswani et al., 2017) — the architecture under
            large language models, machine translation, protein folding, and
            modern computer vision.
          </p>
        </div>
      </section>
    </main>
  );
}
