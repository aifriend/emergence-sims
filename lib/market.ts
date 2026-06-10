/**
 * Agent-based financial market model (Brock–Hommes 1998 / Lux–Marchesi 1999
 * flavour) — the pure, React-free core behind the Market lab sim, extracted so
 * it can be unit-tested. Log-price is a tug-of-war between FUNDAMENTALISTS
 * (demand ∝ p_f − p, mean-reverting) and CHARTISTS (demand ∝ recent trend,
 * trend-amplifying); a market maker moves price by net excess demand and agents
 * adaptively switch toward the recently-more-profitable strategy via a logit
 * choice. Bubbles, crashes, clustered volatility and fat tails emerge with
 * nothing exogenous.
 */

export type MarketP = { chartFrac: number; gc: number; noise: number; speed: number };

export const PF = 0; // log fundamental value (constant ⇒ price near-stationary, returns are the object)
export const WIN = 400; // rolling display window (steps)
const GF = 0.06; // fundamentalist mean-reversion gain (the anchor)
const MU = 1.0; // market-maker price impact per unit net demand
const WMEM = 0.94; // fitness memory smoothing
const CF = 0.002; // fundamentalist information cost (the BH asymmetry)
const BETA = 9.0; // intensity of choice (how hard agents chase the winner)
export const CRASH = 0.06; // |return| flagged as a crash flash (log units)

/** standard normal via Box–Muller */
function gauss(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Sim = {
  p: number; // current log price
  pPrev: number; // previous log price
  nc: number; // chartist fraction
  uf: number; // smoothed fitness, fundamentalists
  uc: number; // smoothed fitness, chartists
  df: number; // last fundamentalist demand
  dc: number; // last chartist demand
  step: number;
  peak: number; // running max of exp(p) for drawdown
  maxDD: number; // worst drawdown fraction seen
};

export function fresh(): Sim {
  return {
    p: PF,
    pPrev: PF,
    nc: 0.5,
    uf: 0,
    uc: 0,
    df: 0,
    dc: 0,
    step: 0,
    peak: Math.exp(PF),
    maxDD: 0,
  };
}

/** one discrete market step; mutates `s` and returns the log return r_t. */
export function advance(s: Sim, P: MarketP): number {
  const { gc, noise } = P;
  // demands from current state (work in logs)
  const df = GF * (PF - s.p);
  const dc = gc * (s.p - s.pPrev);
  const nf = 1 - s.nc;
  const eps = noise * gauss();
  // Clamp the log-price. Chartist demand is positive feedback on the trend; at
  // high chartist share+aggressiveness it diverges to ±Infinity, after which
  // exp(p), the chart y-range and the chartist share all go NaN and the sim is
  // permanently broken. Bounding to ±1.2 caps a bubble/crash at ~exp(±1.2)
  // (≈0.30×–3.3× of fundamental) while keeping the dynamics intact.
  let pNext = s.p + MU * (nf * df + s.nc * dc) + eps;
  pNext = Math.max(-1.2, Math.min(1.2, pNext));

  // realized profit of last period's positions over this price move
  const dPrice = Math.exp(pNext) - Math.exp(s.p);
  const rawUf = dPrice * s.df - CF;
  const rawUc = dPrice * s.dc;
  s.uf = WMEM * s.uf + (1 - WMEM) * rawUf;
  s.uc = WMEM * s.uc + (1 - WMEM) * rawUc;

  // logit switching with a fixed bias toward chartism (the slider's baseline).
  // log-sum-exp for overflow safety; `chartFrac` shifts the chartist utility.
  const biasC = 6 * (P.chartFrac - 0.5);
  const af = BETA * s.uf;
  const ac = BETA * s.uc + biasC;
  const mx = Math.max(af, ac);
  const ef = Math.exp(af - mx);
  const ec = Math.exp(ac - mx);
  s.nc = ec / (ef + ec);

  s.df = df;
  s.dc = dc;
  s.pPrev = s.p;
  s.p = pNext;
  s.step++;

  // drawdown bookkeeping on the price level
  const lvl = Math.exp(pNext);
  if (lvl > s.peak) s.peak = lvl;
  const dd = 1 - lvl / s.peak;
  if (dd > s.maxDD) s.maxDD = dd;

  return pNext - s.pPrev; // log return r_t
}
