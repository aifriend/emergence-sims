"use client";

/* Hodgkin–Huxley action potential — the biophysical atom of a thought.
 * A capacitive membrane (Cm) in parallel with three voltage-gated conductances
 * (Na⁺, K⁺, leak). Four coupled ODEs: the voltage balance plus three gating
 * variables m,h,n that open/close the channels. The spike is an emergent
 * limit-cycle excursion, not a scripted shape. Integrated with RK4, dt=0.01 ms.
 * Standard squid-axon parameterization (Hodgkin & Huxley, 1952), V referenced
 * to rest = −65 mV. */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";

// fixed membrane constants (the sliders cover gNa, gK, I_ext)
const CM = 1.0; // µF/cm²
const GL = 0.3; // mS/cm²
const E_NA = 50; // mV
const E_K = -77; // mV
const E_L = -54.387; // mV
const PHI = 1.0; // gate temperature factor (Q10), held at 1
const VREST = -65; // mV
const VTHRESH = -55; // mV — approximate spike threshold (marker)
const VPEAK = 40; // mV — typical spike peak (marker)
const DT = 0.01; // ms — RK4 timestep
const WIN_MS = 50; // ms — rolling oscilloscope window
const HIST = 1000; // samples kept (WIN_MS / DT-decimated → 1 sample / 0.05 ms)
const SAMPLE_MS = WIN_MS / HIST; // ms between stored trace samples

type NeuronP = { iext: number; gNa: number; gK: number; speed: number };
type Gate = { m: number; h: number; n: number };

/** removable-singularity guard: αm is 0/0 at V=−40, αn at V=−55.
 *  Taylor limit of 0.a·(V−V0)/(1−exp(−(V−V0)/10)) as V→V0 is 0.a·10 = a. */
function alphaM(v: number): number {
  const d = v + 40;
  if (Math.abs(d) < 1e-6) return 1.0; // lim → 0.1·10
  return (0.1 * d) / (1 - Math.exp(-d / 10));
}
function betaM(v: number): number {
  return 4 * Math.exp(-(v + 65) / 18);
}
function alphaH(v: number): number {
  return 0.07 * Math.exp(-(v + 65) / 20);
}
function betaH(v: number): number {
  return 1 / (1 + Math.exp(-(v + 35) / 10));
}
function alphaN(v: number): number {
  const d = v + 55;
  if (Math.abs(d) < 1e-6) return 0.1; // lim → 0.01·10
  return (0.01 * d) / (1 - Math.exp(-d / 10));
}
function betaN(v: number): number {
  return 0.125 * Math.exp(-(v + 65) / 80);
}

type State = { v: number; m: number; h: number; n: number };

/** time-derivatives of the 4-D HH system at the given state and stimulus */
function deriv(s: State, iext: number, gNa: number, gK: number): State {
  const { v, m, h, n } = s;
  const iNa = gNa * m * m * m * h * (v - E_NA);
  const iK = gK * n * n * n * n * (v - E_K);
  const iL = GL * (v - E_L);
  return {
    v: (iext - iNa - iK - iL) / CM,
    m: PHI * (alphaM(v) * (1 - m) - betaM(v) * m),
    h: PHI * (alphaH(v) * (1 - h) - betaH(v) * h),
    n: PHI * (alphaN(v) * (1 - n) - betaN(v) * n),
  };
}

/** one classical RK4 step of size dt (ms) */
function rk4(s: State, dt: number, iext: number, gNa: number, gK: number): State {
  const k1 = deriv(s, iext, gNa, gK);
  const s2 = { v: s.v + (k1.v * dt) / 2, m: s.m + (k1.m * dt) / 2, h: s.h + (k1.h * dt) / 2, n: s.n + (k1.n * dt) / 2 };
  const k2 = deriv(s2, iext, gNa, gK);
  const s3 = { v: s.v + (k2.v * dt) / 2, m: s.m + (k2.m * dt) / 2, h: s.h + (k2.h * dt) / 2, n: s.n + (k2.n * dt) / 2 };
  const k3 = deriv(s3, iext, gNa, gK);
  const s4 = { v: s.v + k3.v * dt, m: s.m + k3.m * dt, h: s.h + k3.h * dt, n: s.n + k3.n * dt };
  const k4 = deriv(s4, iext, gNa, gK);
  return {
    v: s.v + ((k1.v + 2 * k2.v + 2 * k3.v + k4.v) * dt) / 6,
    m: s.m + ((k1.m + 2 * k2.m + 2 * k3.m + k4.m) * dt) / 6,
    h: s.h + ((k1.h + 2 * k2.h + 2 * k3.h + k4.h) * dt) / 6,
    n: s.n + ((k1.n + 2 * k2.n + 2 * k3.n + k4.n) * dt) / 6,
  };
}

function freshState(): State {
  // resting steady states x∞ = α/(α+β) evaluated at V = −65
  return { v: VREST, m: 0.0529, h: 0.5961, n: 0.3177 };
}

export function Neuron(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<NeuronP>({ iext: 0, gNa: 120, gK: 36, speed: 1.0 });
  const [readout, setReadout] = useState({ v: VREST, rate: 0 });
  const live = useLive(p);
  live.current = p;

  const st = useRef<State>(freshState());
  const vHist = useRef<number[]>([]); // membrane V samples, length ≤ HIST
  const gates = useRef<Gate[]>([]); // m,h,n samples, length ≤ HIST
  const acc = useRef(0); // ms of sim time owed since last stored sample
  const flash = useRef(0); // spike highlight fade (frames)
  const spikeTimes = useRef<number[]>([]); // ms timestamps of recent threshold crossings
  const simT = useRef(0); // total elapsed sim time (ms)
  const pulse = useRef<{ until: number; amp: number }>({ until: 0, amp: 0 });

  const [cref, csize] = useCanvas(() => draw());

  function reset() {
    st.current = freshState();
    vHist.current = [];
    gates.current = [];
    acc.current = 0;
    flash.current = 0;
    spikeTimes.current = [];
    simT.current = 0;
    pulse.current = { until: 0, amp: 0 };
    setReadout({ v: VREST, rate: 0 });
    draw();
  }

  /** brief supra-threshold current injection (the all-or-nothing demo) */
  function inject() {
    pulse.current = { until: simT.current + 1.5, amp: 18 };
  }

  /** firing rate (Hz) from spikes inside the rolling window; "—" when sub-threshold */
  function firingRate(): number {
    const sp = spikeTimes.current;
    if (sp.length < 2) return 0;
    const span = sp[sp.length - 1] - sp[0];
    if (span <= 0) return 0;
    return ((sp.length - 1) / span) * 1000; // ms → Hz
  }

  useRAF((dt) => {
    if (running) {
      const P = live.current;
      // wall-clock dt → sim ms (capped so a tab-resume can't dump a huge burst)
      const simMs = Math.min(8, (dt / 1000) * 1000 * P.speed);
      const nSteps = Math.max(1, Math.round(simMs / DT));
      let s = st.current;
      let prevV = s.v;
      for (let i = 0; i < nSteps; i++) {
        const stim = simT.current < pulse.current.until ? pulse.current.amp : P.iext;
        s = rk4(s, DT, stim, P.gNa, P.gK);
        // clamp gates to [0,1] against round-off; voltage to a sane physical band
        s.m = Math.max(0, Math.min(1, s.m));
        s.h = Math.max(0, Math.min(1, s.h));
        s.n = Math.max(0, Math.min(1, s.n));
        s.v = Math.max(-95, Math.min(60, s.v));
        simT.current += DT;
        // rising upstroke through threshold ⇒ count a spike + flash
        if (prevV < VTHRESH && s.v >= VTHRESH) {
          spikeTimes.current.push(simT.current);
          flash.current = 12;
        }
        prevV = s.v;
        // store a decimated sample for the rolling trace
        acc.current += DT;
        if (acc.current >= SAMPLE_MS) {
          acc.current -= SAMPLE_MS;
          vHist.current.push(s.v);
          gates.current.push({ m: s.m, h: s.h, n: s.n });
          if (vHist.current.length > HIST) vHist.current.shift();
          if (gates.current.length > HIST) gates.current.shift();
        }
      }
      st.current = s;
      // drop spikes older than the visible window so the rate tracks the trace
      const cutoff = simT.current - WIN_MS;
      while (spikeTimes.current.length && spikeTimes.current[0] < cutoff) {
        spikeTimes.current.shift();
      }
      if (flash.current > 0) flash.current--;
      setReadout({ v: s.v, rate: firingRate() });
    }
    draw();
  }, true);

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    const pad = 14;
    const x0 = pad,
      y0 = pad,
      pw = w - pad * 2,
      ph = h - pad * 2;

    // frame + title
    ctx.strokeStyle = "rgba(196,220,255,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, pw, ph);
    ctx.fillStyle = "rgba(176,203,244,0.7)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("MEMBRANE POTENTIAL  V(t)   /  50 ms", x0 + 6, y0 + 12);

    // voltage → pixel map over a fixed physiological band
    const vTop = 50,
      vBot = -90;
    const py = (v: number) => y0 + ph - ((v - vBot) / (vTop - vBot)) * ph;

    // grid
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const yy = y0 + (g / 4) * ph;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + pw, yy);
      ctx.stroke();
    }

    // reference levels: rest, threshold, peak, AHP
    const refLine = (v: number, color: string, label: string) => {
      const yy = py(v);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + pw, yy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.fillText(label, x0 + 6, yy - 4);
    };
    refLine(VPEAK, "rgba(159,208,255,0.35)", "peak +40");
    refLine(VTHRESH, "rgba(255,162,81,0.5)", "threshold −55");
    refLine(VREST, "rgba(159,208,255,0.55)", "rest −65");
    refLine(-80, "rgba(124,170,228,0.3)", "AHP −80");

    // spike flash overlay
    if (flash.current > 0) {
      ctx.fillStyle = `rgba(255,122,69,${0.05 + 0.08 * (flash.current / 12)})`;
      ctx.fillRect(x0 + 1, y0 + 1, pw - 2, ph - 2);
    }

    // V(t) trace — oldest sample at the left, newest at the right
    const V = vHist.current;
    if (V.length > 1) {
      const off = HIST - V.length;
      ctx.beginPath();
      for (let i = 0; i < V.length; i++) {
        const x = x0 + ((off + i) / (HIST - 1)) * pw;
        const yy = py(V[i]);
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      }
      ctx.strokeStyle = "#e8f1ff";
      ctx.lineWidth = 1.7;
      ctx.stroke();
      // leading dot — accent while a spike is firing
      const lx = x0 + pw,
        ly = py(V[V.length - 1]);
      ctx.fillStyle = flash.current > 0 ? "var(--accent-2)" : "#e8f1ff";
      ctx.beginPath();
      ctx.arc(lx, ly, 2.8, 0, 7);
      ctx.fill();
    }

    // y-axis tick labels (mV)
    ctx.fillStyle = "rgba(176,203,244,0.5)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("+50", x0 + pw - 26, py(50) + 10);
    ctx.fillText("0", x0 + pw - 14, py(0) + 3);
    ctx.fillText("−90", x0 + pw - 26, py(-90) - 3);
  }

  // gating sparklines for the rail (m up, h down, n up during a spike)
  const gh = gates.current;
  const mSeries = gh.map((g) => g.m);
  const hSeries = gh.map((g) => g.h);
  const nSeries = gh.map((g) => g.n);

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport running={running} onToggle={() => setRunning((r) => !r)} onReset={reset}>
          <Btn accent onClick={inject} title="Brief supra-threshold current injection">
            ⚡ Inject pulse
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap" style={{ color: "var(--accent-2)" }}>
            {flash.current > 0 ? "⚡ spike" : "—"}
          </span>
        </Transport>
      }
      controls={
        <>
          <Group title="Stimulus">
            <Slider
              label="I_ext  injected current"
              value={p.iext}
              min={0}
              max={20}
              step={0.5}
              fmt={(v) => v.toFixed(1)}
              unit=" µA/cm²"
              onChange={(v) => setP((o) => ({ ...o, iext: v }))}
            />
          </Group>
          <Group title="Channel conductances">
            <Slider
              label="gNa  sodium"
              value={p.gNa}
              min={0}
              max={200}
              step={1}
              unit=" mS/cm²"
              onChange={(v) => setP((o) => ({ ...o, gNa: v }))}
            />
            <Slider
              label="gK  potassium"
              value={p.gK}
              min={0}
              max={80}
              step={1}
              unit=" mS/cm²"
              onChange={(v) => setP((o) => ({ ...o, gK: v }))}
            />
          </Group>
          <Group title="Clock">
            <Slider
              label="Speed"
              value={p.speed}
              min={0.1}
              max={2}
              step={0.1}
              unit="×"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Gates  m · h · n">
            <MiniPlot
              series={[
                { data: mSeries, color: "var(--accent-2)" },
                { data: hSeries, color: "#9fd0ff" },
                { data: nSeries, color: "#e8f1ff" },
              ]}
              max={1}
              height={84}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              <span className="label" style={{ color: "var(--accent-2)" }}>m Na↑</span>
              <span className="label" style={{ color: "#9fd0ff" }}>h Na↓</span>
              <span className="label" style={{ color: "#e8f1ff" }}>n K↑</span>
            </div>
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="V" v={`${readout.v.toFixed(1)} mV`} color="#e8f1ff" />
          <ReadOut
            k="Firing rate"
            v={readout.rate > 0.5 ? `${readout.rate.toFixed(0)} Hz` : "—"}
            color="var(--accent-2)"
          />
          <ReadOut k="I_ext" v={`${p.iext.toFixed(1)} µA`} />
        </>
      }
      footnote={
        <span>
          The all-or-nothing nerve impulse, reconstructed from real ion-channel
          kinetics: sodium rushes in to fire the spike, potassium repolarizes,
          and the gates reset. The biophysical atom of every thought (Hodgkin
          &amp; Huxley, 1952).
        </span>
      }
    />
  );
}

export function NeuronThumb(): ReactNode {
  const st = useRef<State>(freshState());
  const vHist = useRef<number[]>([]);
  const acc = useRef(0);
  const tt = useRef(0);
  const [cref, csize] = useCanvas();
  const THUMB_N = 220;

  useRAF((dt) => {
    // steady supra-threshold drive → a lively tonic spike train
    const iext = 10;
    const simMs = Math.min(6, (dt / 1000) * 1000);
    const nSteps = Math.max(1, Math.round(simMs / DT));
    let s = st.current;
    for (let i = 0; i < nSteps; i++) {
      s = rk4(s, DT, iext, 120, 36);
      s.m = Math.max(0, Math.min(1, s.m));
      s.h = Math.max(0, Math.min(1, s.h));
      s.n = Math.max(0, Math.min(1, s.n));
      s.v = Math.max(-95, Math.min(60, s.v));
      tt.current += DT;
      acc.current += DT;
      if (acc.current >= 0.18) {
        acc.current -= 0.18;
        vHist.current.push(s.v);
        if (vHist.current.length > THUMB_N) vHist.current.shift();
      }
    }
    st.current = s;

    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    const V = vHist.current;
    const vTop = 50,
      vBot = -90;
    const py = (v: number) => h - ((v - vBot) / (vTop - vBot)) * h;
    // faint rest line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(159,208,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, py(VREST));
    ctx.lineTo(w, py(VREST));
    ctx.stroke();
    ctx.setLineDash([]);
    if (V.length > 1) {
      const off = THUMB_N - V.length;
      ctx.beginPath();
      for (let i = 0; i < V.length; i++) {
        const x = ((off + i) / (THUMB_N - 1)) * w;
        const yy = py(V[i]);
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      }
      ctx.strokeStyle = "#e8f1ff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }, true);

  return <canvas ref={cref} />;
}
