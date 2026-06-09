import type { SimExplain } from "./types";
import boids from "./boids";
import life from "./life";
import lotka from "./lotka";
import sir from "./sir";
import ants from "./ants";
import reaction from "./reaction";
import hopfield from "./hopfield";
import tdlearning from "./tdlearning";
import qlearning from "./qlearning";
import schelling from "./schelling";
import voting from "./voting";
import wealth from "./wealth";
import kuramoto from "./kuramoto";
import opinion from "./opinion";
import market from "./market";
import minority from "./minority";
import neuron from "./neuron";
import spatialpd from "./spatialpd";
import bifurcation from "./bifurcation";
import entropica from "./entropica";

/** id → explanatory content, rendered (SSR) on each /lab/[sim] detail sheet. */
export const SIM_EXPLAIN: Record<string, SimExplain> = {
  boids,
  life,
  lotka,
  sir,
  ants,
  reaction,
  hopfield,
  tdlearning,
  qlearning,
  schelling,
  voting,
  wealth,
  kuramoto,
  opinion,
  market,
  minority,
  neuron,
  spatialpd,
  bifurcation,
  entropica,
};
