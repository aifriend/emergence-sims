import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "An elementary cellular automaton is the simplest computer that still does something: a 1-D row of black/white cells where every cell's next state depends only on itself and its two neighbours. The entire universe of behaviour is indexed by a single integer 0–255 — the 'rule' — whose eight bits spell out the output for each of the eight possible three-cell neighbourhoods. Despite that triviality, the rules span Wolfram's four classes from dull to fractal to chaotic, and Rule 110 was proven Turing-complete: it can, in principle, compute anything any computer can. Each new generation is drawn below the last, so the canvas is a spacetime diagram of the row's whole history.",
  controls: [
    {
      label: "Rule",
      tip: "The rule number 0–255 that defines the automaton — its 8 bits are the next-state outputs for the 8 neighbourhood patterns. Sweeping it walks you through Wolfram's classes: most rules die out or repeat (class I/II), but a few like 30, 90, 110 and 184 produce fractals, chaos or gliders.",
    },
    {
      label: "Speed",
      tip: "How many new rows (generations) are computed per second (1–60). Slow it right down to watch a single row beget the next one cell at a time; crank it up to let the full spacetime pattern paint almost instantly.",
    },
    {
      label: "Seed",
      tip: "Single starts from one lone live cell at the centre of an otherwise empty row — the classic seed that reveals a rule's signature fractal. Random fills the first row with coin-flip noise instead, which exposes how the same rule behaves on generic input (e.g. Rule 184's traffic jams, or Rule 30's persistent chaos). Switching re-seeds immediately.",
    },
  ],
  watch:
    "Hit the 30 / 90 / 110 / 184 preset buttons to jump to the famous rules. Rule 90 draws a perfect Sierpinski triangle from the single seed — pure XOR of its neighbours. Rule 30 dissolves into chaos so structureless that Mathematica used its centre column as a random-number generator. Rule 110 is the prize: a froth of triangles with little 'gliders' drifting and colliding through them — the collisions are what make it a universal computer. Reset re-seeds and clears the history; pause and use Step › to advance one generation at a time.",
};

export default explain;
