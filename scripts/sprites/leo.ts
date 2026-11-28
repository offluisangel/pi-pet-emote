// Rebuild only Leo: node scripts/sprites/leo.ts [output-directory [contact-sheet-path]].
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Canvas } from "./canvas.ts";
import { idle } from "./leo/idle.ts";
import { render } from "./leo/motion.ts";

const out = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("../../emotes/leo/", import.meta.url));
const contract = JSON.parse(readFileSync(new URL("./frames.json", import.meta.url), "utf8"));
function emit(path: string, bytes: Buffer) {
  if (!existsSync(path) || !readFileSync(path).equals(bytes)) writeFileSync(path, bytes);
}
// One row per state, contract order, all frames at 3x nearest-neighbor scale.
const sheet = new Canvas(8 * 48 * 3, 24 * 40 * 3);
sheet.rect(0, 0, sheet.width, sheet.height, "#242630");
let row = 0, count = 0;
for (const [state, names] of Object.entries(contract.frames) as [string, string[]][]) {
  mkdirSync(`${out}/${state}`, { recursive: true });
  names.forEach((name, index) => {
    const frame = state === "idle" ? idle(name === "idle_blink.png") : render(state, name, index);
    emit(`${out}/${state}/${name}`, frame.toPng());
    sheet.scaled(frame, index * 48 * 3, row * 40 * 3, 3);
    count++;
  });
  row++;
}
emit(`${out}/emotes.json`, Buffer.from(JSON.stringify(contract.emotes, null, 2) + "\n"));
const sheetPath = process.argv[3] ? resolve(process.argv[3])
  : !process.argv[2] ? fileURLToPath(new URL("../../docs/leo/contact-sheet.png", import.meta.url)) : undefined;
if (sheetPath) {
  mkdirSync(dirname(sheetPath), { recursive: true });
  emit(sheetPath, sheet.toPng());
}
console.log(`Leo sprites: ${count} frames, ${row} states (48x40 RGBA)`);
