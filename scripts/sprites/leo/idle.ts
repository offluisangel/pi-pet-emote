import { Canvas } from "../canvas.ts";

// Separate portrait plate: a cocked head over a little seated body. The stepped
// fur clusters and offset eyes are drawn at display size, without resampling.
export const fur = {
  O: "#ed9243", L: "#ffbd66", H: "#ffda94", S: "#c46a37", T: "#995132",
  W: "#fff8e9", C: "#eddfcd", D: "#c6afa5", P: "#f0a29c", R: "#bc7075",
  k: "#48363d", i: "#322e36", a: "#a3ab62", g: "#e3c672", h: "#fffdf4",
  V: "#537337", G: "#94cb36", B: "#d3f56d",
};

const eyes = {
  open: [".kkkk.", "kahiik", "kaiiik", ".aggk.", "..kk.."],
  left: [".kkkk.", "khiagk", "kiiagk", ".aggk.", "..kk.."],
  right: [".kkkk.", "kagaih", "kagiik", ".aggk.", "..kk.."],
  down: ["......", ".kkkk.", "kagggk", ".hiik.", "..kk.."],
  blink: ["......", "......", "k....k", ".kkkk.", "......"],
  happy: ["......", "..kk..", ".k..k.", "k....k", "......"],
  stern: ["......", "kk....", ".kkkkk", ".ahigk", "..kk.."],
  worried: ["....kk", "..kk..", "kkagik", ".ahigk", "..kk.."],
} as const;
export type Gaze = keyof typeof eyes;

export function idle(blink: boolean): Canvas {
  return portrait(blink ? "blink" : "open");
}

export function portrait(gaze: Gaze, tailSwing = 0, mouth = -1, wink = false): Canvas {
  const cat = new Canvas(48, 40);
  // Plumed tail, with a pale hooked tip turning back towards the shoulder.
  cat.blit([
    ".....CCC", "....CWWWCC", "....CWWWHHC", ".....CHHHHLL", ".......HLLLO",
    ".......LOOOOS", ".......OSSSSO", "......LOOOSSO", "......LHHLOOO",
    ".....LLHHLOOS", "....LOOOOOST", "...LOSSSOSS", "..LLOOOOSS", "OOOOOOSS", "SSSSST",
  ], 32, 22, fur);
  cat.outline(fur.k);

  if (tailSwing) {
    const plume = new Canvas(48, 40);
    plume.data.set(cat.data);
    cat.data.fill(0);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) {
      cat.set(x + Math.round(tailSwing * Math.max(0, Math.min(1, (32 - y) / 5))), y, plume.get(x, y));
    }
  }

  const body = new Canvas(48, 40);
  body.blit([
    ".....LLLLCCCCC", "....LLOOWWWWWWCO", "...LLOOCWWWWWWWCOO", "..LLOSCWWWWWWWWWOOO",
    "..LOSSCWWWWWWWCWLOOS", ".LLOSSCWCWWWWCCWCOOTS", ".LHLOOCWWCWWCWWWCOOSS",
    "LHLOOOCWWWCWCWWWCOSSS", "LOOTTSCWWWCDCWWWCOOTS", "LOSSOSCWWWCDCWWWCOOSS",
    "COOOOSCWWWCDCWWWCOOSC", "CCCCDDWWWWCDCWWWWCCCC", ".DDDDWWCWWD.DWWCWWDD",
  ], 12, 25, fur);
  body.outline(fur.k);
  cat.stamp(body, 0, 0);

  const head = new Canvas(48, 40);
  head.blit([
    "HL", "HLL", "HLPL", "HLPPL", "LHPPRL", "LHPPRRO", "LHPPRROL", "OHPRRROOL", "OLLLLOOOOL",
  ], 10, 2, fur);
  head.blit([
    "........OL", ".......OHL", "......OHPH", ".....OLPPH", "....OLRPPL", "...OLRRPPL", "..OLSRRPPO", ".OOLSRRPLL", "OOOOOOLLOS",
  ], 24, 5, fur);
  // A broken tabby M either side of the narrow blaze. The orange mask
  // tapers into two white whisker pads, rather than circling the eyes.
  head.blit([
    ".....HLLLLOOO", "...HHLLSTLOOLSOO", "..HHLLLSTTLOOSTOOL", ".HLLLLOSTSLHLOSTOOL",
    ".LLLHLLLOOLWHLOOOOOS", "LLHHHHLLLOOWWHLOOOOOOS", "LOOOOLLLLOOWWWLLLHHLOOS",
    "OSSOOLLLLOHWWWWHLLLHLOOS", "LOOOLLHHHHWWWWWWHHHLLLOS", ".HHHHWWWWWWWWWWWHHLLLOSS",
    "CWWWWWWWWWWWWWWWWWHLOOOOL", ".CWWWWWWWWWWWWWWWWWWCHLO", "..CCWWWWWWWWWWWWWWWWCCCC",
    "...DCWWWWWWWWWWWWWWWWCC", ".....CCCWWWWWWWWWWWCCD", ".......DCCWWWWWWWCCD", "..........DCCCCCCD",
  ], 9, 8, fur);
  head.outline(fur.k);
  head.blit(eyes[gaze], 13, 13, fur);
  head.blit(eyes[wink ? "happy" : gaze], 24, 15, fur);
  head.blit(["PPPR", ".RR.", ".k.."], 19, 19, fur);
  head.set(19, 22, fur.D);
  head.set(21, 22, fur.D);
  if (mouth >= 0) {
    const lips = [["D.k.D", ".D.D."], [".kk.", "..k."], [".kkk.", ".kPk."], ["kkkk", "kPPk", ".RR."]];
    head.blit(lips[mouth]!, 19, 21, fur);
  }
  head.path([[12, 20], [15, 21]], fur.D);
  head.path([[28, 22], [32, 21]], fur.D);
  cat.blit(["VVV", "VBBGGGGGGGGGVV", ".VGGGGGGGGGVV", "...VVVVVVVV"], 17, 24, fur);
  cat.blit(["D", "hC", "DD"], 21, 27, fur);
  cat.stamp(head, 0, 0);
  return cat;
}
