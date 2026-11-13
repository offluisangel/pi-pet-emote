/** Compatibility entry point; Python 3 owns the pet artwork and shipped timings. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const result = spawnSync("python3", ["-B", fileURLToPath(new URL("./build.py", import.meta.url))], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
