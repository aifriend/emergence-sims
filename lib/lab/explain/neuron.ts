import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "The Hodgkin–Huxley model (1952): a real action potential rebuilt from ion-channel physics, not a drawn shape. The membrane is a capacitor in parallel with voltage-gated sodium and potassium channels plus a leak; four coupled ODEs (voltage + three gating variables m, h, n) are integrated with RK4. The spike is an emergent all-or-nothing excursion — sodium rushes in to fire it, potassium repolarizes, the gates reset. The oscilloscope shows V(t) over a rolling 50 ms window against marked rest (−65), threshold (−55), peak (+40) and after-hyperpolarization (−80) levels.",
  controls: [
    {
      label: "I_ext  injected current",
      tip: "Sustained stimulus current driving the membrane. At 0 it sits at rest; nudge it up and nothing happens until ~6–7 µA/cm², where it crosses threshold into a steady tonic spike train. Try ramping it to 18–20: the firing rate climbs, then the neuron falls silent — depolarization block, the f–I curve folding back on itself.",
    },
    {
      label: "gNa  sodium",
      tip: "Maximum sodium conductance — the inward current that powers the upstroke. Try dropping it from 120 toward ~40 while injecting current: spikes shrink and eventually fail, since there's no longer enough Na⁺ influx to regenerate the all-or-nothing peak.",
    },
    {
      label: "gK  potassium",
      tip: "Maximum potassium conductance — the outward current that repolarizes and resets the membrane. Try raising it above 36 with steady I_ext: repolarization sharpens and the after-hyperpolarization deepens; cut it toward 0 and the spike can't reset, so firing stalls or broadens.",
    },
    {
      label: "Speed",
      tip: "Slow-motion factor for sim time vs wall-clock. Leave at 1× for real timing; drop to 0.1–0.2× to watch a single spike's ~1–2 ms upstroke and downstroke unfold, and read the m/h/n gating sequence as it happens.",
    },
    {
      label: "⚡ Inject pulse",
      tip: "Fires a brief 1.5 ms supra-threshold current jolt — the classic all-or-nothing demo. Click once from rest (I_ext = 0): one full spike regardless of how 'hard' you click. Click twice in quick succession and the second pulse fails or is attenuated — the refractory period, because h hasn't recovered yet.",
    },
  ],
  watch:
    "The Gates m · h · n panel is the mechanism in one view: on each spike m (Na↑) shoots up first to open sodium and drive the upstroke, then h (Na↓) falls to inactivate it while n (K↑) rises to open potassium and pull the voltage back down. The V readout tracks the live membrane potential; Firing rate shows '—' below threshold and a Hz count once a tonic train establishes.",
};

export default explain;
