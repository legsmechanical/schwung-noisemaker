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
import synthwave from "./presets/synthwave.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/* Two banks live in the same preset store, told apart by their name suffix
 * ("JG" / "SW"). --bank picks which one this run emits; the default stays the
 * original so nothing that used to call this script changes behaviour.
 * --keep leaves existing .json in the output directory alone, which is how the
 * two banks end up side by side on the device for A/B. */
const argv = process.argv.slice(2);
const bankArg = (() => { const i = argv.indexOf("--bank"); return i >= 0 ? argv[i + 1] : "jg"; })();
const keep = argv.includes("--keep");
const positional = argv.filter((a, i) =>
  !a.startsWith("--") && argv[i - 1] !== "--bank");
const outDir = positional[0] || join(here, "..", "dist", "presets", "noisemaker");

const BANK_SETS = {
  jg: [bass, leads, pads, keys, arps, extra],
  sw: [synthwave],
};
const BANKS = BANK_SETS[bankArg.toLowerCase()];
if (!BANKS) {
  console.error(`unknown --bank ${bankArg} (have: ${Object.keys(BANK_SETS).join(", ")})`);
  process.exit(1);
}

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

  /* The SW bank exists because the original one shipped 146 patches with the
   * LFOs and both envelopes routed to None/Off — amounts set, destinations
   * never assigned, so it LOOKED modulated in the state dict and was static.
   * A destination with no depth (or depth with no destination) is the same
   * bug wearing a different hat, so require both on at least one route. */
  if (p.name.endsWith(" SW")) {
    const routes = [
      [p.state.lfo1_dest, p.state.lfo1_amount],
      [p.state.lfo2_dest, p.state.lfo2_amount],
      [p.state.free_dest, p.state.free_amt],
      [p.state.env_dest,  p.state.env_amt],
    ];
    if (!routes.some(([dest, amt]) => dest > 0 && amt > 0))
      errs.push(`${p.name}: no modulation routed (dest>0 AND amount>0 required in the SW bank)`);
    for (const [i, [dest, amt]] of routes.entries())
      if (dest > 0 && amt === 0)
        errs.push(`${p.name}: mod route ${i + 1} has a destination but zero depth`);
  }

  for (const [k, v] of Object.entries(p.state)) {
    if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`${p.name}: ${k} = ${v}`);
  }
}
if (errs.length) {
  console.error("CONTRACT ERRORS:\n  " + errs.join("\n  "));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(outDir) && !keep)
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
