"use client";

/**
 * Maps sim ids to their live React/canvas renderers and gallery thumbnails.
 * Everything is loaded with `ssr: false` because the sims touch canvas / RAF /
 * window — the same client-only pattern the rest of the app uses for Three.js.
 */
import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

function StageLoading(): ReactNode {
  return (
    <div
      className="stage"
      style={{
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className="label">loading model…</span>
    </div>
  );
}

export const SIM_COMPONENTS: Record<string, ComponentType> = {
  boids: dynamic(() => import("./sims/Boids").then((m) => m.Boids), {
    ssr: false,
    loading: StageLoading,
  }),
  life: dynamic(() => import("./sims/Life").then((m) => m.Life), {
    ssr: false,
    loading: StageLoading,
  }),
  lotka: dynamic(() => import("./sims/Lotka").then((m) => m.LotkaVolterra), {
    ssr: false,
    loading: StageLoading,
  }),
  sir: dynamic(() => import("./sims/Sir").then((m) => m.SIR), {
    ssr: false,
    loading: StageLoading,
  }),
  ants: dynamic(() => import("./sims/Ants").then((m) => m.AntColony), {
    ssr: false,
    loading: StageLoading,
  }),
  reaction: dynamic(
    () => import("./sims/Reaction").then((m) => m.ReactionDiffusion),
    { ssr: false, loading: StageLoading },
  ),
  hopfield: dynamic(() => import("./sims/Hopfield").then((m) => m.Hopfield), {
    ssr: false,
    loading: StageLoading,
  }),
  tdlearning: dynamic(
    () => import("./sims/TDLearning").then((m) => m.TDLearning),
    { ssr: false, loading: StageLoading },
  ),
  qlearning: dynamic(() => import("./sims/QLearning").then((m) => m.QLearning), {
    ssr: false,
    loading: StageLoading,
  }),
  schelling: dynamic(() => import("./sims/Schelling").then((m) => m.Schelling), {
    ssr: false,
    loading: StageLoading,
  }),
  voting: dynamic(() => import("./sims/Voting").then((m) => m.Voting), {
    ssr: false,
    loading: StageLoading,
  }),
  wealth: dynamic(() => import("./sims/Wealth").then((m) => m.Wealth), {
    ssr: false,
    loading: StageLoading,
  }),
  kuramoto: dynamic(() => import("./sims/Kuramoto").then((m) => m.Kuramoto), {
    ssr: false,
    loading: StageLoading,
  }),
  opinion: dynamic(() => import("./sims/Opinion").then((m) => m.Opinion), {
    ssr: false,
    loading: StageLoading,
  }),
  market: dynamic(() => import("./sims/Market").then((m) => m.Market), {
    ssr: false,
    loading: StageLoading,
  }),
  minority: dynamic(() => import("./sims/Minority").then((m) => m.Minority), {
    ssr: false,
    loading: StageLoading,
  }),
  neuron: dynamic(() => import("./sims/Neuron").then((m) => m.Neuron), {
    ssr: false,
    loading: StageLoading,
  }),
  spatialpd: dynamic(() => import("./sims/SpatialPD").then((m) => m.SpatialPD), {
    ssr: false,
    loading: StageLoading,
  }),
  bifurcation: dynamic(
    () => import("./sims/Bifurcation").then((m) => m.Bifurcation),
    { ssr: false, loading: StageLoading },
  ),
  entropica: dynamic(() => import("./sims/Entropica").then((m) => m.Entropica), {
    ssr: false,
    loading: StageLoading,
  }),
};

export const SIM_THUMBS: Record<string, ComponentType> = {
  boids: dynamic(() => import("./sims/Boids").then((m) => m.BoidsThumb), {
    ssr: false,
  }),
  life: dynamic(() => import("./sims/Life").then((m) => m.LifeThumb), {
    ssr: false,
  }),
  lotka: dynamic(() => import("./sims/Lotka").then((m) => m.LotkaThumb), {
    ssr: false,
  }),
  sir: dynamic(() => import("./sims/Sir").then((m) => m.SirThumb), {
    ssr: false,
  }),
  ants: dynamic(() => import("./sims/Ants").then((m) => m.AntsThumb), {
    ssr: false,
  }),
  reaction: dynamic(
    () => import("./sims/Reaction").then((m) => m.ReactionThumb),
    { ssr: false },
  ),
  hopfield: dynamic(() => import("./sims/Hopfield").then((m) => m.HopfieldThumb), {
    ssr: false,
  }),
  tdlearning: dynamic(
    () => import("./sims/TDLearning").then((m) => m.TDLearningThumb),
    { ssr: false },
  ),
  qlearning: dynamic(
    () => import("./sims/QLearning").then((m) => m.QLearningThumb),
    { ssr: false },
  ),
  schelling: dynamic(
    () => import("./sims/Schelling").then((m) => m.SchellingThumb),
    { ssr: false },
  ),
  voting: dynamic(() => import("./sims/Voting").then((m) => m.VotingThumb), {
    ssr: false,
  }),
  wealth: dynamic(() => import("./sims/Wealth").then((m) => m.WealthThumb), {
    ssr: false,
  }),
  kuramoto: dynamic(
    () => import("./sims/Kuramoto").then((m) => m.KuramotoThumb),
    { ssr: false },
  ),
  opinion: dynamic(() => import("./sims/Opinion").then((m) => m.OpinionThumb), {
    ssr: false,
  }),
  market: dynamic(() => import("./sims/Market").then((m) => m.MarketThumb), {
    ssr: false,
  }),
  minority: dynamic(
    () => import("./sims/Minority").then((m) => m.MinorityThumb),
    { ssr: false },
  ),
  neuron: dynamic(() => import("./sims/Neuron").then((m) => m.NeuronThumb), {
    ssr: false,
  }),
  spatialpd: dynamic(
    () => import("./sims/SpatialPD").then((m) => m.SpatialPDThumb),
    { ssr: false },
  ),
  bifurcation: dynamic(
    () => import("./sims/Bifurcation").then((m) => m.BifurcationThumb),
    { ssr: false },
  ),
  entropica: dynamic(
    () => import("./sims/Entropica").then((m) => m.EntropicaThumb),
    { ssr: false },
  ),
};
