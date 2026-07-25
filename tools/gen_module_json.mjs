/* Inject the wrapper's ui_hierarchy into src/module.json.
 *
 *   node tools/gen_module_json.mjs        (run by scripts/build.sh)
 *
 * WHY: the host populates a slot's param table (`inst->synth_params`) from
 * module.json ON DISK at synth load (chain_host.c -> parse_chain_params, which
 * wants an inline `ui_hierarchy` or `chain_params`). The custom-knob write path
 * (knob_find_param, chain_midi.c / chain_host.c) then strcmp's against that
 * table and SILENTLY does nothing on a miss. Without this block the table is
 * empty at load, so slot custom knobs only work as a side effect of something
 * else happening to refresh the param cache — i.e. intermittently. obxd ships
 * ui_hierarchy in its module.json, which is why obxd's knobs are reliable.
 *
 * Generated rather than hand-copied: the wrapper's kUiHierarchy is the single
 * source of truth, and a hand-maintained duplicate would silently drift the
 * moment a param is added or a level renamed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const src = readFileSync(join(repo, "src", "dsp", "noisemaker_plugin.cpp"), "utf8");

const m = src.match(/static const char \*kUiHierarchy\s*=\s*([\s\S]*?);\s*\n/);
if (!m) { console.error("could not find kUiHierarchy in the wrapper"); process.exit(1); }

/* Concatenated C string literals -> the actual string. */
let out = "";
for (const lit of m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
  out += lit[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
}

let uih;
try { uih = JSON.parse(out); }
catch (e) { console.error("wrapper ui_hierarchy is not valid JSON:", e.message); process.exit(1); }

const jsonPath = join(repo, "src", "module.json");
const mod = JSON.parse(readFileSync(jsonPath, "utf8"));
mod.ui_hierarchy = uih;
writeFileSync(jsonPath, JSON.stringify(mod, null, 2) + "\n");

const levels = Object.keys(uih.levels || {});
const keys = new Set();
for (const l of Object.values(uih.levels || {})) {
  for (const k of l.knobs || []) keys.add(k);
  for (const p of l.params || []) keys.add(typeof p === "string" ? p : (p.key || `[${p.level}]`));
}
console.log(`module.json: embedded ui_hierarchy — ${levels.length} levels, ${keys.size} distinct keys`);
