import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const scratch = mkdtempSync(join(tmpdir(), "pet-pack-"));
const root = process.cwd();
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : [relative(root, path).split("\\").join("/")];
});
try {
  const [packed] = JSON.parse(execFileSync("npm", [
    "pack", "--ignore-scripts", "--json", "--pack-destination", scratch,
  ], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const archive = join(scratch, packed.filename);
  const tar = (...args) => execFileSync("tar", args, { encoding: "utf8" });
  const files = tar("-tzf", archive).trim().split("\n").filter((name) => !name.endsWith("/"));
  const contents = (path) => tar("-xOzf", archive, `package/${path}`);
  const requireFile = (path) => assert.ok(files.includes(`package/${path}`), `missing ${path}`);
  for (const file of files) {
    assert.match(file, /^package\/(?:package\.json|README\.md|LICENSE|config\.json|docs\/avatar\.png|src\/[^/]+\.ts|emotes\/(?:(?:pet|leo)\/(?:emotes\.json|[^/]+\/[^/]+\.png)|ascii[^/]*\/ascii\.yaml))$/, `unexpected package file: ${file}`);
  }
  for (const path of ["package.json", "LICENSE", "README.md", "config.json", "emotes/pet/emotes.json", "emotes/ascii-bot/ascii.yaml"]) requireFile(path);
  const manifest = JSON.parse(contents("package.json"));
  assert.equal(manifest.name, "pi-pet-emote");
  const sourceManifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(manifest.version, sourceManifest.version);
  assert.deepEqual(manifest.pi, { image: "./docs/avatar.png", extensions: ["./src/index.ts"] });
  for (const path of [manifest.pi.image, ...manifest.pi.extensions]) requireFile(path.replace(/^\.\//, ""));
  // Compare against actual runtime files, never an authoring fixture excluded from npm.
  for (const path of walk(join(root, "src"))) requireFile(path);
  const frames = walk(join(root, "emotes/pet")).filter((path) => path.endsWith(".png"));
  assert.equal(frames.length, 76);
  for (const frame of frames) requireFile(frame);
  assert.equal(files.filter((path) => /^package\/emotes\/pet\/.*\.png$/.test(path)).length, 76);
  requireFile("emotes/leo/emotes.json");
  const leoFrames = walk(join(root, "emotes/leo")).filter((path) => path.endsWith(".png"));
  assert.equal(leoFrames.length, 76);
  for (const frame of leoFrames) requireFile(frame);
  assert.equal(files.filter((path) => /^package\/emotes\/leo\/.*\.png$/.test(path)).length, 76);
  const license = contents("LICENSE");
  assert.equal(license, readFileSync(join(root, "LICENSE"), "utf8"));
  for (const name of ["Eiji Onchi", "efolchmontiel", "offluisangel"]) {
    assert.ok(license.includes(`Copyright (c) 2026 ${name}`), `missing MIT notice: ${name}`);
  }
  assert.ok(license.startsWith("MIT License\n"));
  assert.ok(license.includes("Permission is hereby granted, free of charge"));
  assert.ok(license.includes('THE SOFTWARE IS PROVIDED "AS IS"'));
  assert.ok(license.endsWith("SOFTWARE.\n"));
  console.log(`package check: ${manifest.name}@${manifest.version}; ${files.length} files; 76 pet frames; ${packed.size} bytes packed; ${packed.unpackedSize} bytes unpacked`);
} catch (error) {
  console.error(`package check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
