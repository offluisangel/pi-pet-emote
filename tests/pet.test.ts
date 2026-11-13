import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { decodePng } from "../src/png.ts";
import { discoverFrames, loadEmotesConfig } from "../src/emotes.ts";
import { EMOTE_STATES } from "../src/types.ts";

const ROOT = join(import.meta.dirname, "..");
const SET = join(ROOT, "emotes", "pet");
const contract = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "pet-contract.json"), "utf8"));
const digest = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

// The public loader must see the same frame names, order and playback metadata.
test("the pet preserves all 76 frame names, 24 states and original playback timings", () => {
  const frames = discoverFrames(SET);
  assert.deepEqual([...frames.keys()].sort(), [...EMOTE_STATES].sort());
  let count = 0;
  for (const [state, files] of Object.entries(contract.frames)) {
    assert.deepEqual(frames.get(state as any)?.files, files, state);
    count += (files as string[]).length;
  }
  assert.equal(count, 76);
  assert.deepEqual(loadEmotesConfig(SET), contract.emotes);
});

test("every pet frame is a transparent 48x40 RGBA8 PNG with visible accessories", () => {
  for (const [state, frameSet] of discoverFrames(SET)) {
    for (const [name, base64] of frameSet.base64Cache) {
      const png = Buffer.from(base64, "base64");
      const image = decodePng(png);
      const label = `${state}/${name}`;
      assert.deepEqual([image.width, image.height, png[24], png[25]], [48, 40, 8, 6], label);
      let transparent = 0, pink = 0, navy = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        const [r, g, b, a] = image.data.subarray(i, i + 4);
        if (a === 0) transparent++;
        if (a === 255 && r === 237 && g === 105 && b === 148) pink++;
        if (a === 255 && r === 53 && g === 69 && b === 117) navy++;
      }
      assert.ok(transparent > 0 && transparent < 48 * 40, `${label}: transparent background and visible pet`);
      assert.ok(pink > 0 && navy > 0, `${label}: pink bows and navy bandana`);
    }
  }
});

test("idle is exactly the approved pet, and every animation has distinct poses", () => {
  assert.equal(digest(readFileSync(join(SET, "idle", "idle.png"))), contract.approved_idle_sha256);
  const states = new Set<string>();
  for (const state of EMOTE_STATES) {
    const files = readdirSync(join(SET, state)).filter((name) => name.endsWith(".png"));
    const hashes = files.map((name) => digest(decodePng(readFileSync(join(SET, state, name))).data));
    assert.ok(new Set(hashes).size > 1, `${state}: not repeated static images`);
    states.add(hashes.join(","));
  }
  assert.equal(states.size, 24, "each reaction has its own animation");
});
