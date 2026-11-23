import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { decodePng } from "../src/png.ts";

const walk = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
}) : [];
const outputs = (root) => [...walk(join(root, "emotes/pet")), ...walk(join(root, "emotes/leo")),
  join(root, "docs/avatar.png"), join(root, "docs/leo/contact-sheet.png")].map((path) => relative(root, path));
const scratch = mkdtempSync(join(tmpdir(), "pet-generated-"));
try {
  execFileSync("python3", ["-B", "scripts/sprites/build.py", scratch], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/sprites/leo.ts", join(scratch, "emotes/leo"), join(scratch, "docs/leo/contact-sheet.png")], { stdio: "inherit" });
  const drift = [];
  for (const path of new Set([...outputs(scratch), ...outputs(process.cwd())])) {
    try {
      const actual = readFileSync(path), expected = readFileSync(join(scratch, path));
      // PNG compression is not part of the artwork contract; dimensions and RGBA are.
      assert.deepEqual(path.endsWith(".png") ? decodePng(actual) : actual,
        path.endsWith(".png") ? decodePng(expected) : expected);
    } catch {
      drift.push(path);
    }
  }
  if (drift.length) throw new Error(`generated output drift; run npm run sprites and inspect the changes:\n${drift.sort().join("\n")}`);
  console.log("generated check: pet and Leo pixels, metadata, avatar and Leo contact sheet unchanged");
} catch (error) {
  console.error(`generated check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
