import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { decodePng, type RgbaImage } from "../src/png.ts";
import { EMOTE_STATES } from "../src/types.ts";

const load = (path: string) => decodePng(readFileSync(`emotes/leo/${path}`));
const pixel = (image: RgbaImage, x: number, y: number) => image.data.slice((y * image.width + x) * 4, (y * image.width + x + 1) * 4);

test("Leo ships the complete 76-frame RGBA contract and approved idle pixels", () => {
  const contract = JSON.parse(readFileSync("scripts/sprites/frames.json", "utf8"));
  assert.deepEqual(readdirSync("emotes/leo").sort(), [...EMOTE_STATES, "emotes.json"].sort());
  assert.deepEqual(JSON.parse(readFileSync("emotes/leo/emotes.json", "utf8")), contract.emotes);
  let count = 0;
  for (const [state, names] of Object.entries(contract.frames) as [string, string[]][]) {
    assert.deepEqual(readdirSync(`emotes/leo/${state}`).sort(), [...names].sort());
    for (const name of names) {
      const bytes = readFileSync(`emotes/leo/${state}/${name}`);
      assert.equal(bytes[25], 6, `${state}/${name}: RGBA PNG`);
      const image = decodePng(bytes);
      assert.deepEqual([image.width, image.height], [48, 40]);
      const alpha = image.data.filter((_, i) => i % 4 === 3);
      assert.ok(alpha.includes(0) && alpha.includes(255));
      assert.ok(alpha.every((value) => value === 0 || value === 255));
      count++;
    }
  }
  assert.equal(count, 76);
  assert.equal(createHash("sha256").update(load("idle/idle.png").data).digest("hex"),
    "4b390c2d5c197a6caa27af75d0c4a851f740cd1f6a8c9bf9e91c84194d18b9cb");
});

test("every reaction keeps the portrait's tabby mask, collar and plumed tail, and animates each cel", () => {
  for (const state of EMOTE_STATES.filter(s => s !== "idle")) {
    const poses = new Set<string>();
    const names = readdirSync(`emotes/leo/${state}`);
    for (const name of names) {
      const image = load(`${state}/${name}`);
      const colors = new Set<string>();
      for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i + 3]) colors.add(Buffer.from(image.data.slice(i, i + 3)).toString("hex"));
      }
      for (const color of ["995132", "94cb36", "ffda94"]) assert.ok(colors.has(color), `${state}/${name}: missing portrait color ${color}`);
      for (const color of ["b5c66a", "30372c", "654938"]) assert.ok(!colors.has(color), `${state}/${name}: obsolete face color ${color}`);
      poses.add(createHash("sha256").update(image.data).digest("hex"));
    }
    assert.equal(poses.size, names.length, `${state}: repeated cel`);
  }
});

test("Leo blink stays inside the eye boxes and the landed wave moves the upper tail without moving its root", () => {
  const base = load("idle/idle.png"), blink = load("idle/idle_blink.png");
  assert.deepEqual([...pixel(base, 15, 14)], [255, 253, 244, 255], "left eye catchlight");
  let blinkChanges = 0;
  for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) {
    if (Buffer.from(pixel(blink, x, y)).equals(Buffer.from(pixel(base, x, y)))) continue;
    blinkChanges++;
    assert.ok(((y >= 13 && y <= 17 && x >= 13 && x <= 18) || (y >= 15 && y <= 19 && x >= 24 && x <= 29)));
  }
  assert.ok(blinkChanges > 0, "blink changes eye pixels");
  const frames = [load("hi/landed_1.png"), load("hi/landed_2.png")];
  let tailChanges = 0, visibleRoot = 0;
  for (let y = 19; y < 30; y++) for (let x = 43; x < 48; x++) {
    if (!Buffer.from(pixel(frames[0]!, x, y)).equals(Buffer.from(pixel(frames[1]!, x, y)))) tailChanges++;
  }
  assert.ok(tailChanges > 0, "pixels outside the waving paw change in the upper-tail region");
  // The exposed root is right of the body, below the swaying portion.
  for (let y = 32; y <= 36; y++) for (let x = 35; x <= 42; x++) {
    if (pixel(frames[0]!, x, y)[3]) visibleRoot++;
    assert.deepEqual(pixel(frames[1]!, x, y), pixel(frames[0]!, x, y), `root ${x},${y}`);
  }
  assert.ok(visibleRoot > 0, "the asserted root contains visible artwork");
});
