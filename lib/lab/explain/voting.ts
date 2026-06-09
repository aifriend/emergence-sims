import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "The Voting Machine makes social-choice theory tangible. Voters are dots in a 2-D issue space (economic L→R, social ↑); each ranks the candidates A–E by proximity, producing a full ranked ballot from pure geometry. Those identical ballots are then tallied four different ways — Plurality, Borda, Condorcet, IRV — and the winner changes with the counting rule. The lesson: the rule is not a neutral pipe. A candidate the majority dislikes can win, a near-clone can spoil, and pairwise majorities can cycle with no winner at all — Arrow's 1951 impossibility theorem, made draggable.",
  controls: [
    {
      label: "Plurality / Borda / Condorcet / IRV",
      tip: "The star control — switches how the same ballots are counted. Plurality counts only first choices; Borda gives positional points (rewards broad acceptability); Condorcet seeks the candidate who beats every other head-to-head (and may find none); IRV repeatedly eliminates the lowest and transfers votes. Cycle through all four on a contested layout and watch the ringed winner jump between candidates.",
    },
    {
      label: "Voters",
      tip: "Size of the voter cloud (50–600). Drop it to 50 and exact ties get common — you'll see the Winner readout flag \"(tie→A-side)\" as the deterministic lowest-index tie-break kicks in. Raise it to 600 to smooth the favour regions and make ties rare. Use Reseed voters to re-roll a fresh random electorate at this size.",
    },
    {
      label: "Candidates",
      tip: "Number of candidates on the map (2–5). Keep it at 3 — the minimum needed to produce a Condorcet cycle or a spoiler. Bump to 4–5 to crowd the space and make the four methods disagree more often. The default 3-candidate seed already plants a near-clone of A on the left to demonstrate vote-splitting.",
    },
    {
      label: "Reseed voters",
      tip: "Throws a brand-new uniform random voter cloud while keeping the candidates fixed. Press it repeatedly under Plurality to see how much the winner depends on the luck of the electorate draw versus the candidate geometry.",
    },
    {
      label: "Reset candidates",
      tip: "Snaps the candidates back to the built-in starting layout — a deliberate spoiler setup with two near-clones splitting the left bloc. Use it to return to a known disagreement after you've dragged candidates around, then switch methods to compare.",
    },
    {
      label: "Drag a candidate to move it",
      tip: "Click and drag any candidate marker across the issue space; all four tallies recompute live (no clock). Drag the near-clone B right on top of A under Plurality and watch them split the left and hand victory to the right-side candidate — then switch to Condorcet/Borda and see the spoiler effect vanish.",
    },
  ],
  watch:
    "The orange ring marks the winner under the selected method; voter dots are tinted by the candidate they currently favour, so dragging slides the Voronoi-like favour regions. The \"Condorcet winner\" readout shows the head-to-head champion, or a literal \"cycle A→B→C→A\" when pairwise majorities are intransitive — the paradox you can see. \"Agreement\" tells you whether the selected method matches the Condorcet winner: a ✗ (spoiler) means the counting rule, not the electorate, picked the winner.",
};

export default explain;
