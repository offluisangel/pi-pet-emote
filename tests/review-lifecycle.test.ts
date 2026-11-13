import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import extension from "../src/index.ts";
import { AsciiRenderer } from "../src/render_ascii.ts";

/** Exercise registered handlers; renderer calls are the observable display boundary. */
async function withSession(t: any, run: (session: any) => Promise<void>) {
  const scratch = mkdtempSync(join(tmpdir(), "pet-lifecycle-"));
  const previous = { ...process.env };
  mock.timers.enable({ apis: ["setTimeout", "setInterval", "Date"] });
  const shown: string[] = [];
  const keys: string[] = [];
  const handlers = new Map<string, Function>();
  const commands = new Map<string, any>();
  const ctx = {
    hasUI: true, cwd: scratch,
    ui: { notify() {}, setWidget: (key: string) => keys.push(key), onTerminalInput: () => () => {} },
  };
  const emit = async (event: string, payload = {}) => handlers.get(event)?.(payload, ctx);
  try {
    for (const key of ["TMUX", "ZELLIJ", "ZELLIJ_SESSION_NAME", "KITTY_WINDOW_ID", "GHOSTTY_RESOURCES_DIR", "WEZTERM_PANE", "ITERM_SESSION_ID"]) delete process.env[key];
    process.env.HOME = scratch;
    process.env.PI_CODING_AGENT_DIR = join(scratch, "agent");
    process.env.GENTLE_PI_CONFIG_HOME = scratch;
    process.env.GENTLE_SHELL_CONFIG_HOME = scratch;
    process.env.TERM_PROGRAM = "";
    process.env.TERM = "screen";
    const dir = join(scratch, "agent", "extensions", "pi-pet-emote");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "config.json"), JSON.stringify({ accent: "pink" }));
    t.mock.method(AsciiRenderer.prototype, "showCycleFrame", (state: string, index: number) => { shown.push(`${state}#${index}`); return true; });
    t.mock.method(AsciiRenderer.prototype, "showFrame", (state: string, file: string) => { shown.push(`${state}/${file}`); return true; });
    extension({
      on: (event: string, handler: Function) => handlers.set(event, handler),
      registerCommand: (name: string, command: any) => commands.set(name, command),
      getThinkingLevel: () => "high",
    } as any);
    await emit("session_start");
    mock.timers.tick(500);
    mock.timers.tick(2400);
    assert.equal(shown.at(-1), "idle/idle.png");
    await run({ emit, shown, commands, ctx, keys });
  } finally {
    await emit("session_shutdown");
    mock.timers.reset();
    process.env = previous;
    rmSync(scratch, { recursive: true, force: true });
  }
}

for (const tool of ["bash", "subagent_run"]) {
  test(`a final failed ${tool} holds failure for 2400ms then returns to idle`, async (t) => {
    await withSession(t, async ({ emit, shown }) => {
      const payload = { toolName: tool, args: { agent: "validator" } };
      await emit("agent_start");
      await emit("tool_execution_start", payload);
      await emit("tool_execution_end", { ...payload, isError: true });
      const failure = shown.at(-1);
      assert.ok(failure?.startsWith(tool === "bash" ? "failure#" : "verify/fail.png"));
      mock.timers.tick(400);
      await emit("agent_end");
      mock.timers.tick(1999);
      assert.ok(shown.at(-1)?.startsWith(tool === "bash" ? "failure#" : "verify/fail.png"));
      mock.timers.tick(1);
      assert.equal(shown.at(-1), "idle/idle.png");
    });
  });
}

test("a failed tool in an active run still resumes thinking after its full hold", async (t) => {
  await withSession(t, async ({ emit, shown }) => {
    await emit("agent_start");
    await emit("tool_execution_start", { toolName: "bash" });
    await emit("tool_execution_end", { toolName: "bash", isError: true });
    mock.timers.tick(2399);
    assert.ok(shown.at(-1)?.startsWith("failure#"));
    mock.timers.tick(1);
    assert.equal(shown.at(-1), "think#0");
  });
});

test("successful tool completion keeps the success hold and ordinary completion stays idle", async (t) => {
  await withSession(t, async ({ emit, shown }) => {
    await emit("agent_start");
    await emit("agent_end");
    assert.equal(shown.at(-1), "idle/idle.png");
    await emit("agent_start");
    await emit("tool_execution_start", { toolName: "bash" });
    await emit("tool_execution_end", { toolName: "bash", isError: false });
    assert.equal(shown.at(-1), "read#0");
    await emit("agent_end");
    assert.equal(shown.at(-1), "success#0");
    mock.timers.tick(1599);
    assert.ok(shown.at(-1)?.startsWith("success#"));
    mock.timers.tick(1);
    assert.equal(shown.at(-1), "idle/idle.png");
  });
});

test("public /emote previews retain their duration and use the pet widget identity", async (t) => {
  await withSession(t, async ({ commands, ctx, shown, keys }) => {
    assert.deepEqual(keys, ["pi-pet-emote"]);
    const command = commands.get("emote");
    assert.equal(command.description, "Preview a pi-pet-emote state: /emote <state> | demo");
    await command.handler("think", ctx);
    assert.equal(shown.at(-1), "think#0");
    mock.timers.tick(5999);
    assert.ok(shown.at(-1)?.startsWith("think#"));
    mock.timers.tick(1);
    assert.equal(shown.at(-1), "idle/idle.png");
  });
});
