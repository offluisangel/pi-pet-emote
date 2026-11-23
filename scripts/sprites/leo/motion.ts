import { Canvas, text } from "../canvas.ts";

type Palette = Record<string, string>;

/** Cat gestures layered over the exact approved drawing, never Mafe's face. */
export function render(base: Canvas, tail: Canvas, foreground: Canvas, p: Palette,
  state: string, name: string, n: number): Canvas {
  let c = new Canvas(48, 40);
  c.data.set(base.data);
  const ink = "#758498", paper = "#f0e8d8", gold = "#f3d281";
  const blue = "#617d9b", mint = "#a6d9c3", red = "#ed8a86";
  const line = (x: number, y: number, xx: number, yy: number, color = p.edge!) => c.line(x, y, xx, yy, color);
  const paw = (x: number, y: number) => {
    c.disc(x, y, 3, p.edge!);
    c.disc(x, y - 1, 2, p.white!);
    c.set(x - 1, y + 1, p.cream!);
    c.set(x + 1, y + 1, p.cream!);
  };
  const eyes = (mode = "open", look = 0) => {
    for (const x of [16, 27]) {
      c.rect(x - 1, 16, 5, 3, p.orange!);
      if (mode === "closed") c.rect(x, 18, 3, 1, p.edge!);
      else if (mode === "happy") c.path([[x - 1, 18], [x + 1, 16], [x + 3, 18]], p.edge!);
      else {
        // Keep the original 5x3 almond outline even when looking aside.
        c.rect(x, 16, 3, 1, p.edge!);
        c.rect(x - 1, 17, 5, 1, p.edge!);
        c.rect(x, 18, 3, 1, p.edge!);
        c.rect(x, 17, 3, 1, p.eye!);
        c.set(x + 1 + look, 17, p.pupil!);
        c.set(x + (look === -1 ? 2 : 0), 17, "#edf0bb");
      }
    }
  };
  const mouth = (level: number) => {
    c.rect(21, 23, 6, 3, p.white!);
    if (!level) c.path([[22, 24], [23, 25], [24, 24]], p.edge!);
    else {
      c.rect(22, 23, 3, level, p.edge!);
      c.rect(23, 24, 1, Math.max(1, level - 1), p.pink!);
    }
  };
  const sway = (direction: number) => {
    c.data.fill(0);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) {
      const color = tail.get(x, y);
      if (color) c.set(x + (y < 30 ? direction : 0), y, color);
    }
    c.stamp(foreground, 0, 0);
  };
  const move = (dx: number, dy: number) => {
    const moved = new Canvas(48, 40);
    moved.stamp(c, dx, dy);
    c = moved;
  };
  const star = (x: number, y: number, color = gold) => {
    c.rect(x, y - 2, 1, 5, color);
    c.rect(x - 2, y, 5, 1, color);
  };
  const heart = (x: number, y: number) => {
    c.blit([".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."], x, y, { "#": p.pink! });
    c.set(x + 1, y + 1, p.white!);
  };
  const page = () => {
    c.rect(12, 31, 22, 8, p.edge!);
    c.rect(13, 32, 20, 6, paper);
    c.rect(16, 33, 12, 1, ink);
    c.rect(16, 35, 9, 1, ink);
  };
  const badge = (ok: boolean) => {
    c.disc(40, 32, 5, blue);
    if (ok) c.path([[37, 32], [39, 34], [43, 29]], mint, 2);
    else {
      c.line(38, 30, 42, 34, red, 2);
      c.line(42, 30, 38, 34, red, 2);
    }
  };

  switch (state) {
    case "idle":
      if (name.includes("blink")) eyes("closed");
      break;
    case "hi":
      if (name.startsWith("in_")) {
        // A feline spring into view; the six arrival frames never loop.
        move([-7, -5, -3, -1, 0, 0][n]!, [0, -2, -3, -2, -1, 0][n]!);
        paw(39, 18 + n * 2);
      } else {
        sway(n % 2 ? 1 : -1);
        eyes("happy");
        paw(39, 18 + n % 2 * 5);
      }
      break;
    case "talk":
      mouth({ "talk_close.png": 0, "talk_small.png": 1, "talk_mid.png": 2, "talk_wide.png": 3 }[name]!);
      break;
    case "think":
      eyes("open", n ? 1 : -1);
      paw(29, 24 + n);
      c.disc(40, 10 - n, 1, paper);
      c.disc(43, 5 - n, 2, paper);
      break;
    case "ask":
      eyes("open", n ? 1 : 0);
      paw(8, 27 - n * 3);
      text(c, "?", 41, 3 + n, gold);
      break;
    case "read":
      eyes("open", n - 1);
      c.path([[10, 30], [23, 32], [25, 32], [38, 30], [38, 37], [24, 39], [10, 37], [10, 30]], blue, 2);
      c.rect(12, 32, 11, 5, paper);
      c.rect(25, 32, 11, 5, p.cream!);
      for (const y of [33, 35]) {
        line(14, y, 21, y + 1, ink);
        line(27, y + 1, 34, y, ink);
      }
      line(23 + n, 32, 23 + n, 38, gold);
      paw(10, 34); paw(38, 34);
      break;
    case "write": {
      eyes("open", n % 2);
      page();
      const x = 20 + n * 3;
      line(x, 35, x + 5, 27, gold);
      line(x, 35, x + 1, 34);
      paw(x + 4, 29);
      c.rect(16, 37, 2 + n * 3, 1, ink);
      break;
    }
    case "tool": {
      eyes("open", 1);
      const x = 38 + (n === 1 ? 2 : 0), y = 25 + n;
      c.rect(x, y, 2, 11, ink);
      c.path([[x - 2, y - 4], [x - 2, y], [x + 3, y], [x + 3, y - 4]], ink, 2);
      paw(x - 2, 31 + n);
      break;
    }
    case "success":
      sway(n ? 1 : -1); eyes("happy"); mouth(1);
      paw(7, 23 - n * 3); paw(39, 23 - n * 3);
      star(4, 10 + n * 3); star(43, 9 - n * 3); badge(true);
      break;
    case "failure":
      eyes("closed");
      // A drooping whisker and falling tear, not a recolored success pose.
      c.path([[12, 22], [8, 23 + n]], p.cream!);
      c.rect(31, 20 + n * 2, 1, 3, mint);
      paw(18, 29 + n); badge(false);
      break;
    case "compact":
      eyes("open", n === 1 ? -1 : 0);
      for (let j = 0; j < 3; j++) {
        c.rect(14 + j * (5 - n * 2), 32 + j * 2, 13, 2, j % 2 ? ink : paper);
      }
      paw(10 + n, 33); paw(37 - n, 33);
      break;
    case "grandma":
      eyes("closed");
      // Leo kneads a blanket before settling down, rather than becoming a person.
      c.rect(9, 34, 30, 5, blue);
      for (let x = 11; x < 38; x += 4) c.rect(x, 35, 2, 3, mint);
      if (name.startsWith("in_")) {
        paw(18, 32 + n % 2); paw(29, 33 - n % 2);
        c.rect(11 + n * 8, 37, 5, 1, paper);
      } else {
        paw(18, 34); paw(29, 34);
        text(c, "Z", 40, 5 + n % 2 * 2, paper);
      }
      break;
    case "bye":
      sway(n % 2 ? 1 : -1); eyes("happy");
      paw(39, 20 + n % 2 * 4); heart(1, 3 + n * 2);
      if (name.startsWith("in_")) mouth(n % 2 + 1);
      break;
    case "delegate":
      eyes("open", n - 1);
      // Passing little task envelopes outward with a white cat paw.
      for (let j = 0; j <= n; j++) {
        const x = 2 + j * 5;
        c.rect(x, 31, 5, 4, paper);
        c.path([[x, 31], [x + 2, 33], [x + 4, 31]], ink);
      }
      paw(9 + n * 3, 28 + n);
      break;
    case "jobs":
      eyes(n === 1 ? "closed" : "open");
      c.disc(40, 32, 6, blue); c.disc(40, 32, 4, paper);
      line(40, 32, 40, 29, ink);
      line(40, 32, [37, 42, 40][n]!, [33, 34, 35][n]!, ink);
      paw(33, 34 - n);
      break;
    case "remember":
      eyes(n ? "closed" : "open");
      heart(1, 4 + n * 2); paw(27, 29 - n);
      break;
    case "yolo":
    case "super-yolo":
      sway(n ? 1 : -1); eyes(n ? "closed" : "happy"); mouth(2);
      paw(7, 21 - n * 2); paw(39, 21 + n * 2);
      star(4, 8 + n * 2);
      if (state === "super-yolo") {
        // A tiny rocket beside the cat: exuberance without changing its face.
        c.path([[40, 13], [43, 7], [46, 13], [46, 22], [40, 22], [40, 13]], blue);
        c.rect(41, 13, 5, 8, paper); c.disc(43, 16, 1, mint);
        c.path([[41, 23], [43, 27 + n * 3], [45, 23]], gold, 2);
        star(5, 28 - n * 3, mint);
      } else star(43, 8 - n * 2);
      break;
    case "explore": {
      eyes("open", n - 1);
      const x = 36 + n;
      c.disc(x, 27, 5, gold); c.disc(x, 27, 3, mint);
      c.ring(x, 27, 2, blue); c.set(x - 1, 25, paper);
      c.line(x - 3, 31, x - 6, 36, gold, 2); paw(x - 5, 33);
      break;
    }
    case "build":
      eyes("open", 1);
      for (let j = 0; j <= n; j++) {
        c.rect(34 + j % 2 * 3, 36 - j * 3, 8, 3, p.stripe!);
        c.rect(35 + j % 2 * 3, 36 - j * 3, 6, 1, gold);
      }
      paw(36, 27 + n * 2);
      break;
    case "verify":
      eyes("open", 1); page(); badge(name !== "fail.png");
      if (name === "fail.png") eyes("closed");
      else {
        c.rect(15, 32 + n, 14, 1, mint);
        paw(9, 30 + n);
      }
      break;
    case "judge":
      eyes(n ? "closed" : "open");
      c.rect(38, 26 + n * 3, 2, 9, p.stripe!);
      c.rect(35, 24 + n * 3, 8, 4, p.edge!);
      c.rect(36, 24 + n * 3, 6, 2, gold);
      c.rect(34, 37, 11, 2, p.edge!); paw(34, 30 + n);
      break;
    case "review":
      eyes("open", n % 2 ? -1 : 0); page();
      c.rect(16, 33 + n, 11, 1, red); paw(33, 30 + n % 2);
      break;
    case "jira":
      eyes("open", n - 1);
      for (let j = 0; j < 3; j++) {
        c.rect(10 + j * 9, 32, 8, 7, blue);
        c.rect(11 + j * 9, 33, 6, 2, j === n ? gold : paper);
      }
      paw(13 + n * 9, 30);
      break;
    default: throw new Error(`Unknown Leo state: ${state}`);
  }
  return c;
}
