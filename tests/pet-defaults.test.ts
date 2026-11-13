import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_EMOTE_SET, findEmoteSetDir, findYoloSetDir, resolveEmoteSet } from "../src/emotes.ts";
import { loadLayeredConfig } from "../src/config.ts";

const root = join(import.meta.dirname, "..");

test("pet is the built-in default without a YOLO twin; custom mappings still win", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pet-defaults-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = join(scratch, "agent");
  try {
    assert.equal(DEFAULT_EMOTE_SET, "pet");
    assert.equal(resolveEmoteSet("any", "off", []), "pet");
    assert.equal(findEmoteSetDir("unknown", root, scratch), join(root, "emotes", "pet"));
    assert.equal(findYoloSetDir("pet", root, scratch), null);
    const { config } = loadLayeredConfig(root, scratch);
    assert.equal(resolveEmoteSet("any", "off", config.emotes), "pet");
    assert.equal(resolveEmoteSet("opus", "high", [...config.emotes, { model: "*opus*", "emote-set": "custom" }]), "custom");
    assert.equal(resolveEmoteSet("other", "high", [...config.emotes, { "thinking-level": "high", "emote-set": "focused" }]), "focused");
    assert.equal(resolveEmoteSet("any", "off", loadLayeredConfig(scratch, scratch).config.emotes), "pet");
  } finally {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("shipped sizing, timing and renderer settings are unchanged apart from the pet mapping", () => {
  const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8"));
  assert.deepEqual(config, {
    enabled: true, debug: false, size: 10, placement: "beside-editor", frame: true,
    frameRows: 4, minEditorWidth: 40, readingSpeed: 4,
    holdDuration: { hi: 2400, success: 1600, failure: 2400, bye: 6000 },
    blinkInterval: [3000, 6000], talkTickMs: 120, cycleMs: 500, grandmaAfterMs: 30000,
    accent: "auto", emotes: [{ model: "*", "emote-set": "pet" }],
    terminals: [
      { match: "zellij", render: "ascii" }, { match: "tmux", render: "auto" },
      { match: "screen", render: "ascii" }, { match: "wezterm", render: "iterm2" },
      { match: "ghostty", render: "kitty" }, { match: "warpterminal", render: "kitty" },
    ],
  });
});
