import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { discoverFrames } from "../src/emotes.ts";
import { decodePng } from "../src/png.ts";
import { EMOTE_STATES } from "../src/types.ts";

const root = join(import.meta.dirname, "..");
const html = readFileSync(join(root, "design/pet-avatar/02-animations.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "artboard must contain its executable script");
const assets = discoverFrames(join(root, "emotes/pet"));
const source = (state: string, file: string) => {
  const base64 = assets.get(state as any)?.base64Cache.get(file);
  assert.ok(base64, `${state}/${file} exists`);
  return `data:image/png;base64,${base64}`;
};

/** Only the DOM surface the real artboard uses; no replacement playback logic. */
class Element {
  tag: string;
  children: Element[] = [];
  className = "";
  textContent = "";
  width = 0;
  height = 0;
  src = "";
  alt = "";
  attributes = new Map<string, string>();
  listeners = new Map<string, () => void>();
  constructor(tag: string) { this.tag = tag; }
  append(...elements: Element[]) { this.children.push(...elements); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(name: string, listener: () => void) { this.listeners.set(name, listener); }
  fire(name: string) {
    const listener = this.listeners.get(name);
    assert.ok(listener, `${this.tag} has ${name} listener`);
    listener();
  }
}

function descendants(element: Element): Element[] {
  return element.children.flatMap(child => [child, ...descendants(child)]);
}

function boot(reducedMotion = false) {
  const main = new Element("main");
  const button = new Element("button");
  const status = new Element("span");
  const selectors: Record<string, Element> = { main, "#pause": button, "#status": status };
  const motion = {
    matches: reducedMotion,
    listener: () => {},
    addEventListener(name: string, listener: () => void) {
      assert.equal(name, "change");
      this.listener = listener;
    },
  };
  let callback: ((timestamp: number) => void) | undefined;
  let now = 0;
  runInNewContext(script!, {
    document: {
      createElement: (tag: string) => new Element(tag),
      querySelector: (selector: string) => {
        assert.ok(selectors[selector], `known selector ${selector}`);
        return selectors[selector];
      },
    },
    matchMedia: (query: string) => {
      assert.equal(query, "(prefers-reduced-motion: reduce)");
      return motion;
    },
    performance: { now: () => 0 },
    requestAnimationFrame: (next: (timestamp: number) => void) => { callback = next; },
  }, { timeout: 1000 });

  const card = (state: string) => {
    const found = main.children.find(element => element.children[0]?.textContent === state);
    assert.ok(found, `${state} card initialized`);
    return found;
  };
  const view = (state: string) => {
    const found = descendants(card(state)).find(element => element.className === "large");
    assert.ok(found);
    return found;
  };
  return {
    main, button, status, card, view,
    // Ten-millisecond steps respect the artboard's 100 ms elapsed-time cap.
    advance(ms: number) {
      assert.equal(ms % 10, 0);
      for (let remaining = ms; remaining > 0; remaining -= 10) {
        assert.ok(callback, "animation requested another frame");
        const next = callback;
        callback = undefined;
        now += 10;
        next(now);
      }
    },
    setReducedMotion(matches: boolean) { motion.matches = matches; motion.listener(); },
  };
}

test("all 24 preview cards initialize, expose 76 exact frames and animate failure", () => {
  const lab = boot();
  assert.equal(lab.main.children.length, 24);
  assert.deepEqual(lab.main.children.map(card => card.children[0].textContent).sort(), [...EMOTE_STATES].sort());
  let inspectable = 0;
  for (const state of EMOTE_STATES) {
    const elements = descendants(lab.card(state));
    const large = elements.find(element => element.className === "large")!;
    const native = elements.find(element => element.className === "native")!;
    assert.deepEqual([large.width, large.height], [192, 160]);
    assert.deepEqual([native.width, native.height], [48, 40]);
    assert.equal(large.src, native.src);
    const frames = elements.find(element => element.className === "frames")!;
    const images = descendants(frames).filter(element => element.tag === "img");
    const files = assets.get(state)!.files;
    assert.equal(images.length, files.length, state);
    images.forEach((image, index) => {
      assert.equal(image.alt, `${state}/${files[index]}`);
      assert.equal(image.src, source(state, files[index]));
      const png = decodePng(Buffer.from(image.src.split(",")[1], "base64"));
      assert.deepEqual([png.width, png.height], [48, 40]);
    });
    inspectable += images.length;
  }
  assert.equal(inspectable, 76);
  const sequence = [lab.view("failure").src];
  for (let step = 0; step < 3; step++) {
    lab.advance(380);
    sequence.push(lab.view("failure").src);
  }
  assert.deepEqual(sequence, [1, 2, 3, 1].map(n => source("failure", `failure_${n}.png`)));
});

test("the actual pause button freezes and resumes animation with aria feedback", () => {
  const lab = boot();
  assert.equal(lab.button.attributes.get("aria-pressed"), "false");
  lab.advance(380);
  lab.button.fire("click");
  assert.equal(lab.button.attributes.get("aria-pressed"), "true");
  assert.equal(lab.button.textContent, "Play animations");
  assert.equal(lab.status.textContent, "Paused");
  const sources = EMOTE_STATES.map(state => lab.view(state).src);
  lab.advance(760);
  assert.deepEqual(EMOTE_STATES.map(state => lab.view(state).src), sources);
  lab.button.fire("click");
  assert.equal(lab.button.attributes.get("aria-pressed"), "false");
  assert.equal(lab.button.textContent, "Pause animations");
  assert.equal(lab.status.textContent, "Playing");
  lab.advance(380);
  assert.equal(lab.view("failure").src, source("failure", "failure_3.png"));
});

test("reduced motion starts paused but permits explicit play and preference changes", () => {
  const lab = boot(true);
  assert.equal(lab.button.attributes.get("aria-pressed"), "true");
  const initial = EMOTE_STATES.map(state => lab.view(state).src);
  lab.advance(1000);
  assert.deepEqual(EMOTE_STATES.map(state => lab.view(state).src), initial);
  lab.button.fire("click");
  assert.equal(lab.button.attributes.get("aria-pressed"), "false");
  lab.advance(380);
  assert.equal(lab.view("failure").src, source("failure", "failure_2.png"));
  lab.setReducedMotion(true);
  assert.equal(lab.button.attributes.get("aria-pressed"), "true");
  lab.advance(380);
  assert.equal(lab.view("failure").src, source("failure", "failure_2.png"));
  lab.setReducedMotion(false);
  lab.advance(380);
  assert.equal(lab.view("failure").src, source("failure", "failure_3.png"));
});

test("hi plays its introduction once then loops only the landed frames", () => {
  const lab = boot();
  const sequence = [lab.view("hi").src];
  for (let step = 0; step < 11; step++) {
    lab.advance(280);
    sequence.push(lab.view("hi").src);
  }
  assert.deepEqual(sequence, [
    ...[1, 2, 3, 4, 5, 6].map(n => source("hi", `in_${n}.png`)),
    ...[1, 2, 1, 2, 1, 2].map(n => source("hi", `landed_${n}.png`)),
  ]);
});

test("verify keeps its fail stamp inspectable but never includes it in playback", () => {
  const lab = boot();
  const stamp = source("verify", "fail.png");
  assert.ok(descendants(lab.card("verify")).some(element => element.src === stamp));
  const sequence = [lab.view("verify").src];
  for (let step = 0; step < 8; step++) {
    lab.advance(360);
    sequence.push(lab.view("verify").src);
  }
  assert.ok(sequence.every(src => src !== stamp));
  assert.deepEqual(sequence, [1, 2, 3, 1, 2, 3, 1, 2, 3].map(n => source("verify", `verify_${n}.png`)));
});

test("read preserves the shipped 0,1,2,1,0 pingpong sequence", () => {
  const lab = boot();
  const sequence = [lab.view("read").src];
  for (let step = 0; step < 4; step++) {
    lab.advance(450);
    sequence.push(lab.view("read").src);
  }
  assert.deepEqual(sequence, [1, 2, 3, 2, 1].map(n => source("read", `read_${n}.png`)));
});
