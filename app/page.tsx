import type { ReactNode } from "react";
import Link from "next/link";

export default function Home(): ReactNode {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm uppercase tracking-[0.3em] text-[var(--color-muted)]">
        Portfolio · Arc I — The Math of Emergence
      </p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
        Emergence &amp; Intelligence
        <br />
        <span className="text-[var(--color-accent)]">Across Scales</span>
      </h1>
      <p className="mt-6 max-w-xl text-[var(--color-muted)]">
        A growing collection of interactive simulations. First up — the visual
        anchor of the whole collection: order emerging from deterministic chaos.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        <Link
          href="/sim/strangeAttractors"
          className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-soft)] px-5 py-4 transition hover:border-[var(--color-accent)]/50"
        >
          <span className="text-2xl">🦋</span>
          <span>
            <span className="block font-medium">Strange Attractors</span>
            <span className="block text-sm text-[var(--color-muted)]">
              Lorenz · Rössler · Aizawa — live in 3D
            </span>
          </span>
          <span className="ml-2 text-[var(--color-accent)] transition group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          href="/sim/attention"
          className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-soft)] px-5 py-4 transition hover:border-[var(--color-accent)]/50"
        >
          <span className="text-2xl">🧠</span>
          <span>
            <span className="block font-medium">Attention, Visualized</span>
            <span className="block text-sm text-[var(--color-muted)]">
              How a Transformer attends — scaled dot-product in 3D
            </span>
          </span>
          <span className="ml-2 text-[var(--color-accent)] transition group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          href="/sim/cartpole"
          className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-soft)] px-5 py-4 transition hover:border-[var(--color-accent)]/50"
        >
          <span className="text-2xl">🤖</span>
          <span>
            <span className="block font-medium">Watch an Agent Learn</span>
            <span className="block text-sm text-[var(--color-muted)]">
              Reinforcement learning balances a pole — live
            </span>
          </span>
          <span className="ml-2 text-[var(--color-accent)] transition group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          href="/sim/entropic"
          className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-soft)] px-5 py-4 transition hover:border-[var(--color-accent)]/50"
        >
          <span className="text-2xl">🕊️</span>
          <span>
            <span className="block font-medium">Intelligence Without a Goal</span>
            <span className="block text-sm text-[var(--color-muted)]">
              A pole balanced by entropy alone — no reward, no learning
            </span>
          </span>
          <span className="ml-2 text-[var(--color-accent)] transition group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          href="/lab"
          className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[var(--color-bg-soft)] px-5 py-4 transition hover:border-[var(--color-accent)]/50"
        >
          <span className="text-2xl">📐</span>
          <span>
            <span className="block font-medium">Simulation Lab</span>
            <span className="block text-sm text-[var(--color-muted)]">
              Sixteen live blueprint models — flocking, memory, markets &amp; more
            </span>
          </span>
          <span className="ml-2 text-[var(--color-accent)] transition group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </main>
  );
}
