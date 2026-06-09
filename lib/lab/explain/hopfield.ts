import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "A Hopfield network of 256 binary neurons (a 16×16 grid) stores three patterns in a symmetric weight matrix via the Hebbian outer-product rule, carving an energy landscape whose valleys sit at the stored memories. Recall is not a lookup: a corrupted cue is dropped in as the start state, and asynchronous updates set each neuron to the sign of its local field, rolling the state monotonically downhill into the nearest stored memory. It is content-addressable memory — the same 'heal a smudged photo back to the original' trick, done with attractor dynamics.",
  controls: [
    {
      label: "Cross",
      tip: "Load the stored Cross glyph as the cue (then corrupted by the current Noise level). Press play and watch the flipped pixels heal back to the clean cross as the energy falls.",
    },
    {
      label: "Diagonal",
      tip: "Load the stored Diagonal-X glyph as the cue. Useful for testing basins: corrupt it lightly and it returns to Diagonal, but a heavily inverted cue can fall into a different memory's valley.",
    },
    {
      label: "Ring",
      tip: "Load the stored Ring glyph. Try flipping a large contiguous block by clicking cells, then run recall to see whether the network still pulls the state back to the ring or commits to a spurious mix.",
    },
    {
      label: "+ Noise",
      tip: "Flip an extra batch of random pixels on the current state (fraction set by the Noise slider) without reloading. Stack it a few times to push the cue past a basin boundary and watch recall converge to the wrong memory or a spurious state.",
    },
    {
      label: "Noise",
      tip: "Fraction of pixels (0–50%) flipped when a memory is loaded or '+ Noise' is pressed. At 20–30% the network reliably heals back; near 50% the cue is so degraded it may settle into a spurious mixture or the inverted image instead.",
    },
    {
      label: "Speed",
      tip: "Asynchronous neuron updates per second (50–2000). Set it low (~100) to watch individual pixels flip and the energy descend step by step; crank to 2000 to snap to the recalled pattern almost instantly.",
    },
  ],
  watch:
    "White cells are +1 neurons. The 'Energy descent' plot rises here because energy is plotted inverted — under async updates true energy can only fall or stay flat, so a clean monotone climb means it's rolling into a basin. 'Energy' is the live scalar, 'Overlap' is the % match to the closest stored pattern (100% = perfect recall), and the run stops with 'Recalled ✓' once no neuron disagrees with its field (a fixed point).",
};

export default explain;
