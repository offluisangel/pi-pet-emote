import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import extension from "../src/index.ts";
import { createAccentTransform, BANNER_ACCENTS } from "../src/accent.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const transform = createAccentTransform(BANNER_ACCENTS.pink);
const frame = (pet: string, state: string, file: string) =>
  transform(readFileSync(join(root, "emotes", pet, state, file)).toString("base64"));

/** Real renderer bytes through the registered widget; all user state lives in scratch. */
async function withHost(run: (host: any) => Promise<void>, config = {}) {
  const scratch = mkdtempSync(join(tmpdir(), "pet-selector-"));
  const previous = { ...process.env };
  const dir = join(scratch, "agent", "extensions", "pi-pet-emote");
  const selection = join(dir, "pet-selection.json");
  const configPath = join(dir, "config.json");
  let handlers: Map<string, Function>;
  let commands: Map<string, any>;
  let widget: any;
  const dialogs: any[] = [];
  const notices: any[] = [];
  let choose: string | undefined;
  const ctx = {
    hasUI: true, cwd: scratch, model: { id: "ordinary" },
    ui: {
      notify: (...args: any[]) => notices.push(args),
      select: async (title: string, options: string[]) => {
        dialogs.push({ title, options });
        return options.find((option) => option.split(" (")[0] === choose);
      },
      setWidget: (_key: string, factory: any) => {
        widget = factory?.({ requestRender() {} }, {});
      },
      onTerminalInput: () => () => {},
    },
  };
  const emit = async (event: string, payload = {}) => handlers?.get(event)?.(payload, ctx);
  const command = (args: string) => commands.get("emote").handler(args, ctx);
  const bytes = () => {
    const output = widget.render(100).join("");
    const match = /\x1b\]1337;File=[^:]*:([A-Za-z0-9+/=]+)\x07/.exec(output);
    assert.ok(match, "widget must render an iTerm image");
    return match[1];
  };
  const start = async () => {
    handlers = new Map();
    commands = new Map();
    extension({
      on: (event: string, handler: Function) => handlers.set(event, handler),
      registerCommand: (name: string, value: any) => commands.set(name, value),
      getThinkingLevel: () => "high",
    } as any);
    await emit("session_start");
    mock.timers.tick(500);
    mock.timers.tick(2400);
  };
  try {
    for (const key of ["TMUX", "ZELLIJ", "ZELLIJ_SESSION_NAME", "KITTY_WINDOW_ID", "GHOSTTY_RESOURCES_DIR", "WEZTERM_PANE", "ITERM_SESSION_ID"]) delete process.env[key];
    Object.assign(process.env, {
      HOME: scratch, PI_CODING_AGENT_DIR: join(scratch, "agent"),
      GENTLE_PI_CONFIG_HOME: scratch, GENTLE_SHELL_CONFIG_HOME: scratch,
      TERM: "xterm", TERM_PROGRAM: "pet-test",
    });
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify({
      accent: "pink", placement: "above-editor", grandmaAfterMs: 0, blinkInterval: [60000, 60000],
      terminals: [{ match: "unknown", render: "iterm2" }], ...config,
    }));
    mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
    await start();
    await run({
      ctx, emit, command, bytes, dialogs, notices, selection, configPath, dir,
      choose: (value?: string) => { choose = value; },
      restart: async () => { await emit("session_shutdown"); await start(); },
      completions: () => commands.get("emote").getArgumentCompletions(""),
    });
  } finally {
    await emit("session_shutdown");
    widget?.dispose();
    mock.timers.reset();
    process.env = previous;
    rmSync(scratch, { recursive: true, force: true });
  }
}

test("/emote pet marks Mafe by default; cancel and same choice leave display and files alone", async () => {
  await withHost(async (h) => {
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    const before = readFileSync(h.configPath, "utf8");
    await h.command("pet");
    assert.deepEqual(h.dialogs, [{ title: "Choose pet", options: ["Mafe (active)", "Leo"] }]);
    h.choose("Mafe");
    await h.command("pet");
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    assert.equal(existsSync(h.selection), false);
    assert.equal(readFileSync(h.configPath, "utf8"), before);
    assert.deepEqual(h.notices, []);
    assert.equal(h.completions().filter((item: any) => item.value === "pet").length, 1);
    assert.ok(!h.completions().some((item: any) => ["mafe", "leo"].includes(item.value)));
    h.ctx.hasUI = false;
    await h.command("pet");
    assert.equal(h.dialogs.length, 2);
    assert.equal(existsSync(h.selection), false);
  });
});

test("Leo changes immediately, survives refresh/new sessions, and existing previews use its real frames", async () => {
  await withHost(async (h) => {
    const configBefore = readFileSync(h.configPath, "utf8");
    await h.command("demo");
    h.choose("Leo");
    await h.command("pet");
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    const saved = readFileSync(h.selection, "utf8");
    const modified = statSync(h.selection).mtimeMs;
    assert.deepEqual(readdirSync(h.dir).sort(), ["config.json", "pet-selection.json"]);
    mock.timers.tick(3500); // Switching stops the old demo and pending greeting/preview timers.
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.command("idle");
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.emit("model_select", { model: { id: "mapped" } });
    await h.emit("thinking_level_select", { level: "low" });
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    h.choose();
    await h.command("pet");
    assert.deepEqual(h.dialogs.at(-1).options, ["Mafe", "Leo (active)"]);
    h.choose("Leo");
    await h.command("pet");
    assert.equal(readFileSync(h.selection, "utf8"), saved);
    assert.equal(statSync(h.selection).mtimeMs, modified);
    assert.equal(readFileSync(h.configPath, "utf8"), configBefore);
    assert.deepEqual(h.notices, []);
    await h.restart();
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.command("think");
    assert.equal(h.bytes(), frame("leo", "think", "think_1.png"));
    mock.timers.tick(6000);
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.command("demo");
    mock.timers.tick(3500);
    assert.equal(h.bytes(), frame("leo", "think", "think_1.png"));
    await h.command("idle");
    mock.timers.tick(3500);
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    h.choose("Mafe");
    await h.command("pet");
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    await h.restart();
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
  }, { emotes: [{ model: "mapped", "emote-set": "pet" }, { "thinking-level": "low", "emote-set": "pet" }] });
});

test("malformed/invalid saved choices fall back without rewriting config; failed save keeps the active pet", async () => {
  await withHost(async (h) => {
    for (const invalid of ["{broken", '{"pet":"other"}', 'null', '"leo"']) {
      writeFileSync(h.selection, invalid);
      await h.restart();
      assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
      await h.command("pet");
      assert.equal(readFileSync(h.selection, "utf8"), invalid);
      assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    }
    // A directory at the destination reliably rejects atomic rename even when run as root.
    rmSync(h.selection);
    mkdirSync(h.selection);
    writeFileSync(join(h.selection, "unrelated"), "keep");
    writeFileSync(h.configPath, "{malformed unrelated config");
    h.choose("Leo");
    await h.command("pet");
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    assert.equal(h.notices.length, 1);
    assert.equal(h.notices[0][1], "error");
    assert.match(h.notices[0][0], /Could not save pet selection:/);
    assert.equal(readFileSync(h.configPath, "utf8"), "{malformed unrelated config");
    assert.equal(readFileSync(join(h.selection, "unrelated"), "utf8"), "keep");
    assert.deepEqual(readdirSync(h.dir).sort(), ["config.json", "pet-selection.json"]);
    h.choose();
    await h.command("pet");
    assert.deepEqual(h.dialogs.at(-1).options, ["Mafe (active)", "Leo"]);
  });
});

test("without a saved choice model/thinking mappings and original preview commands still work", async () => {
  await withHost(async (h) => {
    await h.emit("model_select", { model: { id: "mapped" } });
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.emit("thinking_level_select", { level: "low" });
    assert.equal(h.bytes(), frame("leo", "idle", "idle.png"));
    await h.emit("model_select", { model: { id: "ordinary" } });
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    await h.command("think");
    assert.equal(h.bytes(), frame("pet", "think", "think_1.png"));
    mock.timers.tick(6000);
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    await h.command("demo");
    mock.timers.tick(3500);
    assert.equal(h.bytes(), frame("pet", "think", "think_1.png"));
    await h.command("idle");
    assert.equal(h.bytes(), frame("pet", "idle", "idle.png"));
    assert.equal(existsSync(h.selection), false);
  }, { emotes: [{ model: "mapped", "emote-set": "leo" }, { "thinking-level": "low", "emote-set": "leo" }] });
});
