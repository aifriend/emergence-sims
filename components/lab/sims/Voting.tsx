"use client";

/* The Voting Machine — spatial social choice & Arrow's paradox.
 * Voters are points in a 2D issue space; each ranks the candidates by ascending
 * distance (nearest = favourite). The SAME ballots are then tallied four ways —
 * Plurality, Borda, Condorcet, IRV — and the winner changes with the method.
 * Drag a candidate to slide the favour regions and flip the result live. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCanvas, useLive, useRAF } from "../hooks";
import { Btn, Group, ReadOut, Slider, SimLayout, Toggle } from "../controls";

type Method = "plurality" | "borda" | "condorcet" | "irv";
type Pt = { x: number; y: number }; // issue space, both in [0,1]

const CNAMES = ["A", "B", "C", "D", "E"] as const;
// distinct, blueprint-friendly hues for the candidate markers
const CCOL = ["#9fd0ff", "#ff7a1a", "#5ee0b0", "#d98cff", "#ffd166"] as const;

type VoteP = { method: Method; voters: number; cands: number };

/** uniform random voter cloud in the unit square */
function seedVoters(n: number): Pt[] {
  const v: Pt[] = [];
  for (let i = 0; i < n; i++) v.push({ x: Math.random(), y: Math.random() });
  return v;
}

/** a mild starting spread of candidates that already disagrees across methods */
function seedCands(k: number): Pt[] {
  const base: Pt[] = [
    { x: 0.32, y: 0.4 },
    { x: 0.42, y: 0.62 }, // near-clone of A → splits the left bloc (spoiler-ish)
    { x: 0.74, y: 0.5 },
    { x: 0.55, y: 0.24 },
    { x: 0.6, y: 0.8 },
  ];
  return base.slice(0, k).map((p) => ({ ...p }));
}

/** ranked ballots: ballot[i] = candidate indices sorted nearest→farthest */
function buildBallots(voters: Pt[], cands: Pt[]): Uint8Array[] {
  const K = cands.length;
  const out: Uint8Array[] = new Array(voters.length);
  const idx = new Array<number>(K);
  for (let i = 0; i < voters.length; i++) {
    const v = voters[i];
    const d = new Float64Array(K);
    for (let c = 0; c < K; c++) {
      const dx = v.x - cands[c].x,
        dy = v.y - cands[c].y;
      d[c] = dx * dx + dy * dy; // squared distance preserves ordering
      idx[c] = c;
    }
    idx.sort((a, b) => d[a] - d[b]);
    out[i] = Uint8Array.from(idx);
  }
  return out;
}

/** which candidate each voter currently favours (rank-1) — for the Voronoi tint */
function favourites(ballots: Uint8Array[]): Uint8Array {
  const f = new Uint8Array(ballots.length);
  for (let i = 0; i < ballots.length; i++) f[i] = ballots[i][0];
  return f;
}

/** argmax with a deterministic lowest-index tie-break; returns {winner, tie} */
function argmaxTie(score: number[]): { winner: number; tie: boolean } {
  let best = -Infinity,
    win = 0,
    tie = false;
  for (let c = 0; c < score.length; c++) {
    if (score[c] > best) {
      best = score[c];
      win = c;
      tie = false;
    } else if (score[c] === best) {
      tie = true; // a genuine tie at the top, resolved by lowest index
    }
  }
  return { winner: win, tie };
}

function plurality(ballots: Uint8Array[], K: number) {
  const s = new Array(K).fill(0) as number[];
  for (let i = 0; i < ballots.length; i++) s[ballots[i][0]]++;
  return { score: s, ...argmaxTie(s) };
}

function borda(ballots: Uint8Array[], K: number) {
  const s = new Array(K).fill(0) as number[];
  for (let i = 0; i < ballots.length; i++) {
    const b = ballots[i];
    for (let r = 0; r < K; r++) s[b[r]] += K - 1 - r; // first = K−1 … last = 0
  }
  return { score: s, ...argmaxTie(s) };
}

/** pairwise[a*K+b] = #voters preferring a over b */
function pairwise(ballots: Uint8Array[], K: number): Int32Array {
  const m = new Int32Array(K * K);
  for (let i = 0; i < ballots.length; i++) {
    const b = ballots[i];
    for (let r = 0; r < K; r++)
      for (let s = r + 1; s < K; s++) m[b[r] * K + b[s]]++; // b[r] ranked above b[s]
  }
  return m;
}

/** Condorcet winner = beats every other pairwise; may be none (cycle). */
function condorcet(m: Int32Array, K: number): { winner: number; cycle: number[] } {
  for (let a = 0; a < K; a++) {
    let beatsAll = true;
    for (let b = 0; b < K; b++) {
      if (a === b) continue;
      if (m[a * K + b] <= m[b * K + a]) {
        beatsAll = false;
        break;
      }
    }
    if (beatsAll) return { winner: a, cycle: [] };
  }
  // no winner — surface a concrete 3-cycle from the majority tournament
  for (let a = 0; a < K; a++)
    for (let b = 0; b < K; b++) {
      if (a === b || m[a * K + b] <= m[b * K + a]) continue;
      for (let c = 0; c < K; c++) {
        if (c === a || c === b) continue;
        if (m[b * K + c] > m[c * K + b] && m[c * K + a] > m[a * K + c])
          return { winner: -1, cycle: [a, b, c] };
      }
    }
  return { winner: -1, cycle: [] };
}

/** Instant-runoff: recount first-prefs among survivors, drop the lowest, repeat. */
function irv(ballots: Uint8Array[], K: number) {
  const alive = new Array<boolean>(K).fill(true);
  const N = ballots.length;
  let rounds = 0;
  for (;;) {
    rounds++;
    const cnt = new Array(K).fill(0) as number[];
    for (let i = 0; i < N; i++) {
      const b = ballots[i];
      for (let r = 0; r < K; r++)
        if (alive[b[r]]) {
          cnt[b[r]]++;
          break; // top surviving choice
        }
    }
    let aliveN = 0,
      lead = -1,
      leadV = -1,
      low = -1,
      lowV = Infinity;
    for (let c = 0; c < K; c++) {
      if (!alive[c]) continue;
      aliveN++;
      if (cnt[c] > leadV) {
        leadV = cnt[c];
        lead = c;
      }
      if (cnt[c] < lowV) {
        lowV = cnt[c];
        low = c; // lowest index breaks ties (scan order)
      }
    }
    if (leadV > N / 2 || aliveN <= 2)
      return { winner: lead, rounds, score: cnt };
    alive[low] = false; // eliminate, ballots transfer next round
  }
}

type Tally = {
  ballots: Uint8Array[];
  fav: Uint8Array;
  pluralWin: number;
  bordaWin: number;
  irvWin: number;
  condWin: number; // −1 if none
  cycle: number[];
  methodWin: number; // winner under the *selected* method (−1 if cycle)
  methodTie: boolean;
};

function tallyAll(voters: Pt[], cands: Pt[], method: Method): Tally {
  const K = cands.length;
  const ballots = buildBallots(voters, cands);
  const fav = favourites(ballots);
  const pl = plurality(ballots, K);
  const bo = borda(ballots, K);
  const iv = irv(ballots, K);
  const m = pairwise(ballots, K);
  const co = condorcet(m, K);
  let methodWin = pl.winner,
    methodTie = pl.tie;
  if (method === "borda") {
    methodWin = bo.winner;
    methodTie = bo.tie;
  } else if (method === "irv") {
    methodWin = iv.winner;
    methodTie = false;
  } else if (method === "condorcet") {
    methodWin = co.winner;
    methodTie = false;
  }
  return {
    ballots,
    fav,
    pluralWin: pl.winner,
    bordaWin: bo.winner,
    irvWin: iv.winner,
    condWin: co.winner,
    cycle: co.cycle,
    methodWin,
    methodTie,
  };
}

const METHOD_LABEL: Record<Method, string> = {
  plurality: "Plurality",
  borda: "Borda",
  condorcet: "Condorcet",
  irv: "IRV",
};

export function Voting(): ReactNode {
  const [p, setP] = useState<VoteP>({ method: "plurality", voters: 240, cands: 3 });
  const live = useLive(p);
  live.current = p;

  const voters = useRef<Pt[]>(seedVoters(240));
  const cands = useRef<Pt[]>(seedCands(3));
  const tally = useRef<Tally>(tallyAll(voters.current, cands.current, "plurality"));
  const pad = useRef({ x: 0, y: 0, s: 1 }); // square issue-space → canvas mapping
  const drag = useRef(-1); // candidate index being dragged, −1 none
  const [tick, setTick] = useState(0); // bumps to refresh readouts after recompute

  function recompute() {
    tally.current = tallyAll(voters.current, cands.current, live.current.method);
    setTick((t) => t + 1);
  }

  const [cref, csize] = useCanvas((w, h) => {
    const s = Math.min(w, h) - 28;
    pad.current = { x: (w - s) / 2, y: (h - s) / 2, s };
    draw();
  });

  // issue-space [0,1]² → canvas px, and back (for hit-testing the drag)
  const toPx = (q: Pt): Pt => {
    const { x, y, s } = pad.current;
    return { x: x + q.x * s, y: y + q.y * s };
  };
  const toSpace = (px: number, py: number): Pt => {
    const { x, y, s } = pad.current;
    return { x: (px - x) / s, y: (py - y) / s };
  };

  function draw() {
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const { x: ox, y: oy, s } = pad.current;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#061b32";
    ctx.fillRect(0, 0, w, h);

    const t = tally.current;
    const cs = cands.current;
    const K = cs.length;
    const win = t.methodWin;

    // voters, faintly tinted by the candidate they currently favour
    const vs = voters.current;
    for (let i = 0; i < vs.length; i++) {
      const f = t.fav[i];
      const px = ox + vs[i].x * s,
        py = oy + vs[i].y * s;
      ctx.fillStyle = K > 1 ? hexA(CCOL[f], 0.34) : "rgba(232,241,255,0.5)";
      ctx.fillRect(px - 1.1, py - 1.1, 2.2, 2.2);
    }

    // issue-space frame + crosshair grid
    ctx.strokeStyle = "rgba(124,170,228,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let g = 0; g <= 4; g++) {
      const gx = ox + (g / 4) * s,
        gy = oy + (g / 4) * s;
      ctx.moveTo(gx + 0.5, oy);
      ctx.lineTo(gx + 0.5, oy + s);
      ctx.moveTo(ox, gy + 0.5);
      ctx.lineTo(ox + s, gy + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(196,220,255,0.3)";
    ctx.strokeRect(ox + 0.5, oy + 0.5, s, s);

    // candidate markers (winner ringed in accent-2)
    for (let c = 0; c < K; c++) {
      const px = ox + cs[c].x * s,
        py = oy + cs[c].y * s;
      const isWin = c === win;
      if (isWin) {
        ctx.strokeStyle = "var(--accent-2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, 7);
        ctx.stroke();
      }
      ctx.fillStyle = CCOL[c];
      ctx.beginPath();
      ctx.arc(px, py, isWin ? 7 : 6, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#061b32";
      ctx.font = "bold 9px 'IBM Plex Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(CNAMES[c], px, py + 0.5);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // axis labels
    ctx.fillStyle = "rgba(176,203,244,0.5)";
    ctx.font = "9px 'IBM Plex Mono'";
    ctx.fillText("ECONOMIC  L → R", ox + s - 110, oy + s + 14);
    ctx.save();
    ctx.translate(ox - 9, oy + 96);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("SOCIAL →", 0, 0);
    ctx.restore();
  }

  // recompute when the controls change (count, candidate count, or method)
  useEffect(() => {
    const target = p.voters;
    if (voters.current.length !== target) voters.current = seedVoters(target);
    if (cands.current.length !== p.cands) cands.current = seedCands(p.cands);
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.voters, p.cands, p.method]);

  // gentle redraw loop — the "live" feel is from recompute-on-drag, not a clock
  useRAF(() => {
    draw();
  }, true);

  // grab the nearest candidate, then reposition it as the pointer moves
  function grab(e: MouseEvent) {
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const q = toSpace(e.clientX - r.left, e.clientY - r.top);
    let best = -1,
      bd = Infinity;
    const cs = cands.current;
    for (let c = 0; c < cs.length; c++) {
      const dx = cs[c].x - q.x,
        dy = cs[c].y - q.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best >= 0 && bd < 0.04) drag.current = best; // ~0.2 issue-units radius
  }
  function move(e: MouseEvent) {
    if (drag.current < 0) return;
    const cv = cref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const q = toSpace(e.clientX - r.left, e.clientY - r.top);
    cands.current[drag.current] = {
      x: Math.max(0, Math.min(1, q.x)),
      y: Math.max(0, Math.min(1, q.y)),
    };
    recompute();
  }
  const release = () => (drag.current = -1);

  const t = tally.current;
  void tick; // readouts re-render off `tick`
  const condText =
    t.condWin >= 0
      ? CNAMES[t.condWin]
      : t.cycle.length === 3
        ? `cycle ${t.cycle.map((c) => CNAMES[c]).join("→")}→${CNAMES[t.cycle[0]]}`
        : "none";
  const winText =
    t.methodWin >= 0
      ? CNAMES[t.methodWin] + (t.methodTie ? " (tie→A-side)" : "")
      : "no winner";
  const agrees =
    t.condWin >= 0 && t.methodWin >= 0 && t.methodWin === t.condWin;
  const agreeText =
    t.condWin < 0
      ? "—  (no Condorcet winner)"
      : agrees
        ? "matches Condorcet ✓"
        : "disagrees ✗  (spoiler)";

  return (
    <SimLayout
      stage={
        <canvas
          ref={cref}
          style={{ cursor: "grab" }}
          onMouseDown={grab}
          onMouseMove={move}
          onMouseUp={release}
          onMouseLeave={release}
        />
      }
      transport={
        <>
          <Btn onClick={() => ((voters.current = seedVoters(p.voters)), recompute())}>
            Reseed voters
          </Btn>
          <Btn onClick={() => ((cands.current = seedCands(p.cands)), recompute())}>
            Reset candidates
          </Btn>
          <div style={{ flex: 1 }} />
          <span className="label nowrap">Drag a candidate to move it</span>
        </>
      }
      controls={
        <>
          <Group title="Counting method">
            <Toggle
              value={p.method}
              options={[
                { label: "Plurality", value: "plurality" },
                { label: "Borda", value: "borda" },
                { label: "Condorcet", value: "condorcet" },
                { label: "IRV", value: "irv" },
              ]}
              onChange={(v) => setP((o) => ({ ...o, method: v as Method }))}
            />
          </Group>
          <Group title="Electorate">
            <Slider
              label="Voters"
              value={p.voters}
              min={50}
              max={600}
              step={10}
              onChange={(v) => setP((o) => ({ ...o, voters: v }))}
            />
            <Slider
              label="Candidates"
              value={p.cands}
              min={2}
              max={5}
              step={1}
              onChange={(v) => setP((o) => ({ ...o, cands: v }))}
            />
          </Group>
        </>
      }
      readouts={
        <>
          <ReadOut
            k={`Winner · ${METHOD_LABEL[p.method]}`}
            v={winText}
            color="var(--accent-2)"
          />
          <ReadOut k="Condorcet winner" v={condText} />
          <ReadOut k="Agreement" v={agreeText} />
        </>
      }
      footnote={
        <span>
          Same voters, same opinions — only the counting rule changes, and the
          winner changes with it: a candidate the majority dislikes can win,
          a near-clone can spoil, and pairwise majorities can cycle with no
          winner at all. No ranked method escapes every paradox (Arrow 1951).
        </span>
      }
    />
  );
}

/** "#rrggbb" + alpha → rgba() string */
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function VotingThumb(): ReactNode {
  const cands = useMemo<Pt[]>(
    () => [
      { x: 0.3, y: 0.42 },
      { x: 0.46, y: 0.66 },
      { x: 0.72, y: 0.46 },
    ],
    [],
  );
  const voters = useMemo<Pt[]>(() => seedVoters(160), []);
  const fav = useMemo<Uint8Array>(
    () => favourites(buildBallots(voters, cands)),
    [voters, cands],
  );
  const phase = useRef(0);
  const [cref, csize] = useCanvas();

  useRAF((dt) => {
    phase.current += dt / 1000;
    const cv = cref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = csize.current;
    const s = Math.min(w, h);
    const ox = (w - s) / 2,
      oy = (h - s) / 2;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < voters.length; i++) {
      ctx.fillStyle = hexA(CCOL[fav[i]], 0.4);
      ctx.fillRect(ox + voters[i].x * s - 1, oy + voters[i].y * s - 1, 2, 2);
    }
    // candidate C orbits gently so the thumb breathes
    const wink = (Math.sin(phase.current * 1.2) + 1) / 2;
    for (let c = 0; c < cands.length; c++) {
      const px = ox + cands[c].x * s,
        py = oy + cands[c].y * s;
      ctx.fillStyle = CCOL[c];
      ctx.beginPath();
      ctx.arc(px, py, c === 2 ? 4 + wink * 2 : 4, 0, 7);
      ctx.fill();
    }
  }, true);
  return <canvas ref={cref} />;
}
