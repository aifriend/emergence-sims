"use client";

/**
 * Blueprint control primitives shared by every Simulation Lab model.
 * Ported from the design bundle's `shell.jsx`.
 */
import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "./hooks";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  fmt,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  fmt?: (v: number) => number | string;
  onChange: (v: number) => void;
}): ReactNode {
  const show = fmt ? fmt(value) : value;
  return (
    <div className="ctl">
      <div className="ctl-top">
        <span className="ctl-name">{label}</span>
        <span className="ctl-val tnum">
          {show}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="bp"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export function Toggle<T extends string | number | boolean>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}): ReactNode {
  return (
    <div className="toggle">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={value === o.value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Btn({
  children,
  accent,
  on,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode;
  accent?: boolean;
  on?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}): ReactNode {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={"btn" + (accent ? " btn-accent" : "") + (on ? " on" : "")}
    >
      {children}
    </button>
  );
}

export function ReadOut({
  k,
  v,
  color,
}: {
  k: string;
  v: ReactNode;
  color?: string;
}): ReactNode {
  return (
    <div className="read">
      <div className="k">{k}</div>
      <div className="v tnum" style={color ? { color } : undefined}>
        {v}
      </div>
    </div>
  );
}

/** control panel section header */
export function Group({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}): ReactNode {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div className="label">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

export type PlotSeries = { data: number[]; color: string; fill?: string };

/** tiny live line/area plot (blueprint) */
export function MiniPlot({
  series,
  height = 96,
  max,
  grid = true,
}: {
  series: PlotSeries[];
  height?: number;
  max?: number;
  grid?: boolean;
}): ReactNode {
  const [ref, sizeRef] = useCanvas();
  const live = useLive({ series, max });
  live.current = { series, max };
  useRAF(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const cur = live.current;
    ctx.clearRect(0, 0, w, h);
    if (grid) {
      ctx.strokeStyle = "rgba(124,170,228,0.14)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= w; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
    }
    let m = cur.max;
    if (!m) {
      m = 1;
      cur.series.forEach((s) =>
        s.data.forEach((v) => {
          if (v > m!) m = v;
        }),
      );
    }
    cur.series.forEach((s) => {
      const d = s.data;
      const n = d.length;
      if (n < 2) return;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        const y = h - (d[i] / m!) * (h - 4) - 2;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = s.fill;
        ctx.fill();
      }
    });
  }, true);
  return <canvas ref={ref} style={{ width: "100%", height }} />;
}

/** standard sim layout: stage (left/top) + control rail (right/bottom) */
export function SimLayout({
  stage,
  transport,
  controls,
  readouts,
  footnote,
}: {
  stage: ReactNode;
  transport?: ReactNode;
  controls: ReactNode;
  readouts?: ReactNode;
  footnote?: ReactNode;
}): ReactNode {
  return (
    <div className="sim-grid fade">
      <div className="sim-stage-col">
        <div className="stage corners" style={{ flex: 1, minHeight: 320 }}>
          {stage}
        </div>
        {transport && <div className="sim-transport">{transport}</div>}
      </div>
      <aside className="sim-rail panel">
        <div className="panel-h">
          <span className="label">Parameters</span>
          <span className="label" style={{ letterSpacing: ".14em" }}>
            CTRL
          </span>
        </div>
        <div className="sim-rail-body">
          {controls}
          {readouts && <div className="sim-readouts">{readouts}</div>}
          {footnote && <div className="sim-foot">{footnote}</div>}
        </div>
      </aside>
    </div>
  );
}

/** transport: play/pause/reset + optional extra controls */
export function Transport({
  running,
  onToggle,
  onReset,
  children,
}: {
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  children?: ReactNode;
}): ReactNode {
  return (
    <Fragment>
      <Btn accent on={running} onClick={onToggle}>
        {running ? <span className="icon-sq" /> : <span className="icon-tri" />}
        {running ? "Running" : "Paused"}
      </Btn>
      <Btn onClick={onReset}>Reset</Btn>
      {children}
    </Fragment>
  );
}

export type { CSSProperties };
