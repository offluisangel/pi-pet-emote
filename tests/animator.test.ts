import { readdirSync } from "node:fs";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Animator } from "../src/animator.ts";
import type { Config, EmoteState } from "../src/types.ts";

const config: Config = {
  enabled: true, debug: false, size: 12, placement: "beside-editor", frame: true, frameRows: 4, minEditorWidth: 40, readingSpeed: 4,
  holdDuration: { hi: 1000, success: 1000, failure: 1000, bye: 1000 },
  blinkInterval: [60_000, 60_000], talkTickMs: 120, cycleMs: 100, grandmaAfterMs: 5000,
  accent: "auto", farewellPattern: "^chau", emotes: [], terminals: [],
};

const blinkConfig: Config = { ...config, blinkInterval: [100, 100], grandmaAfterMs: 0 };

for (const [label, random] of [["single", 0.5], ["double", 0.1]] as const) {
  test(`stop cancels an in-flight ${label} blink without repainting`, (t) => {
    mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
    t.mock.method(Math, "random", () => random);
    try {
      const renderer = fakeRenderer({ idle: ["idle.png", "idle_blink.png"] });
      const animator = new Animator(blinkConfig, renderer as any);
      animator.transitionTo("idle");
      mock.timers.tick(100);
      assert.deepEqual(renderer.shown, ["idle/idle.png", "idle/idle_blink.png"]);
      animator.stop();
      mock.timers.tick(150);
      assert.deepEqual(renderer.shown, ["idle/idle.png", "idle/idle_blink.png"]);
      mock.timers.tick(1000);
      assert.equal(renderer.shown.length, 2);
    } finally { mock.timers.reset(); }
  });
}

test("a prompt cancels an in-flight blink and nested prompts restart idle blinking only after both end", (t) => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  t.mock.method(Math, "random", () => 0.5);
  try {
    const renderer = fakeRenderer({ idle: ["idle.png", "idle_blink.png"], ask: ["a"] });
    const animator = new Animator(blinkConfig, renderer as any);
    animator.transitionTo("idle");
    mock.timers.tick(100);
    animator.beginPrompt();
    animator.beginPrompt();
    const covered = [...renderer.shown];
    mock.timers.tick(150);
    assert.deepEqual(renderer.shown, covered);
    assert.equal(renderer.shown.at(-1), "ask#0");
    animator.endPrompt();
    mock.timers.tick(1000);
    assert.deepEqual(renderer.shown, covered);
    animator.endPrompt();
    assert.equal(renderer.shown.at(-1), "idle/idle.png");
    mock.timers.tick(100);
    assert.equal(renderer.shown.at(-1), "idle/idle_blink.png");
    animator.stop();
  } finally { mock.timers.reset(); }
});

test("unobstructed double blinking keeps its timing and a transition swaps to thinking", (t) => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  t.mock.method(Math, "random", () => 0.1);
  try {
    const renderer = fakeRenderer({ idle: ["idle.png", "idle_blink.png"], think: ["a", "b"] });
    const animator = new Animator(blinkConfig, renderer as any);
    animator.transitionTo("idle");
    for (const ms of [100, 150, 100, 150]) mock.timers.tick(ms);
    assert.deepEqual(renderer.shown, ["idle/idle.png", "idle/idle_blink.png", "idle/idle.png", "idle/idle_blink.png", "idle/idle.png"]);
    mock.timers.tick(100);
    animator.transitionTo("think");
    mock.timers.tick(150);
    assert.equal(animator.currentState, "think");
    assert.ok(renderer.shown.slice(-2).every((frame) => frame.startsWith("think#")));
    animator.stop();
  } finally { mock.timers.reset(); }
});

/** Records what the animator asks to show. */
function fakeRenderer(files: Partial<Record<EmoteState, string[]>>) {
  const shown: string[] = [];
  return {
    shown,
    setTui() {}, loadFrames() {}, getRenderedFrame: () => null, dispose() {}, resetCache() {},
    getFrameFiles: (state: EmoteState) => files[state] ?? [],
    showFrame: (state: EmoteState, name: string) => { shown.push(`${state}/${name}`); return true; },
    showRandomFrame: (state: EmoteState) => { shown.push(`${state}/*`); return true; },
    showTalkFrame: () => true, showTalkCloseFrame: () => true,
    showCycleFrame: (state: EmoteState, i: number) => { shown.push(`${state}#${i}`); return true; },
    getCycleFrameCount: (state: EmoteState) => files[state]?.length ?? 0,
  };
}

test("idle turns into the grandma after grandmaAfterMs and plays intro then loop", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const renderer = fakeRenderer({ idle: ["idle.png"], grandma: ["in_1.png", "in_2.png", "knit_1.png", "knit_2.png"] });
    const animator = new Animator(config, renderer as any);
    animator.transitionTo("idle");
    mock.timers.tick(4999);
    assert.equal(animator.currentState, "idle");
    mock.timers.tick(1);
    assert.equal(animator.currentState, "grandma");
    mock.timers.tick(100 * 5);
    assert.deepEqual(renderer.shown.filter((s) => s.startsWith("grandma")), [
      "grandma/in_1.png", "grandma/in_2.png", "grandma/knit_1.png", "grandma/knit_2.png", "grandma/knit_1.png", "grandma/knit_2.png",
    ]);
    animator.clearAllTimers();
  } finally {
    mock.timers.reset();
  }
});

test("touch() while idle postpones the grandma", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const animator = new Animator(config, fakeRenderer({ idle: ["idle.png"], grandma: ["knit_1.png"] }) as any);
    animator.transitionTo("idle");
    mock.timers.tick(4000);
    animator.touch();
    mock.timers.tick(4000);
    assert.equal(animator.currentState, "idle");
    mock.timers.tick(1000);
    assert.equal(animator.currentState, "grandma");
    animator.clearAllTimers();
  } finally {
    mock.timers.reset();
  }
});

test("ending an idle prompt preserves the original sleepy-pet deadline", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const renderer = fakeRenderer({ idle: ["idle.png"], ask: ["a"], grandma: ["knit_1.png"] });
    const animator = new Animator(config, renderer as any);
    animator.transitionTo("idle");
    mock.timers.tick(4000);
    animator.beginPrompt();
    mock.timers.tick(500);
    animator.endPrompt();
    mock.timers.tick(499);
    assert.equal(animator.currentState, "idle");
    mock.timers.tick(1);
    assert.equal(animator.currentState, "grandma");
    assert.equal(renderer.shown.at(-1), "grandma/knit_1.png");
    animator.stop();
  } finally { mock.timers.reset(); }
});

test("no grandma frames means no transformation", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const animator = new Animator(config, fakeRenderer({ idle: ["idle.png"] }) as any);
    animator.transitionTo("idle");
    mock.timers.tick(60_000);
    assert.equal(animator.currentState, "idle");
    animator.clearAllTimers();
  } finally {
    mock.timers.reset();
  }
});

test("loop cycle mode runs forward instead of ping-pong", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const renderer = fakeRenderer({ tool: ["a", "b", "c"] });
    const animator = new Animator(config, renderer as any);
    animator.setEmotesConfig({ cycle: { tool: "loop" }, frameMs: { tool: 50 } });
    animator.transitionTo("tool");
    mock.timers.tick(50 * 4);
    assert.deepEqual(renderer.shown, ["tool#0", "tool#1", "tool#2", "tool#0", "tool#1"]);
    animator.clearAllTimers();
  } finally {
    mock.timers.reset();
  }
});

test("success after talk: setAfterTalkState plays once talking ends", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
  try {
    const animator = new Animator(config, fakeRenderer({ success: ["s1"] }) as any);
    animator.transitionTo("talk");
    animator.setAfterTalkState("success");
    animator.endTalk();
    assert.equal(animator.currentState, "talk");
    mock.timers.tick(500);
    assert.equal(animator.currentState, "success");
    mock.timers.tick(1000);
    assert.equal(animator.currentState, "idle");
    animator.clearAllTimers();
  } finally {
    mock.timers.reset();
  }
});


test("Super YOLO thinking advances sun frames without changing the logical activity", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const renderer = fakeRenderer({ "super-yolo": ["super-yolo.png", "super-yolo_blink.png"], tool: ["a", "b"] });
    const animator = new Animator(config, renderer as any);
    animator.setEmotesConfig({ cycle: { "super-yolo": "loop" }, frameMs: { "super-yolo": 100 } });
    animator.setIdleVariant("super-yolo");
    animator.transitionTo("think");
    mock.timers.tick(100);
    mock.timers.tick(100);
    assert.equal(animator.currentState, "think");
    assert.deepEqual(renderer.shown.filter((s) => s.startsWith("super-yolo#")), ["super-yolo#0", "super-yolo#1", "super-yolo#0"]);
    animator.transitionTo("tool");
    mock.timers.tick(100);
    assert.equal(renderer.shown.at(-1), "tool#1");
    animator.stop();
  } finally { mock.timers.reset(); }
});


test("a Yes/No prompt covers the execution frames and then returns to them", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const renderer = fakeRenderer({ tool: ["a", "b", "c"], ask: ["yn1", "yn2"] });
    const animator = new Animator(config, renderer as any);
    animator.setEmotesConfig({ cycle: { tool: "loop", ask: "loop" }, frameMs: { tool: 100, ask: 100 } });
    animator.transitionTo("tool");
    animator.beginPrompt();
    mock.timers.tick(100);
    mock.timers.tick(100);
    assert.equal(animator.currentState, "tool");
    assert.ok(renderer.shown.slice(-2).every((frame) => frame.startsWith("ask#")));
    animator.endPrompt();
    assert.ok(renderer.shown.at(-1)?.startsWith("tool#"));
    animator.stop();
  } finally { mock.timers.reset(); }
});

test("prompt display priority keeps underlying activity and nested prompts independent", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
  try {
    const renderer = fakeRenderer({ idle: ["idle.png", "idle_blink.png"], ask: ["a", "b"], tool: ["a", "b"], think: ["a", "b"], verify: ["fail.png"] });
    const animator = new Animator(config, renderer as any);
    animator.transitionTo("tool");
    animator.beginPrompt();
    animator.beginPrompt();
    animator.transitionTo("think");
    animator.resetRenderCache();
    mock.timers.tick(100);
    assert.equal(animator.currentState, "think", "UI overlay must not corrupt logical activity");
    assert.ok(renderer.shown.at(-1)?.startsWith("ask#"));
    animator.endPrompt();
    assert.ok(renderer.shown.at(-1)?.startsWith("ask#"), "one pending prompt remains");
    animator.endPrompt();
    assert.ok(renderer.shown.at(-1)?.startsWith("think#"));
    animator.beginPrompt();
    animator.setHoldNextState("think");
    assert.equal(animator.showFailureFrame("verify", "fail.png"), true);
    assert.ok(renderer.shown.at(-1)?.startsWith("ask#"));
    animator.endPrompt();
    assert.equal(renderer.shown.at(-1), "verify/fail.png");
    animator.beginPrompt();
    animator.stop();
    const n = renderer.shown.length;
    animator.endPrompt();
    mock.timers.tick(1000);
    assert.equal(renderer.shown.length, n);
    animator.transitionTo("idle");
    assert.equal(renderer.shown.at(-1), "idle/idle.png");
    animator.stop();
  } finally { mock.timers.reset(); }
});


test("waking from the sleepy pet waves without replaying the arrival", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const files = readdirSync(new URL("../emotes/pet/hi/", import.meta.url)).filter((f) => f.endsWith(".png")).sort();
    const renderer = fakeRenderer({ hi: files, idle: ["idle.png"], grandma: ["knit_1.png"] });
    const animator = new Animator({ ...config, cycleMs: 280, holdDuration: { ...config.holdDuration, hi: 840 } }, renderer as any);
    animator.transitionTo("grandma");
    animator.wave();
    mock.timers.tick(560);
    const waved = renderer.shown.filter((frame) => frame.startsWith("hi/"));
    assert.ok(waved.length > 0);
    assert.ok(waved.every((frame) => frame.includes("landed_")));
    mock.timers.tick(280);
    assert.equal(animator.currentState, "idle");
    animator.clearAllTimers();
  } finally { mock.timers.reset(); }
});

test("greeting plays arrival once before waving until its hold ends", () => {
  mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  try {
    const files = readdirSync(new URL("../emotes/pet/hi/", import.meta.url)).filter((f) => f.endsWith(".png")).sort();
    const renderer = fakeRenderer({ hi: files, idle: ["idle.png"] });
    const animator = new Animator({ ...config, cycleMs: 280, holdDuration: { ...config.holdDuration, hi: 2400 } }, renderer as any);
    animator.transitionTo("hi");
    mock.timers.tick(2240);
    assert.deepEqual(renderer.shown, [
      "hi/in_1.png", "hi/in_2.png", "hi/in_3.png", "hi/in_4.png",
      "hi/in_5.png", "hi/in_6.png", "hi/landed_1.png", "hi/landed_2.png", "hi/landed_1.png",
    ]);
    mock.timers.tick(160);
    assert.equal(animator.currentState, "idle");
    animator.clearAllTimers();
  } finally { mock.timers.reset(); }
});
