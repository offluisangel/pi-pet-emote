import { Canvas, text } from "../canvas.ts";
import { fur, portrait, type Gaze } from "./idle.ts";

const paper = "#f0e8d8", ink = "#566681", mint = "#a6d9c3", gold = "#f3d281", red = "#ed8a86";

export function render(state: string, name: string, n: number): Canvas {
  const beat = n % 2, scan = (["left", "down", "right"] as const)[n % 3]!;
  const face: Record<string, Gaze> = {
    hi: "happy", bye: "happy", talk: "open", think: beat ? "right" : "left", ask: "worried", read: scan,
    write: "down", tool: "right", success: "happy", failure: "worried", compact: "down",
    grandma: "blink", delegate: "left", jobs: beat ? "blink" : "right", remember: beat ? "blink" : "open",
    yolo: "happy", "super-yolo": "right", explore: scan, build: "down", verify: name === "fail.png" ? "worried" : "down",
    judge: "stern", review: beat ? "stern" : "down", jira: scan,
  };
  const lips = state === "talk" ? ({ "talk_close.png": 0, "talk_small.png": 1, "talk_mid.png": 2, "talk_wide.png": 3 }[name]!)
    : state === "super-yolo" ? 3 : state === "yolo" || state === "bye" ? 1 + beat : state === "success" ? 0 : -1;
  const sways = ["hi", "bye", "success", "yolo", "super-yolo"].includes(state);
  const c = portrait(face[state]!, sways ? (beat ? 2 : -2) : 0, lips, state === "ask" && beat === 1 || state === "yolo" && !beat);
  const paw = (x: number, y: number, shoulder = x < 23 ? 16 : 30) => {
    const arm: [number, number][] = [[shoulder, 30], [Math.round((x + shoulder) / 2), Math.max(30, y + 1)], [x, y]];
    c.path(arm, fur.k, 4); c.path(arm, fur.L, 2);
    c.blit([".kkk.", "kWWWk", "kCWWk", ".kCk."], x - 2, y - 2, fur);
  };
  const heart = (x: number, y: number) => c.blit([".PP.PP.", "PhPPPPP", "PPPPPPR", ".PPPPR.", "..PPR..", "...R..."], x, y, fur);
  const star = (x: number, y: number) => { c.rect(x, y - 2, 1, 5, gold); c.rect(x - 2, y, 5, 1, gold); };
  const page = () => {
    c.rect(12, 31, 22, 8, fur.k); c.rect(13, 32, 20, 6, paper);
    for (const y of [33, 35]) c.rect(16, y, y === 33 ? 12 : 9, 1, ink);
  };
  const badge = (ok: boolean) => {
    c.disc(40, 33, 5, ink);
    if (ok) c.path([[37, 32], [39, 35], [43, 30]], mint, 2);
    else { c.line(38, 31, 42, 35, red, 2); c.line(42, 31, 38, 35, red, 2); }
  };
  switch (state) {
    case "hi":
      if (name.startsWith("in_")) {
        paw(36, 18 + n * 2);
        const hop = new Canvas(48, 40);
        hop.stamp(c, [-7, -5, -3, -1, 0, 0][n]!, [0, -1, -2, -1, 0, 0][n]!);
        return hop;
      }
      paw(36, 19 + beat * 5); break;
    case "bye": paw(11 - beat * 3, 24 - beat * 3); heart(1, 3 + n * 2); break;
    case "talk": break; // Four lip shapes are drawn directly beneath the tilted nose.
    case "ask": paw(9, 26 - n * 3); text(c, "?", 39, 4 + n, gold); break;
    case "think": paw(26, 24 + n); c.disc(36, 12 - n, 1, paper); c.disc(40, 7 - n, 2, paper); break;
    case "read":
      c.path([[9, 30], [22, 32], [25, 32], [38, 30], [38, 37], [24, 39], [9, 37], [9, 30]], ink, 2);
      c.rect(11, 32, 12, 5, paper); c.rect(25, 32, 12, 5, fur.C);
      for (const y of [33, 35]) { c.line(14, y, 21, y + 1, ink); c.line(27, y + 1, 34, y, ink); }
      c.line(23 + n, 32, 24, 38, gold); paw(10, 34); paw(38, 34); break;
    case "write": {
      page(); const x = 19 + n * 3;
      c.line(x, 36, x + 5, 27, gold, 2); c.set(x, 36, fur.k); paw(x + 4, 30, 30);
      c.rect(16, 36, x - 16, 1, ink); break;
    }
    case "tool": {
      const x = 37 + beat * 2, y = 21 + n;
      c.line(x, y + 4, 35, 35, ink, 3); c.path([[x - 2, y], [x - 2, y + 4], [x + 2, y + 4], [x + 3, y]], ink, 2);
      paw(36 + beat, 30 + n); break;
    }
    case "success": paw(10, 22 - n * 3); paw(35, 22 - n * 3); star(4, 11 + n); badge(true); break;
    case "failure": c.rect(28, 20 + n * 2, 2, 3, mint); paw(17, 30 - n * 2); badge(false); break;
    case "compact":
      for (let j = 0; j < 3; j++) c.rect(13 + j * (5 - n * 2), 31 + j * 2, 14, 2, j % 2 ? ink : paper);
      paw(10 + n * 2, 33); paw(38 - n * 3, 33); break;
    case "grandma":
      c.rect(9, 33, 30, 6, ink);
      for (let x = 10; x < 38; x += 4) c.rect(x, 35, 2, 3, mint);
      paw(16 + (name.startsWith("in_") ? n : 0), 32 + beat * 2); paw(30, 34 - beat * 2);
      if (!name.startsWith("in_")) text(c, "Z", 40, 6 - beat * 2, paper); break;
    case "delegate":
      for (let j = 0; j <= n; j++) {
        const x = 13 - 5 * j; c.rect(x, 33, 7, 5, paper); c.path([[x, 33], [x + 3, 36], [x + 6, 33]], ink);
      }
      paw(16 - n * 5, 31); break;
    case "jobs":
      c.disc(39, 33, 6, ink); c.disc(39, 33, 4, paper); c.line(39, 33, 39, 30, ink);
      c.line(39, 33, [36, 42, 39][n]!, [34, 34, 36][n]!, ink); paw(33, 34 - n); break;
    case "remember": heart(2, 4 + n * 2); paw(23, 30 - n, 30); break;
    case "yolo": paw(9, 21 + n * 4); paw(35, 25 - n * 4); star(4, 9 + n); star(42, 8 - n); break;
    case "super-yolo": {
      paw(36, 22 - n * 3); star(5, 10 + n * 3);
      c.blit(["...k...", "..kWk..", ".kWWWk.", ".kWWWk.", ".kBaBk.", ".kWWWk.", "kkWWWkk", "k.kSk.k", "..LHL..", "...L..."], 39, 12 - n * 5, fur); break;
    }
    case "explore": {
      const x = 33 + n * 2, y = 23 - n;
      c.disc(x, y, 5, gold); c.disc(x, y, 3, mint); c.ring(x, y, 2, ink); c.set(x - 1, y - 2, paper);
      c.line(x - 2, y + 4, x - 6, y + 11, gold, 2); paw(x - 4, y + 8); break;
    }
    case "build":
      for (let j = 0; j <= n; j++) {
        const x = 2 + j % 2 * 2, y = 35 - j * 4;
        c.rect(x, y, 10, 4, ink);
        c.rect(x + 1, y + 1, 8, 2, mint);
      }
      paw(10 + beat * 2, 33 - n * 4); break;
    case "verify": page(); badge(name !== "fail.png");
      if (name !== "fail.png") { c.rect(15, 32 + n, 14, 1, mint); paw(12, 31 + n); }
      else paw(16, 24); break;
    case "judge":
      c.rect(37, 24 + n * 5, 2, 9, fur.S); c.rect(34, 23 + n * 5, 9, 4, fur.k); c.rect(35, 23 + n * 5, 7, 2, gold);
      c.rect(33, 37, 11, 2, fur.k); paw(36, 29 + n * 4); break;
    case "review": page(); c.rect(16, 33 + n, 11, 1, red); paw(29 - n, 32 + n); break;
    case "jira":
      for (let j = 0; j < 3; j++) { c.rect(10 + j * 9, 32, 8, 7, ink); c.rect(11 + j * 9, 33, 6, 3, j === n ? gold : paper); }
      paw(13 + n * 9, 31); break;
    default: throw new Error(`Unknown Leo state: ${state}`);
  }
  return c;
}
