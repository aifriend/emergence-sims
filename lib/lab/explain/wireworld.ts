import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Wireworld (Brian Silverman, 1987) is a four-state cellular automaton — empty, conductor (wire), and the two halves of a moving electron (head then tail) — that is expressive enough to run real digital logic. Three tiny rules govern it: a head becomes a tail, a tail becomes wire, and a wire turns into a head only when exactly one or two of its eight neighbours are heads. That single condition makes electrons flow along wires like current, and from wires you can build diodes, logic gates, memory, and even a complete Turing-complete computer. The scenes here are closed wire loops carrying one electron each, so they tick forever as clocks of different periods.",
  controls: [
    {
      label: "Small ring",
      tip: "Loads a tight rectangular loop of wire carrying a single electron. With the shortest perimeter it has the shortest period, so the head whips around fastest — the clearest place to watch the head→tail→wire wave chase itself.",
    },
    {
      label: "Large ring",
      tip: "A bigger loop with the same single electron. The longer the wire, the longer the lap, so this clock ticks noticeably slower than the small ring — the period is just the number of wire cells in the ring.",
    },
    {
      label: "Twin rings",
      tip: "Two separate loops side by side with electrons launched in opposite directions, so the two clocks run out of phase. Use it to see that each loop is its own independent oscillator with no interaction between them.",
    },
    {
      label: "Speed",
      tip: "Generations computed per second (1–40 steps/s). Drop it to 1 to step the electron cell-by-cell and read the rule directly — head ahead, tail behind, wire everywhere else; push it to 40 to watch the loops blur into steady ticking clocks.",
    },
    {
      label: "Step ›",
      tip: "Advances exactly one generation; enabled only while paused. Pause, then tap it to apply the four state rules one frame at a time — the cleanest way to confirm a head only ignites a wire cell with one or two head-neighbours.",
    },
  ],
  watch:
    "Watch the electrons circulate the loops as perpetual clocks: a bright white head leads, an orange tail trails one cell behind, and the dim blue wire is otherwise inert. Because each loop's period equals its length, the rings of different sizes tick at different rates and drift in and out of step. The Heads readout counts live electron heads (it briefly doubles at the corners, where the conductor is momentarily wide). Best of all, click empty cells to lay your own wire — cells cycle empty → wire → head → tail → empty — then close a loop, drop a head onto it, and press play to build a clock of your own.",
};

export default explain;
