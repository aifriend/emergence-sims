import type { SimExplain } from "./types";

const explain: SimExplain = {
  about:
    "Two virtual chemicals diffuse across a grid and react: substrate A is steadily fed in while autocatalyst B converts A into more of itself and then decays. This is the Gray–Scott model, Alan Turing's 1952 answer to how a featureless soup grows spots, mazes, and dividing blobs. Because B diffuses slower than A, diffusion — usually a smoothing force — instead destabilizes the uniform state and paints stable patterns, the same maths behind leopard spots and seashell markings.",
  controls: [
    {
      label: "Coral",
      tip: "Preset f=0.0545, k=0.062. Branching, labyrinthine fingers that grow outward without pinching off — start here, then nudge 'Kill  k' down by 0.001 to watch the coral thicken toward a solid maze.",
    },
    {
      label: "Mitosis",
      tip: "Preset f=0.0367, k=0.0649. Blobs that grow, pinch in two, and keep dividing to fill space like cells — the signature Gray–Scott behavior. Reset and inject a single dot to watch one seed replicate across the whole field.",
    },
    {
      label: "Maze",
      tip: "Preset f=0.029, k=0.057. Worming corridors that fill the plane with a fingerprint-like labyrinth. Compare it against Coral: lower feed here makes the fingers connect into closed walls instead of open branches.",
    },
    {
      label: "Spots",
      tip: "Preset f=0.025, k=0.06. Isolated round dots that lock into place and hold position. Once settled, bump 'Feed  f' up toward 0.03 and watch stable spots start to stretch and merge into stripes.",
    },
    {
      label: "Feed  f",
      tip: "Rate (0.01–0.1) at which substrate A is replenished, the star control. Selecting it sets the preset to '—'. Hold k fixed and sweep f slowly: you cross the whole morphology zoo — spots → stripes → coral → mitosis — through one narrow sensitive band.",
    },
    {
      label: "Kill  k",
      tip: "Rate (0.045–0.07) at which autocatalyst B is removed. With f fixed, raising k starves B so patterns shrink toward isolated spots or die out; lowering k lets B spread into connected mazes. (f, k) jointly pick the pattern class.",
    },
    {
      label: "Steps / frame",
      tip: "Solver substeps per rendered frame (1–16); each step changes the field only slightly. Set to 1 to watch a pattern emerge in slow motion; push to 16 to fast-forward thousands of steps and reach the final morphology quickly.",
    },
    {
      label: "Click stage to inject reagent",
      tip: "Click or drag on the canvas to paint a blob of autocatalyst B (the orange reagent). On a blank/dead field this is the spark that ignites the reaction — seed one dot and watch the chosen pattern grow from it.",
    },
  ],
  watch:
    "The orange-on-blueprint texture is the concentration of chemical B; the patterns themselves are the picture. With no seed the uniform A=1, B=0 state does nothing — the reaction needs B>0 to ignite. If values blow up into a flickering checkerboard, the integration went unstable (too many steps for the rates).",
};

export default explain;
