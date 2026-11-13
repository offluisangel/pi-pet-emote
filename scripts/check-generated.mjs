import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const snapshot = () => Object.fromEntries([...walk("emotes/pet"), "docs/avatar.png"].sort().map((path) => [
  path, createHash("sha256").update(readFileSync(path)).digest("hex"),
]));
const before = snapshot();
execFileSync("npm", ["run", "sprites"], { stdio: "inherit" });
assert.deepEqual(snapshot(), before, "generated output drift; run npm run sprites and inspect the changes");
console.log("generated check: pet frames, metadata and avatar unchanged");
