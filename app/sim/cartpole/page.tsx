import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import CartPoleClient from "@/components/CartPoleClient";

export const metadata: Metadata = {
  title: "Watch an Agent Learn — Reinforcement Learning, Live | Emergence Sims",
  description:
    "A reinforcement-learning agent learns to balance a pole from scratch, in your browser. No demonstrations, no labels — just reward, trial and error, and a learning curve that climbs in real time.",
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
          reinforcement-learning
        </span>
        <span className="rounded-full bg-[var(--color-accent-2)]/20 px-2 py-0.5 text-[var(--color-accent-2)]">
          ★ signature
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Watch an Agent Learn
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        At first it flails and the pole topples in a second. Leave it running:
        with nothing but a <em>+1 per step</em> reward and trial-and-error, the
        agent discovers how to balance — and the learning curve climbs past the
        “solved” line. Drag <em>speed</em> to fast-forward training, then
        “watch greedy” to see its best policy with the exploration turned off.
      </p>

      <div className="mt-8">
        <CartPoleClient />
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Overview
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            The cart can only push left or right. Balancing the pole is a
            control problem with no obvious rulebook — the agent has to{" "}
            <em>discover</em> the policy purely from the consequences of its
            actions.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Methodology
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Tabular Q-learning over a discretized state:{" "}
            <code>Q(s,a) ← Q + α[r + γ·maxₐ′Q(s′,a′) − Q]</code>, with ε-greedy
            exploration that decays as it gains confidence. The physics is the
            classic cart-pole (Barto–Sutton–Anderson, 1983).
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-accent)]">
            Applications
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Robotics and locomotion, process and traffic control, game-playing
            agents, recommendation, and the reward-driven learning thought to
            underlie dopamine signalling in the brain.
          </p>
        </div>
      </section>
    </main>
  );
}
