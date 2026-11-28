import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodePng } from "../src/png.ts";
import { discoverFrames } from "../src/emotes.ts";

const root = join(import.meta.dirname, "..", "emotes", "pet");
const image = (state: string, file: string) => decodePng(readFileSync(join(root, state, file + ".png")));
const count = (png: ReturnType<typeof decodePng>, rgb: number[], x0 = 0, y0 = 0, x1 = 48, y1 = 40) => {
  let total = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * png.width + x) * 4;
    if (png.data[i + 3] === 255 && rgb.every((v, c) => png.data[i + c] === v)) total++;
  }
  return total;
};

test("all pet poses use binary alpha and each state visibly animates", () => {
  for (const [state, frames] of discoverFrames(root)) {
    const images = [...frames.base64Cache.values()].map((base64) => decodePng(Buffer.from(base64, "base64")));
    for (const png of images) {
      assert.deepEqual([png.width, png.height], [48, 40]);
      for (let i = 3; i < png.data.length; i += 4) assert.ok(png.data[i] === 0 || png.data[i] === 255, state);
      // Leave a transparent side gutter rather than clipping the pet or props.
      for (let y = 0; y < 40; y++) for (const x of [0, 47]) assert.equal(png.data[(y * 48 + x) * 4 + 3], 0, state);
    }
    assert.ok(new Set(images.map((p) => Buffer.from(p.data).toString("hex"))).size > 1, state);
  }
});

test("reading, writing, tools and exploration have recognizable separate props", () => {
  assert.ok(count(image("read", "read_1"), [240, 232, 216], 11, 30) > 20, "open book pages");
  assert.ok(count(image("write", "write_1"), [167, 120, 86], 24, 27) > 0, "wooden pencil");
  assert.ok(count(image("tool", "tool_1"), [117, 132, 152], 35, 23) > 10, "wrench");
  assert.ok(count(image("explore", "explore_1"), [166, 217, 212], 34, 23) > 10, "magnifier lens");
  assert.notDeepEqual(image("explore", "explore_1").data, image("explore", "explore_3").data);
});

test("memory has a heart and asking has a question mark without changing characters", () => {
  assert.ok(count(image("remember", "remember_1"), [237, 105, 148], 2, 3, 8, 10) > 5, "heart");
  for (const file of ["ask_1", "ask_2"]) {
    assert.ok(count(image("ask", file), [243, 210, 129], 41, 3, 45, 9) >= 7, "question mark");
  }
});

test("YOLO and Super YOLO retain the same pet and bows with different sparkles", () => {
  for (const suffix of ["", "_blink"]) {
    const normal = image("yolo", `yolo${suffix}`);
    const extra = image("super-yolo", `super-yolo${suffix}`);
    for (let y = 0; y < 40; y++) for (let x = 10; x < 34; x++) {
      const i = (y * 48 + x) * 4;
      assert.deepEqual(extra.data.slice(i, i + 4), normal.data.slice(i, i + 4), "same central pet");
    }
    assert.ok(count(extra, [166, 217, 212], 40, 18) > count(normal, [166, 217, 212], 40, 18), "extra mint sparkle");
  }
});

test("verification keeps its rejected result separate from successful check poses", () => {
  const failed = image("verify", "fail");
  assert.ok(count(failed, [237, 138, 134], 35, 27) > 5, "cross badge");
  assert.equal(count(failed, [131, 201, 156], 35, 27), 0);
  for (const file of ["verify_1", "verify_2", "verify_3"]) {
    const checked = image("verify", file);
    assert.ok(count(checked, [131, 201, 156], 35, 27) > 5, "check badge");
    assert.equal(count(checked, [237, 138, 134], 35, 27), 0);
  }
});

test("greeting bounces into place then waves with the approved accessories", () => {
  const intro = image("hi", "in_1");
  const wave = image("hi", "landed_1");
  assert.notDeepEqual(intro.data, wave.data);
  // The illustrated paw has shaded cream fur, not a single flat palette entry.
  let pawPixels = 0;
  for (let y = 18; y <= 22; y++) for (let x = 34; x <= 39; x++) {
    const [r, g, b, a] = wave.data.subarray((y * 48 + x) * 4, (y * 48 + x) * 4 + 4);
    if (a === 255 && r > 205 && g > 165 && b < r) pawPixels++;
  }
  assert.ok(pawPixels > 5, "raised cream paw");
  assert.notDeepEqual(wave.data, image("hi", "landed_2").data);
});
