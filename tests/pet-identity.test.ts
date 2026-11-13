import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLayeredConfig } from "../src/config.ts";
import { EXTENSION_NAME } from "../src/emotes.ts";

test("pet configuration uses the new user and project paths with project precedence", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pet-config-"));
  const previous = process.env.PI_CODING_AGENT_DIR;
  try {
    const agent = join(scratch, "agent");
    const cwd = join(scratch, "project");
    const ext = join(scratch, "ext");
    process.env.PI_CODING_AGENT_DIR = agent;
    assert.equal(EXTENSION_NAME, "pi-pet-emote");
    const user = join(agent, "extensions", "pi-pet-emote");
    const project = join(cwd, ".pi", "extensions", "pi-pet-emote");
    mkdirSync(user, { recursive: true });
    writeFileSync(join(user, "config.json"), JSON.stringify({ size: 14 }));
    assert.equal(loadLayeredConfig(ext, cwd).config.size, 14);
    mkdirSync(project, { recursive: true });
    writeFileSync(join(project, "config.json"), JSON.stringify({ size: 16 }));
    assert.equal(loadLayeredConfig(ext, cwd).config.size, 16);
  } finally {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
    rmSync(scratch, { recursive: true, force: true });
  }
});
