import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import StrangeAttractorsClient from "@/components/StrangeAttractorsClient";

// Server-rendered metadata + prose => real SEO (the gap the reference site left open).
export const metadata: Metadata = {
  title: "Strange Attractors — Lorenz, Rössler & Aizawa | Emergence Sims",
  description:
    "Watch three classic chaotic systems trace their attractors live in 3D. Deterministic equations, unpredictable paths — the signature of chaos.",
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
          Arc I · Math of Emergence
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[var(--color-muted)]">
          chaos-theory
        </span>
        <span className="rounded-full bg-[var(--color-accent-2)]/20 px-2 py-0.5 text-[var(--color-accent-2)]">
          ★ signature
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Strange Attractors</h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        Three famous systems — Lorenz, Rössler, and Aizawa — each just three
        simple differential equations whose solutions never repeat yet never
        escape, tracing an infinitely detailed shape in space.
      </p>

      <div className="mt-8">
        <StrangeAttractorsClient />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Overview
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Drag the sliders and the butterfly reshapes. Below the Lorenz
            critical value the trajectory settles; above it, the path becomes
            forever unpredictable while staying bounded — chaos, not noise.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Methodology
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Each frame advances the system with a fourth-order Runge–Kutta step
            and plots the trajectory as a living point cloud. Deterministic
            rules, unpredictable path — the hallmark of deterministic chaos.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Applications
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            The limits of weather prediction, chaotic secure communication,
            nonlinear control, fluid turbulence, and the mathematics behind
            sensitive dependence on initial conditions.
          </p>
        </div>
      </section>
    </main>
  );
}
