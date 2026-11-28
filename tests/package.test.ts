import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { findEmoteSetDir, resolveEmoteSet } from "../src/emotes.ts";

const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("public package name is pi-pet-emote", () => assert.equal(pkg.name, "pi-pet-emote"));
test("package lock versions match the source manifest", () => {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
});
test("current package author is structured, not an upstream credit", () => {
  assert.equal(pkg.author.name, "offluisangel");
  assert.match(pkg.author.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
});
test("public package links point to the approved GitHub repository", () => {
  assert.deepEqual(pkg.repository, {
    type: "git", url: "git+https://github.com/offluisangel/pi-pet-emote.git",
  });
  assert.equal(pkg.homepage, "https://github.com/offluisangel/pi-pet-emote#readme");
  assert.deepEqual(pkg.bugs, { url: "https://github.com/offluisangel/pi-pet-emote/issues" });
});
test("MIT license retains both original notices and adds the current author", () => {
  const license = readFileSync(join(root, "LICENSE"), "utf8");
  for (const name of ["Eiji Onchi", "efolchmontiel", "offluisangel"]) {
    assert.ok(license.includes(`Copyright (c) 2026 ${name}`));
  }
  assert.ok(license.startsWith("MIT License\n"));
  assert.ok(license.includes('THE SOFTWARE IS PROVIDED "AS IS"'));
  assert.ok(license.endsWith("SOFTWARE.\n"));
});
test("existing Pi declarations, runtime allowlist and legacy set resolution remain intact", () => {
  assert.deepEqual(pkg.pi, { image: `https://cdn.jsdelivr.net/npm/pi-pet-emote@${pkg.version}/docs/package-cover.png`, extensions: ["./src/index.ts"] });
  assert.deepEqual(pkg.files, ["src", "emotes", "docs/avatar.png", "docs/package-cover.png", "config.json", "README.md", "LICENSE"]);
  assert.ok(pkg.keywords.includes("pi-package"));
  assert.equal(pkg.engines.node, ">=22.19.0");
  assert.equal(resolveEmoteSet("any", "off", []), "pet");
  assert.equal(findEmoteSetDir("unknown", root, root), join(root, "emotes", "pet"));
});

test("pack:check validates a real tarball without leaving public artifacts", () => {
  const result = spawnSync("npm", ["run", "pack:check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("pack:check accepts the source manifest version without changing input or leaving artifacts", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pet-package-version-test-"));
  try {
    for (const path of ["package.json", "README.md", "LICENSE", "src", "docs/avatar.png", "docs/package-cover.png", "config.json", "emotes", "scripts/check-package.mjs"]) {
      cpSync(join(root, path), join(scratch, path), { recursive: true });
    }
    writeFileSync(join(scratch, "package.json"), JSON.stringify({ ...pkg, version: "9.8.7", pi: { ...pkg.pi, image: "https://cdn.jsdelivr.net/npm/pi-pet-emote@9.8.7/docs/package-cover.png" } }, null, 2) + "\n");
    const before = readFileSync(join(scratch, "package.json"));
    const entries = readdirSync(scratch).sort();
    const result = spawnSync("npm", ["run", "pack:check"], { cwd: scratch, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /package check: pi-pet-emote@9\.8\.7; \d+ files; 145 pet frames; \d+ bytes packed; \d+ bytes unpacked/);
    assert.deepEqual(readFileSync(join(scratch, "package.json")), before);
    assert.deepEqual(readdirSync(scratch).sort(), entries);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

for (const scenario of ["missing Leo metadata", "missing Leo frame", "unapproved set", "Leo extra file"] as const) {
  test(`pack:check rejects ${scenario} without repairing package input`, () => {
    const scratch = mkdtempSync(join(tmpdir(), "leo-package-test-"));
    try {
      for (const path of ["package.json", "README.md", "LICENSE", "src", "docs/avatar.png", "docs/package-cover.png", "config.json", "emotes", "scripts/check-package.mjs"]) {
        cpSync(join(root, path), join(scratch, path), { recursive: true });
      }
      if (scenario === "missing Leo metadata") rmSync(join(scratch, "emotes/leo/emotes.json"));
      if (scenario === "missing Leo frame") rmSync(join(scratch, "emotes/leo/idle/idle.png"));
      if (scenario === "unapproved set") cpSync(join(root, "emotes/leo"), join(scratch, "emotes/unknown"), { recursive: true });
      if (scenario === "Leo extra file") writeFileSync(join(scratch, "emotes/leo/notes.txt"), "not a runtime asset\n");
      const before = readFileSync(join(scratch, "package.json"));
      const result = spawnSync("npm", ["run", "pack:check"], { cwd: scratch, encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.deepEqual(readFileSync(join(scratch, "package.json")), before);
      if (scenario === "missing Leo metadata") assert.equal(existsSync(join(scratch, "emotes/leo/emotes.json")), false);
      if (scenario === "missing Leo frame") assert.equal(existsSync(join(scratch, "emotes/leo/idle/idle.png")), false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}

test("pack:check rejects a missing fallback without changing the input", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pet-package-test-"));
  try {
    for (const path of ["package.json", "README.md", "LICENSE", "src", "docs/avatar.png", "docs/package-cover.png", "config.json", "emotes/pet", "scripts/check-package.mjs"]) {
      cpSync(join(root, path), join(scratch, path), { recursive: true });
    }
    const before = readFileSync(join(scratch, "package.json"), "utf8");
    const result = spawnSync("npm", ["run", "pack:check"], { cwd: scratch, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(readFileSync(join(scratch, "package.json"), "utf8"), before);
    assert.equal(existsSync(join(scratch, "emotes/ascii-bot/ascii.yaml")), false);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
