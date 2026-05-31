import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import EntropicCartPoleClient from "@/components/EntropicCartPoleClient";

export const metadata: Metadata = {
  title: "Intelligence Without a Goal — Causal Entropic Forces | Emergence Sims",
  description:
    "The same pole, balanced with no reward and no learning. The agent simply keeps its options open — choosing the action that leaves the most possible futures — and balancing emerges. Wissner-Gross & Freer's causal entropic forces, live.",
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
          causal-entropic-forces
        </span>
        <span className="rounded-full bg-[var(--color-accent-2)]/20 px-2 py-0.5 text-[var(--color-accent-2)]">
          ★ signature
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Intelligence Without a Goal
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        This is the same cart-pole as{" "}
        <Link href="/sim/cartpole" className="text-[var(--color-accent)] hover:underline">
          “Watch an Agent Learn”
        </Link>{" "}
        — but here there is <em>no reward and no learning</em>. Each instant the
        agent imagines many random futures for each move and picks the one that
        keeps the most futures alive. Balancing falls out for free. Hit{" "}
        <em>nudge</em> and watch it save itself.
      </p>

      <div className="mt-8">
        <EntropicCartPoleClient />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Overview
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            A fallen pole is a dead end — almost no futures remain. A balanced
            pole keeps thousands of paths open. So “keep your options open”
            <em> is</em> balancing, with no one ever stating the goal.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Methodology
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            A Monte-Carlo causal entropic force (Wissner-Gross &amp; Freer,
            2013): for each action, roll out many random futures over a horizon
            and estimate how much future freedom it preserves; act toward the
            maximum. The bars show that estimate, live.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Applications
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Intrinsic motivation and exploration in RL, “empowerment” in
            robotics, open-ended search — and a provocative, debated thesis that
            intelligence itself is a force toward future freedom of action.
          </p>
        </div>
      </section>
    </main>
  );
}
