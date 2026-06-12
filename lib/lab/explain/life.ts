import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Conway's Game of Life: a grid of cells that are either alive or dead, updated by four rules applied to every cell at once. A live cell survives with 2 or 3 live neighbours and a dead cell is born with exactly 3; everything else dies. From that trivial rule comes startling complexity — still lifes, blinking oscillators, gliders that crawl across the grid, and long-lived chaos — and the system is famously Turing-complete. Conway's B3/S23 is only one of a whole family of birth/survival rules, and you can switch between several here.",
  controls: [
    {
      label: "Speed",
      tip: "Generations computed per second (1–40 gen/s). Drop it to 1 to step through a glider cell-by-cell and see exactly how the four rules move it; push it to 40 to fast-forward a busy field toward its eventual still lifes and oscillators.",
    },
    {
      label: "Rule",
      tip: "The birth/survival rule in Golly 'B…/S…' notation. Life (B3/S23) is Conway's; HighLife (B36/S23) adds a self-replicator; Day & Night (B3678/S34678) is symmetric under swapping live and dead; Seeds (B2/S) has no survival at all — every cell dies each step, so only explosive growth persists. Switch it live and the same soup behaves completely differently.",
    },
    {
      label: "Pattern",
      tip: "Stamps a famous seed onto a cleared grid: a Glider (the smallest spaceship, crawls diagonally), the R-pentomino (5 cells that erupt for 1100+ generations), or the Gosper gun (the first pattern shown to grow forever, firing a glider every 30 steps). The gun only works under the Life rule — select it first.",
    },
    {
      label: "Density",
      tip: "Fraction of cells seeded alive when you randomise (5%–60%). It only takes effect on the next Randomise/reset. Seed near 5% and most cells die out immediately; seed near 60% and overcrowding kills almost everything too — the richest, longest-lived chaos lives around 30%.",
    },
    {
      label: "Randomise",
      tip: "Refills the whole grid with a fresh random seed at the current Density and resets the generation counter. Click it repeatedly at a fixed density to see how wildly different the long-term outcome is from one starting pattern to the next.",
    },
    {
      label: "Clear",
      tip: "Empties the grid to all-dead so you can hand-draw a pattern. Use it before placing a known shape — draw a 3-cell row and press Step › to watch a blinker, or sketch a glider and press play to send it walking across the board.",
    },
    {
      label: "Step ›",
      tip: "Advances exactly one generation; enabled only while paused. Pause, then tap it to apply the rules one frame at a time — the cleanest way to verify births (3 neighbours) and deaths (over/under-crowding) on a pattern you placed yourself.",
    },
    {
      label: "Edge wrap",
      tip: "Chooses the grid topology: Torus wraps the edges so a glider leaving the right side re-enters on the left; Wall treats the border as dead empty space. Send a glider toward an edge and switch between the two to see it either loop forever or sail off and vanish.",
    },
  ],
  watch:
    "Look for structure self-selecting out of noise: motion settles into a 'soup' of stationary still lifes, period-2 blinkers, and the occasional glider drifting diagonally. The Generation readout counts elapsed steps and Live cells tracks the surviving population — watch it crash from the seed then plateau as the field freezes into stable and oscillating debris. You can also click and drag on the grid at any time to paint or erase cells.",
};

export default explain;
