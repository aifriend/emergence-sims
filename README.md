# Emergence & Intelligence Across Scales

An interactive simulation portfolio that walks one arc — **the math of emergence → minds → agents → societies**. Built with **Next.js 15, React 19, TypeScript, Tailwind CSS 4, and Three.js**. Every model is computed live in the browser from first principles; nothing is pre-rendered.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

`npm run build` produces a fully static, prerendered site (every page is SSG).

## What's inside

**4 premium 3D heroes** — `/sim/<id>`:

| Sim | Idea |
|---|---|
| **Strange Attractors** | Lorenz · Rössler · Aizawa — deterministic chaos, live in 3D |
| **Attention, Visualized** | the Transformer self-attention mechanism, `softmax(QKᵀ/√dₖ)`, as a 3D graph |
| **Watch an Agent Learn** | reinforcement learning balances a cart-pole from scratch, with a live learning curve |
| **Intelligence Without a Goal** | the *same* pole balanced by causal-entropic forcing — no reward, no learning |

**A 20-model Simulation Lab** — `/lab`, a blueprint-styled gallery of live canvas models across three movements:

- **Emergence & complexity** — flocking, Game of Life, reaction–diffusion, route-to-chaos, predator–prey, Kuramoto synchrony, SIR epidemic, ant colony
- **Minds & learning** — Hodgkin–Huxley neuron, Hopfield associative memory, reward-prediction (TD-learning), Q-learning
- **Societies & markets** — spatial Prisoner's Dilemma, Schelling segregation, echo chambers, voting methods, minority game, agent-based market, wealth & inequality, and a causal-entropy particle

## Architecture

Each sim is a **pure model + a renderer + an SSR page**, which keeps the physics testable and the heavy client code out of server rendering:

| Path | Role |
|---|---|
| `lib/*.ts` | Pure, framework-agnostic models (integrators, agents) — unit-testable in isolation |
| `components/*Client.tsx` | Client-only `ssr:false` wrappers that keep Three.js / canvas off the server |
| `app/sim/<id>/page.tsx` | Server component — SSR metadata + prose for SEO, hosts the canvas |
| `lib/lab/sims.ts` | Lab metadata registry (server-safe) — drives routing, static params, the gallery |
| `components/lab/` | Shared blueprint hooks + controls; one renderer per model in `components/lab/sims/` |
| `app/lab/[sim]/page.tsx` | Per-model detail sheet (SSG via `generateStaticParams` + metadata) |

The reinforcement-learning agent's hyperparameters were tuned by an automated keep/discard optimization loop over a fixed 5-seed validation set (mean episode length 314 → 500).

## Deploy

The site is fully static, so it deploys anywhere — Vercel, Netlify, Cloud Run, or any Node host:

```bash
npm run build && npm start
```

## License

[MIT](LICENSE) © 2026 Jose Lopez
