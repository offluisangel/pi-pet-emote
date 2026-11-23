// Leo's approved drawing and deterministic full-set builder. Mafe is independent.
// Rebuild: node scripts/sprites/leo.ts [output-directory [contact-sheet-path]].
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { render } from "./leo/motion.ts";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Canvas } from "./canvas.ts";

const c = new Canvas(48, 40);
const p = {
  edge: "#654938", orange: "#e9a453", light: "#f7c47a",
  stripe: "#bd7438", shade: "#d38b43", white: "#fff5df",
  cream: "#e4d7bd", shadow: "#c4b59d", pink: "#e9a59c",
  nose: "#ce827d", eye: "#b5c66a", pupil: "#30372c",
  green: "#79ad45", greenDark: "#47713a", greenLight: "#b0cd69",
};

function polygon(points: Array<[number, number]>, color: string): void {
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]!;
        const [xj, yj] = points[j]!;
        if ((yi > y + 0.5) !== (yj > y + 0.5)
          && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) c.set(x, y, color);
    }
  }
}

// Fluffy upright tail: a recognizable silhouette even at native resolution.
c.path([[33, 35], [39, 33], [41, 28], [40, 23], [38, 21]], p.edge, 6);
c.path([[33, 35], [39, 32], [40, 28], [39, 24], [38, 22]], p.orange, 4);
c.path([[38, 24], [40, 25]], p.stripe, 2);
c.path([[39, 29], [41, 29]], p.stripe, 2);
c.path([[35, 34], [37, 33]], p.light, 2);
// Stepped tufts break up the smooth tail edge without enlarging the canvas.
polygon([[37, 19], [40, 21], [41, 24], [38, 23]], p.edge);
polygon([[38, 21], [40, 23], [38, 22]], p.light);
polygon([[42, 25], [45, 27], [43, 30], [42, 31]], p.edge);
polygon([[41, 26], [44, 27], [42, 30]], p.orange);
polygon([[39, 32], [42, 32], [39, 35], [36, 36]], p.edge);
polygon([[38, 32], [41, 32], [38, 34]], p.light);

const tail = new Canvas(48, 40);
tail.data.set(c.data);
c.data.fill(0);

// Orange flanks, white bib, and white front legs.
polygon([[17, 23], [29, 23], [33, 28], [35, 36], [32, 39], [14, 39], [12, 36], [14, 28]], p.edge);
polygon([[17, 24], [28, 24], [32, 28], [34, 36], [31, 38], [15, 38], [13, 36], [15, 28]], p.orange);
polygon([[19, 25], [27, 25], [29, 30], [28, 37], [18, 37], [17, 30]], p.cream);
polygon([[20, 25], [26, 25], [28, 30], [26, 34], [20, 35], [18, 30]], p.white);
c.path([[14, 31], [17, 32]], p.stripe, 2);
c.path([[30, 29], [32, 30]], p.stripe, 2);
c.rect(18, 32, 4, 6, p.white);
c.rect(25, 32, 4, 6, p.white);
c.rect(22, 34, 1, 4, p.shadow);
c.rect(24, 34, 1, 4, p.cream);
c.rect(15, 37, 7, 1, p.cream);
c.rect(25, 37, 7, 1, p.cream);
c.set(18, 37, p.shadow);
c.set(28, 37, p.shadow);

// Layered chest and shoulder tufts, rather than a flat rectangular bib.
polygon([[15, 26], [13, 27], [14, 30], [11, 29], [13, 33], [16, 34], [18, 29]], p.edge);
polygon([[15, 27], [14, 28], [16, 31], [13, 30], [15, 33], [17, 30]], p.light);
polygon([[30, 26], [33, 27], [32, 30], [35, 29], [33, 33], [30, 34], [28, 29]], p.edge);
polygon([[30, 27], [32, 28], [30, 31], [33, 30], [31, 33], [29, 30]], p.orange);
polygon([[18, 28], [21, 29], [23, 28], [26, 29], [29, 28], [28, 32], [26, 31], [25, 35], [23, 33], [21, 35], [20, 32], [18, 33], [19, 30]], p.white);
c.path([[18, 29], [19, 31]], p.cream);
c.path([[27, 30], [26, 32]], p.cream);

// Tall triangular ears distinguish Leo from Mafe's floppy ears.
polygon([[10, 15], [10, 2], [13, 3], [20, 10], [28, 10], [35, 2], [37, 2], [36, 17]], p.edge);
polygon([[11, 13], [11, 4], [18, 10], [29, 11], [35, 4], [36, 4], [35, 15]], p.orange);
polygon([[12, 6], [12, 12], [17, 12]], p.pink);
polygon([[34, 6], [30, 12], [35, 12]], p.pink);
c.set(12, 5, p.white);
c.set(35, 5, p.light);

// Broad cheeks with a narrower feline chin and white central blaze.
polygon([[16, 8], [30, 8], [35, 12], [37, 18], [35, 23], [29, 27], [18, 27], [12, 23], [10, 18], [12, 12]], p.edge);
polygon([[16, 9], [30, 9], [34, 12], [36, 18], [34, 22], [29, 26], [18, 26], [13, 22], [11, 18], [13, 12]], p.orange);
polygon([[16, 10], [21, 9], [20, 12], [14, 15], [13, 13]], p.light);
polygon([[30, 10], [33, 12], [34, 16], [29, 13]], p.shade);
polygon([[23, 10], [24, 12], [24, 15], [27, 19], [32, 21], [29, 25], [19, 25], [14, 22], [20, 18], [22, 15]], p.white);
// Cheek tufts use the same small stepped clusters as Mafe's head outline.
for (const flip of [false, true]) {
  const tuft = (points: Array<[number, number]>, color: string) =>
    polygon(points.map(([x, y]) => [flip ? 47 - x : x, y]), color);
  tuft([[12, 16], [9, 17], [11, 19], [8, 20], [11, 22], [10, 23], [16, 25], [18, 24]], p.edge);
  tuft([[13, 17], [11, 18], [13, 20], [10, 20], [14, 23], [17, 24], [16, 21]], p.light);
  tuft([[12, 21], [16, 22], [15, 21], [19, 22], [18, 25], [14, 24]], p.white);
}
// Small tabby forehead stripes remain separated from the white blaze.
c.path([[18, 10], [19, 12]], p.stripe);
c.path([[21, 9], [21, 12]], p.stripe);
c.path([[26, 9], [26, 12]], p.stripe);
c.path([[29, 10], [28, 12]], p.stripe);
c.path([[12, 18], [14, 19]], p.stripe);
c.path([[33, 18], [35, 17]], p.stripe);

// Smaller almond eyes: a 5x3 outline instead of the first draft's 6x5.
for (const x of [16, 27]) {
  c.rect(x, 16, 3, 1, p.edge);
  c.rect(x - 1, 17, 5, 1, p.edge);
  c.rect(x, 18, 3, 1, p.edge);
  c.rect(x, 17, 3, 1, p.eye);
  c.set(x + 1, 17, p.pupil);
  c.set(x, 17, "#edf0bb");
}
polygon([[21, 20], [26, 20], [24, 23], [23, 23]], p.nose);
c.rect(22, 20, 2, 1, p.pink);
c.set(23, 23, p.edge);
c.set(22, 24, p.edge);
c.set(24, 24, p.edge);
c.path([[13, 21], [17, 22]], p.cream);
c.path([[29, 22], [34, 21]], p.cream);

// Green collar and small neutral metal bell/tag, based on the reference photos.
c.path([[17, 26], [21, 28], [27, 28], [31, 26]], p.greenDark, 2);
c.path([[18, 26], [21, 27], [27, 27], [30, 26]], p.green);
c.set(19, 26, p.greenLight);
c.rect(23, 28, 2, 2, p.shadow);
c.set(23, 28, p.white);

// Keep the foreground separate so tail motion cannot erase fur or move the body.
const foreground = new Canvas(48, 40);
foreground.data.set(c.data);
c.data.fill(0);
c.stamp(tail, 0, 0);
c.stamp(foreground, 0, 0);

const out = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("../../emotes/leo/", import.meta.url));
const contract = JSON.parse(readFileSync(new URL("./frames.json", import.meta.url), "utf8"));
// One row per state, contract order, all frames at 3x nearest-neighbor scale.
const sheet = new Canvas(8 * 48 * 3, 24 * 40 * 3);
sheet.rect(0, 0, sheet.width, sheet.height, "#242630");
let row = 0, count = 0;
for (const [state, names] of Object.entries(contract.frames) as [string, string[]][]) {
  mkdirSync(`${out}/${state}`, { recursive: true });
  names.forEach((name, index) => {
    const frame = render(c, tail, foreground, p, state, name, index);
    writeFileSync(`${out}/${state}/${name}`, frame.toPng());
    sheet.scaled(frame, index * 48 * 3, row * 40 * 3, 3);
    count++;
  });
  row++;
}
writeFileSync(`${out}/emotes.json`, JSON.stringify(contract.emotes, null, 2) + "\n");
// Custom output never touches repository docs unless explicitly requested.
const sheetPath = process.argv[3] ? resolve(process.argv[3])
  : !process.argv[2] ? fileURLToPath(new URL("../../docs/leo/contact-sheet.png", import.meta.url)) : undefined;
if (sheetPath) {
  mkdirSync(dirname(sheetPath), { recursive: true });
  writeFileSync(sheetPath, sheet.toPng());
}
console.log(`Leo sprites: ${count} frames, ${row} states (48x40 RGBA)`);
