/* Regenerate canvas.config.js's WAVE_ANCHOR_POS from the wrapper's
 * NM_WAVE_STOPS table.
 *
 *   node tools/gen_wave_anchors.mjs        (run by scripts/build.sh)
 *
 * The Wave HUD draws the anchor you are on and the one you are heading toward,
 * which means the canvas needs each anchor's display position and name — data
 * the wrapper already owns. Hand-copying it meant re-ordering or re-spacing the
 * anchors would leave the HUD confidently naming the wrong sound, with nothing
 * to catch it. Glyph choice stays hand-authored in WAVE_GLYPHS (keyed by name);
 * this only generates the position/name pairs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const src = readFileSync(join(repo, "src", "dsp", "noisemaker_plugin.cpp"), "utf8");

const tbl = src.match(/static const nm_wave_stop_t NM_WAVE_STOPS\[\] = \{([\s\S]*?)\n\};/);
if (!tbl) { console.error("could not find NM_WAVE_STOPS"); process.exit(1); }

const anchors = [];
for (const line of tbl[1].split("\n")) {
  const m = line.match(/\{\s*(\d+)\s*,\s*"([^"]+)"/);
  if (m) anchors.push({ at: parseInt(m[1], 10), name: m[2] });
}
if (anchors.length < 2) { console.error("parsed too few anchors"); process.exit(1); }
for (let i = 1; i < anchors.length; i++)
  if (anchors[i].at <= anchors[i - 1].at) { console.error("anchor positions must ascend"); process.exit(1); }

const cfgPath = join(repo, "src", "canvas.config.js");
let cfg = readFileSync(cfgPath, "utf8");
const B = "/* BEGIN GENERATED WAVE_ANCHORS */", E = "/* END GENERATED WAVE_ANCHORS */";
const i0 = cfg.indexOf(B), i1 = cfg.indexOf(E);
if (i0 < 0 || i1 < 0) { console.error("markers not found in canvas.config.js"); process.exit(1); }

const body = "const WAVE_ANCHOR_POS = [\n" +
  anchors.map((a) => `  { at: ${a.at}, name: ${JSON.stringify(a.name)} },`).join("\n") +
  "\n];\n";
cfg = cfg.slice(0, i0) + B + "\n" + body + cfg.slice(i1);
writeFileSync(cfgPath, cfg);

/* Every anchor must have an icon, or the HUD silently falls back to a saw. */
const missing = anchors.filter((a) => !new RegExp(`"${a.name.replace(/[+]/g, "\\+")}"\\s*:`).test(cfg));
console.log(`canvas.config.js: ${anchors.length} wave anchors generated` +
            (missing.length ? `  WARNING: no WAVE_GLYPHS entry for ${missing.map((m) => m.name).join(", ")}` : ""));
