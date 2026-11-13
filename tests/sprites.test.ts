import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EMOTE_STATES } from "../src/types.ts";
import { decodePng } from "../src/png.ts";
import { ACCENT_KEYS, createAccentTransform } from "../src/accent.ts";
import { cycleFrameFiles } from "../src/emotes.ts";
import { toolNameToState } from "../src/index.ts";

const SET = join(import.meta.dirname, "..", "emotes", "pet");

test("the pet set has frames for every state, all 48x40", () => {
  for (const state of EMOTE_STATES) {
    const files = readdirSync(join(SET, state)).filter((f) => f.endsWith(".png"));
    assert.ok(files.length > 0, `no frames for ${state}`);
    for (const file of files) {
      const png = decodePng(readFileSync(join(SET, state, file)));
      assert.deepEqual([png.width, png.height], [48, 40], `${state}/${file}`);
    }
  }
});

test("theme accents preserve the approved pet's fixed accessory colors", () => {
  for (const state of EMOTE_STATES) {
    for (const file of readdirSync(join(SET, state)).filter((name) => name.endsWith(".png"))) {
      const source = readFileSync(join(SET, state, file));
      const { data } = decodePng(source);
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        for (const key of Object.values(ACCENT_KEYS)) {
          assert.ok(!key.every((v, c) => data[i + c] === v), `${state}/${file}: no theme-key pixels`);
        }
      }
      const transformed = createAccentTransform([0, 255, 255])(source.toString("base64"));
      assert.deepEqual(decodePng(Buffer.from(transformed, "base64")).data, data);
    }
  }
});

test("the verify failure stamp is a frame, and it is not part of the loop", () => {
  const files = readdirSync(join(SET, "verify")).filter((name) => name.endsWith(".png")).sort();
  assert.ok(files.includes("fail.png"));
  assert.deepEqual(cycleFrameFiles(files), files.filter((name) => name !== "fail.png"));
});

test("the greeting arrives once, then the pet keeps waving", () => {
  const files = readdirSync(join(SET, "hi")).filter((name) => name.endsWith(".png")).sort();
  assert.ok(files.some((name) => name.startsWith("in_")), "missing the arrival frames");
  assert.ok(files.some((name) => name.startsWith("landed_")), "missing the waving loop");
});

test("emotes.json names files that exist", () => {
  const config = JSON.parse(readFileSync(join(SET, "emotes.json"), "utf-8"));
  for (const file of [config.idle.default, config.idle.blink]) readFileSync(join(SET, "idle", file));
  for (const file of Object.keys(config.talk.weights)) readFileSync(join(SET, "talk", file));
});

test("tools map to the right gestures", () => {
  assert.equal(toolNameToState("edit"), "write");
  assert.equal(toolNameToState("read"), "read");
  assert.equal(toolNameToState("ask_user_choice"), "ask");
  assert.equal(toolNameToState("mem_session_summary"), "bye");
  assert.equal(toolNameToState("bash"), "tool");
});
