import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { encodePng } from "../src/png.ts";

const root = join(import.meta.dirname, "..");
const paths = ["emotes/pet/idle/idle.png", "emotes/pet/emotes.json", "emotes/leo/idle/idle.png", "emotes/leo/emotes.json", "docs/avatar.png", "docs/leo/contact-sheet.png"];
const snapshot = (dir: string): unknown => readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => [entry.name, entry.isDirectory() ? snapshot(join(dir, entry.name)) : readFileSync(join(dir, entry.name))]);

test("check:generated accepts matching output and rejects altered or missing output without changing inputs", () => {
  const fixture = mkdtempSync(join(tmpdir(), "generated-check-"));
  const put = (path: string, data: string | Buffer) => {
    mkdirSync(dirname(join(fixture, path)), { recursive: true });
    writeFileSync(join(fixture, path), data);
  };
  try {
    for (const path of ["scripts/check-generated.mjs", "src/png.ts"]) {
      mkdirSync(dirname(join(fixture, path)), { recursive: true });
      cpSync(join(root, path), join(fixture, path));
    }
    put("package.json", JSON.stringify({ type: "module", scripts: { sprites: "python3 -B scripts/sprites/build.py && node scripts/sprites/leo.ts", "check:generated": "node scripts/check-generated.mjs" } }));
    const png = encodePng({ width: 1, height: 1, data: new Uint8Array([1, 2, 3, 255]) });
    for (const path of paths) {
      const data = path.endsWith(".png") ? png : "{}\n";
      put(path, data);
      put(`seed/${path}`, data);
    }
    // Tiny deterministic builders keep this a checker test, not a second sprite rebuild.
    put("scripts/sprites/build.py", `from pathlib import Path\nimport shutil, sys\nout = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')\nshutil.copytree('seed/emotes/pet', out / 'emotes/pet', dirs_exist_ok=True)\n(out / 'docs').mkdir(parents=True, exist_ok=True)\nshutil.copyfile('seed/docs/avatar.png', out / 'docs/avatar.png')\n`);
    put("scripts/sprites/leo.ts", `import {cpSync, mkdirSync} from 'node:fs'; import {dirname} from 'node:path';\nconst out = process.argv[2] || 'emotes/leo';\nconst sheet = process.argv[3] || 'docs/leo/contact-sheet.png';\ncpSync('seed/emotes/leo', out, {recursive:true}); mkdirSync(dirname(sheet), {recursive:true}); cpSync('seed/docs/leo/contact-sheet.png', sheet);\n`);
    const run = () => spawnSync("npm", ["run", "check:generated"], { cwd: fixture, encoding: "utf8" });
    let before = snapshot(fixture);
    const clean = run();
    assert.equal(clean.status, 0, clean.stderr);
    assert.deepEqual(snapshot(fixture), before, "matching inputs stay unchanged");

    for (const path of paths.filter((path) => path !== "emotes/leo/idle/idle.png")) {
      put(path, path.endsWith(".png") ? encodePng({ width: 1, height: 1, data: new Uint8Array([9, 8, 7, 255]) }) : '{"marker":"keep me"}\n');
    }
    rmSync(join(fixture, "emotes/leo/idle/idle.png"));
    before = snapshot(fixture);
    const drift = run();
    assert.equal(drift.status, 1, drift.stderr);
    assert.deepEqual(snapshot(fixture), before, "drift checking must not repair altered or missing files");
    for (const path of paths) assert.ok(drift.stderr.includes(path), `diagnostic names ${path}`);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
