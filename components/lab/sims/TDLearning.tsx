"use client";

/* Reward Prediction — Temporal-Difference learning / dopamine.
 * Classical conditioning on a tapped-delay-line timeline: each trial sweeps
 * t=0..T-1 computing δ_t = r_t + γ·V[t+1] − V[t] and nudges V[t] += α·δ_t.
 * Over trials the δ spike migrates backward from the reward to the predictive
 * cue — the canonical dopamine result (Schultz–Dayan–Montague 1997). */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, MiniPlot, ReadOut, Slider, SimLayout, Transport } from "../controls";

const T = 18; // timesteps per trial

type TDP = { alpha: number; gamma: number; cue: number; rew: number; speed: number };

/** one full trial sweep over the delay line; returns the per-step δ profile.
 *  V is mutated in place; omit drops the reward at t_rew (the killer demo).
 *  Pre-cue steps carry no predictive value (the cue is the first reliable
 *  signal), so V is held at 0 before t_cue — this halts the backward march of
 *  the error AT the cue, exactly as in the Schultz cue-transfer result rather
 *  than letting it leak all the way to t=0. */
function runTrial(V: Float32Array, p: TDP, omit: boolean): Float32Array {
  const d = new Float32Array(T);
  const cue = Math.min(p.cue, p.rew - 1);
  const rew = Math.max(p.rew, cue + 1);
  for (let t = 0; t < cue; t++) V[t] = 0; // no value before the cue exists
  for (let t = cue; t < T; t++) {
    const r = t === rew && !omit ? 1 : 0;
    const next = t + 1 < T ? V[t + 1] : 0; // terminal successor V[T]=0
    const delta = r + p.gamma * next - V[t];
    d[t] = delta;
    V[t] += p.alpha * delta;
  }
  return d;
}

export function TDLearning(): ReactNode {
  const [running, setRunning] = useState(true);
  const [p, setP] = useState<TDP>({ alpha: 0.1, gamma: 0.95, cue: 4, rew: 13, speed: 6 });
  const [trial, setTrial] = useState(0);
  const [dCue, setDCue] = useState(0);
  const [dRew, setDRew] = useState(0);
  const live = useLive(p);
  live.current = p;

  const V = useRef<Float32Array>(new Float32Array(T));
  const delta = useRef<Float32Array>(new Float32Array(T));
  const trialRef = useRef(0);
  const acc = useRef(0);
  const omitNext = useRef(false);
  const cueHist = useRef<number[]>([]);
  const rewHist = useRef<number[]>([]);

  const [cref, csize] = useCanvas(() => draw());

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    const padX = 34;
    const padTop = 30;
    const padBot = 26;
    const plotW = w - padX * 2;
    const plotH = h - padTop - padBot;
    const slot = plotW / T;
    const bw = Math.max(4, slot * 0.62);
    const mid = padTop + plotH * 0.5; // baseline: V grows up, δ straddles
    const cue = Math.min(live.current.cue, live.current.rew - 1);
    const rew = Math.max(live.current.rew, cue + 1);
    const xAt = (t: number) => padX + slot * (t + 0.5);

    // scales
    let vMax = 0.001;
    let dMax = 0.001;
    for (let t = 0; t < T; t++) {
      if (V.current[t] > vMax) vMax = V.current[t];
      const a = Math.abs(delta.current[t]);
      if (a > dMax) dMax = a;
    }
    vMax = Math.max(vMax, 1.05);
    dMax = Math.max(dMax, 0.5);
    const vScale = (plotH * 0.42) / vMax;
    const dScale = (plotH * 0.42) / dMax;

    // baseline + grid ticks
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0; t <= T; t++) {
      const gx = padX + slot * t;
      ctx.moveTo(gx + 0.5, padTop);
      ctx.lineTo(gx + 0.5, padTop + plotH);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(124,170,228,0.4)";
    ctx.beginPath();
    ctx.moveTo(padX, mid + 0.5);
    ctx.lineTo(padX + plotW, mid + 0.5);
    ctx.stroke();

    // cue / reward column highlights
    const band = (t: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(padX + slot * t, padTop, slot, plotH);
    };
    band(cue, "rgba(124,170,228,0.10)");
    band(rew, "rgba(255,122,69,0.10)");

    // V[t] bars — blue, growing upward from baseline
    for (let t = 0; t < T; t++) {
      const vh = V.current[t] * vScale;
      if (vh <= 0.2) continue;
      ctx.fillStyle = "rgba(124,170,228,0.55)";
      ctx.fillRect(xAt(t) - bw / 2, mid - vh, bw, vh);
    }

    // δ[t] bars — accent "dopamine", ± about baseline
    for (let t = 0; t < T; t++) {
      const dh = delta.current[t] * dScale;
      if (Math.abs(dh) < 0.4) continue;
      ctx.fillStyle = dh >= 0 ? "var(--accent-2)" : "rgba(255,90,90,0.9)";
      const x = xAt(t) - bw / 2 + bw * 0.18;
      const ww = bw * 0.64;
      if (dh >= 0) ctx.fillRect(x, mid - dh, ww, dh);
      else ctx.fillRect(x, mid, ww, -dh);
    }

    // axis labels
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232,241,255,0.5)";
    ctx.fillText("V", padX + 8, mid - plotH * 0.5 + 4);
    ctx.textBaseline = "alphabetic";

    // cue / reward tick labels
    const tick = (t: number, label: string, col: string) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xAt(t), padTop + plotH);
      ctx.lineTo(xAt(t), padTop + plotH + 6);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(label, xAt(t), padTop + plotH + 18);
    };
    tick(cue, "CUE", "rgba(160,200,255,0.95)");
    tick(rew, "REWARD", "var(--accent-2)");

    // moving marker for the current step mid-trial
    const cur = Math.floor((acc.current / Math.max(1, 1000 / live.current.speed)) * T);
    if (running && cur >= 0 && cur < T) {
      ctx.fillStyle = "rgba(232,241,255,0.85)";
      ctx.beginPath();
      ctx.arc(xAt(cur), padTop - 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function reset() {
    V.current = new Float32Array(T);
    delta.current = new Float32Array(T);
    trialRef.current = 0;
    omitNext.current = false;
    cueHist.current = [];
    rewHist.current = [];
    acc.current = 0;
    setTrial(0);
    setDCue(0);
    setDRew(0);
    draw();
  }

  function commitTrial() {
    const pp = live.current;
    const omit = omitNext.current;
    omitNext.current = false;
    delta.current = runTrial(V.current, pp, omit);
    trialRef.current++;
    const cue = Math.min(pp.cue, pp.rew - 1);
    const rew = Math.max(pp.rew, cue + 1);
    const dc = delta.current[cue];
    const dr = delta.current[rew];
    cueHist.current.push(dc);
    rewHist.current.push(dr);
    if (cueHist.current.length > 160) cueHist.current.shift();
    if (rewHist.current.length > 160) rewHist.current.shift();
    setTrial(trialRef.current);
    setDCue(dc);
    setDRew(dr);
  }

  useRAF((dt) => {
    if (!running) return;
    acc.current += dt;
    const interval = 1000 / live.current.speed;
    while (acc.current >= interval) {
      acc.current -= interval;
      commitTrial();
    }
    draw(); // every frame: advances the trial-progress marker too
  }, true);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // shift δ series positive so MiniPlot (which clips negatives) reads cleanly
  const span = 1.6;
  const cueP = cueHist.current.map((v) => Math.max(0, v + span * 0.5));
  const rewP = rewHist.current.map((v) => Math.max(0, v + span * 0.5));

  return (
    <SimLayout
      stage={<canvas ref={cref} />}
      transport={
        <Transport
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onReset={reset}
        >
          <Btn
            onClick={() => {
              if (!running) {
                commitTrial();
                draw();
              }
            }}
            disabled={running}
          >
            Trial ›
          </Btn>
          <Btn
            accent
            onClick={() => {
              omitNext.current = true;
              if (!running) {
                commitTrial();
                draw();
              }
            }}
            title="Skip the next reward — watch δ dip below baseline"
          >
            Omit reward
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">δ shifts cue&#8202;←&#8202;reward</span>
        </Transport>
      }
      controls={
        <>
          <Group title="Learning">
            <Slider
              label="α rate"
              value={p.alpha}
              min={0.02}
              max={0.6}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, alpha: v }))}
            />
            <Slider
              label="γ discount"
              value={p.gamma}
              min={0.8}
              max={1}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => setP((o) => ({ ...o, gamma: v }))}
            />
          </Group>
          <Group title="Timeline">
            <Slider
              label="Cue time"
              value={p.cue}
              min={1}
              max={T - 2}
              step={1}
              onChange={(v) =>
                setP((o) => ({ ...o, cue: Math.min(v, o.rew - 1) }))
              }
            />
            <Slider
              label="Reward time"
              value={p.rew}
              min={2}
              max={T - 1}
              step={1}
              onChange={(v) =>
                setP((o) => ({ ...o, rew: Math.max(v, o.cue + 1) }))
              }
            />
            <Slider
              label="Speed"
              value={p.speed}
              min={1}
              max={20}
              step={1}
              unit=" tr/s"
              onChange={(v) => setP((o) => ({ ...o, speed: v }))}
            />
          </Group>
          <Group title="Prediction error">
            <MiniPlot
              series={[
                { data: rewP, color: "var(--accent-2)", fill: "rgba(255,122,69,0.10)" },
                { data: cueP, color: "rgba(160,200,255,0.95)" },
              ]}
              max={span}
              height={84}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut k="Trial" v={trial} />
          <ReadOut k="δ at cue" v={dCue.toFixed(2)} color="rgba(160,200,255,0.95)" />
          <ReadOut k="δ at reward" v={dRew.toFixed(2)} color="var(--accent-2)" />
        </>
      }
      footnote={
        <span>
          The TD error δ&#8202;=&#8202;r&#8202;+&#8202;γV(s′)&#8202;−&#8202;V(s)
          behaves like phasic dopamine (Montague–Dayan–Sejnowski 1996;
          Schultz–Dayan–Montague 1997): as the cue is learned the burst shifts
          from the reward to the predictive cue, and an omitted reward drives δ
          below baseline.
        </span>
      }
    />
  );
}

export function TDLearningThumb(): ReactNode {
  const V = useRef<Float32Array>(new Float32Array(T));
  const delta = useRef<Float32Array>(new Float32Array(T));
  const acc = useRef(0);
  const trialN = useRef(0);
  const P: TDP = { alpha: 0.18, gamma: 0.96, cue: 3, rew: 12, speed: 1 };
  const [cref, csize] = useCanvas();

  useRAF((dt) => {
    acc.current += dt;
    if (acc.current > 220) {
      acc.current = 0;
      delta.current = runTrial(V.current, P, false);
      trialN.current++;
      if (trialN.current > 60) {
        V.current = new Float32Array(T);
        delta.current = new Float32Array(T);
        trialN.current = 0;
      }
    }
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    ctx.clearRect(0, 0, w, h);
    const slot = w / T;
    const bw = Math.max(2, slot * 0.6);
    const mid = h * 0.54;
    let vMax = 1.05;
    let dMax = 0.5;
    for (let t = 0; t < T; t++) {
      if (V.current[t] > vMax) vMax = V.current[t];
      const a = Math.abs(delta.current[t]);
      if (a > dMax) dMax = a;
    }
    const vScale = (h * 0.4) / vMax;
    const dScale = (h * 0.42) / dMax;
    for (let t = 0; t < T; t++) {
      const x = slot * (t + 0.5);
      const vh = V.current[t] * vScale;
      if (vh > 0.2) {
        ctx.fillStyle = "rgba(124,170,228,0.45)";
        ctx.fillRect(x - bw / 2, mid - vh, bw, vh);
      }
      const dh = delta.current[t] * dScale;
      if (Math.abs(dh) > 0.4) {
        ctx.fillStyle = dh >= 0 ? "rgba(255,122,69,0.95)" : "rgba(255,90,90,0.9)";
        if (dh >= 0) ctx.fillRect(x - bw * 0.3, mid - dh, bw * 0.6, dh);
        else ctx.fillRect(x - bw * 0.3, mid, bw * 0.6, -dh);
      }
    }
  }, true);

  return <canvas ref={cref} />;
}
