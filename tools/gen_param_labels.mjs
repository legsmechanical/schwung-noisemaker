/* Regenerate canvas.config.js's PARAM_NAMES from the wrapper's PARAMS[] table.
 *
 *   node tools/gen_param_labels.mjs        (run by scripts/build.sh)
 *
 * The canvas header shows the FULL parameter name while a knob is touched,
 * while the cell label under the knob stays abbreviated ("Cut" / "Res") because
 * a 128x64 grid has no room for more. The kit can resolve those names at
 * runtime by reading `chain_params` through ctx.getParam -- but that read is
 * deferred to the first knob touch and its result is cached for the whole
 * editor session, and `shadow_get_param` returns null when the param bus is not
 * idle. A knob touch is exactly when the bus is busy, so one unlucky read
 * poisons the map and every header falls back to the abbreviation until the
 * module is reloaded. Nothing logs.
 *
 * Baking the map into CONFIG.paramNames removes the runtime read from the path
 * entirely: the names are correct on the first frame, off-device in the
 * previewer, and identical every session. Generated rather than hand-copied
 * because these are the same strings the host menus show, and a stale hand-copy
 * would have the canvas confidently naming a parameter something the menu does
 * not -- with nothing to catch it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const src = readFileSync(join(repo, "src", "dsp", "noisemaker_plugin.cpp"), "utf8");

const tbl = src.match(/static const param_def_t PARAMS\[\] = \{([\s\S]*?)\n\};/);
if (!tbl) { console.error("could not find PARAMS[]"); process.exit(1); }

/* Rows look like:  { "cutoff", "Cutoff", CUTOFF, K_PCT, 0,0, 0,{0} },
 *
 * ⚠ Requiring the third field (the engine-index IDENTIFIER) is what separates a
 * param row from an enum OPTION array, which sits on its own continuation line
 * and also opens with two string literals:
 *     { "lfo1_wave", "LFO1 Wave", LFO1WAVEFORM, K_LFOWAVE,0,0, 6,
 *           {"Sin","Tri","Saw","Sqr","S+H","Rnd"} },
 * Without it this harvests key="Sin" name="Tri". The duplicate-key check below
 * caught exactly that. */
const names = [];
for (const line of tbl[1].split("\n")) {
  const m = line.match(/^\s*\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*[A-Za-z_][A-Za-z0-9_]*\s*,/);
  if (m) names.push({ key: m[1], name: m[2] });
}
if (names.length < 20) { console.error(`parsed only ${names.length} params; aborting`); process.exit(1); }

const dupes = names.map((n) => n.key).filter((k, i, a) => a.indexOf(k) !== i);
if (dupes.length) { console.error(`duplicate param keys: ${dupes.join(", ")}`); process.exit(1); }

const cfgPath = join(repo, "src", "canvas.config.js");
let cfg = readFileSync(cfgPath, "utf8");
const B = "/* BEGIN GENERATED PARAM_NAMES */", E = "/* END GENERATED PARAM_NAMES */";
const i0 = cfg.indexOf(B), i1 = cfg.indexOf(E);
if (i0 < 0 || i1 < 0) { console.error("PARAM_NAMES markers not found in canvas.config.js"); process.exit(1); }

const body = "const PARAM_NAMES = {\n" +
  names.map((n) => `  ${JSON.stringify(n.key)}: ${JSON.stringify(n.name)},`).join("\n") +
  "\n};\n";
cfg = cfg.slice(0, i0) + B + "\n" + body + cfg.slice(i1);
writeFileSync(cfgPath, cfg);

/* Any cell whose key is not in the table would fall back to its abbreviation.
 * Cells with no key at all (local UI cursors) are expected and skipped. */
const keys = new Set(names.map((n) => n.key));
const cellKeys = new Set();
for (const m of cfg.matchAll(/\b(?:uni|bip|tog|enumc)\(\s*"([a-z0-9_]+)"/g)) cellKeys.add(m[1]);
const unnamed = [...cellKeys].filter((k) => !keys.has(k));

console.log(`canvas.config.js: ${names.length} param names generated` +
            (unnamed.length ? `  WARNING: no PARAMS[] entry for ${unnamed.join(", ")}` : ""));
