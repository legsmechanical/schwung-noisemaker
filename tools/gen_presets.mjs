/* Generate the authored preset bank as wrapped module-preset JSON.
 *
 *   node tools/gen_presets.mjs [outdir]        (default dist/presets/noisemaker)
 *
 * Output format is the host's User-Presets store contract:
 *   {"name":..,"module":"noisemaker","version":1,"state":{..display units..}}
 * read by scan_move_presets() from /data/UserData/schwung/presets/noisemaker/.
 * The browser re-opendirs on every open, so no host restart is needed.
 *
 * Verify what this emits with tools/verify_presets.mjs BEFORE deploying — it
 * renders every preset through the real plugin and catches silent, clipping,
 * mono or dead patches.
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expand, DEFAULTS } from "./presets/base.mjs";

import bass from "./presets/bass.mjs";
import leads from "./presets/leads.mjs";
import pads from "./presets/pads.mjs";
import keys from "./presets/keys.mjs";
import arps from "./presets/arps.mjs";
import extra from "./presets/extra.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] || join(here, "..", "dist", "presets", "noisemaker");

const BANKS = [bass, leads, pads, keys, arps, extra];

const KEYS = Object.keys(DEFAULTS);
const presets = [];
for (const bank of BANKS) for (const spec of bank) presets.push(...expand(spec));

/* ---- contract checks: cheap, catch authoring slips before rendering ---- */
const errs = [];
const seen = new Set();
for (const p of presets) {
  if (seen.has(p.name)) errs.push(`duplicate name: ${p.name}`);
  seen.add(p.name);
  if (p.name.length > 24) errs.push(`name >24 chars (browser truncates): ${p.name}`);

  const extra = Object.keys(p.state).filter((k) => !KEYS.includes(k));
  if (extra.length) errs.push(`${p.name}: unknown key(s) ${extra.join(",")}`);
  const missing = KEYS.filter((k) => !(k in p.state));
  if (missing.length) errs.push(`${p.name}: missing ${missing.join(",")}`);

  /* The trap: setOscBitcrusher treats 1.0 (display 100) as OFF, so a low
   * value is MAXIMUM destruction. Anything under 100 must be deliberate. */
  if (p.state.bitcrush !== 100 && p.state.bitcrush > 60)
    errs.push(`${p.name}: bitcrush ${p.state.bitcrush} is a weak-but-on crush; use 100 (off) or <60`);
  /* Below ~35 the quantiser step exceeds the oscillator sum and (int)(x*d)/d
   * floors everything to zero -- the patch goes SILENT, not crunchy. */
  if (p.state.bitcrush < 35)
    errs.push(`${p.name}: bitcrush ${p.state.bitcrush} quantises to silence (floor is ~35)`);

  /* "Nothing dry" is the brief — every preset needs at least one wet stage. */
  const wet = p.state.chorus1 || p.state.chorus2 || p.state.reverb_wet > 0 || p.state.delay_wet > 0;
  if (!wet) errs.push(`${p.name}: completely dry`);

  for (const [k, v] of Object.entries(p.state)) {
    if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`${p.name}: ${k} = ${v}`);
  }
}
if (errs.length) {
  console.error("CONTRACT ERRORS:\n  " + errs.join("\n  "));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(outDir))
  for (const f of readdirSync(outDir)) if (f.endsWith(".json")) unlinkSync(join(outDir, f));

for (const p of presets) {
  writeFileSync(join(outDir, `${p.name}.json`), JSON.stringify(p));
}

const byCat = {};
for (const p of presets) {
  const c = p.name.split(" ")[0];
  byCat[c] = (byCat[c] || 0) + 1;
}
console.log(`wrote ${presets.length} presets -> ${outDir}`);
console.log("  " + Object.entries(byCat).map(([c, n]) => `${c} ${n}`).join("   "));
