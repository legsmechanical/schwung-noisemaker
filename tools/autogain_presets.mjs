/* Level the generated bank by MEASUREMENT rather than by hand.
 *
 *   node tools/autogain_presets.mjs [presetDir]
 *
 * The "nothing dry" brief stacks chorus + reverb + delay + drive on every
 * patch, and each wet stage adds gain with no limiter downstream — so authored
 * volumes land anywhere from -48 dBFS to clipping. This renders each preset,
 * measures peak, and binary-searches its `volume` until the peak sits in the
 * factory-corpus band, then rewrites the JSON in place.
 *
 * Volume is log-scaled in the engine (AudioUtils::getLogScaledVolume), so a
 * linear correction does not work — hence the search.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* Names may carry a leading bank tag ("SW ..."), so the category is NOT
 * reliably the first token -- catOf() skips the tag. Getting this wrong is
 * silent: a bass would simply be auditioned with the generic lead plan. */
import { catOf } from "./presets/base.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const dir = process.argv[2] || join(repo, "dist", "presets", "noisemaker");

const TARGET = 0.46;          /* mid of the factory peak band (0.29..0.51) */
const LO = 0.34, HI = 0.60;   /* accept without further iteration */
const MAX_ITERS = 7;

function planFor(name) {
  const cat = catOf(name);
  if (cat === "BS") return ["--notes", "36,48", "--hold", "1.0", "--tail", "1.2"];
  if (cat === "DR") return ["--notes", "48", "--hold", "0.2", "--tail", "1.2"];
  if (cat === "PD") return ["--notes", "48,55,60,64", "--hold", "2.5", "--tail", "3.5"];
  if (cat === "CH" || cat === "KB") return ["--notes", "48,55,60", "--hold", "1.6", "--tail", "2.5"];
  if (cat === "FX") return ["--notes", "48", "--hold", "1.5", "--tail", "3.0"];
  return ["--notes", "52", "--hold", "1.0", "--tail", "1.5"];
}

function peakOf(file, name) {
  const out = execFileSync(join(repo, "build", "nm_render"),
    ["--state", file, "--analyze", ...planFor(name)], { encoding: "utf8", cwd: repo });
  const m = out.match(/peak\s+([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
let changed = 0, stuck = [];

for (const f of files) {
  const path = join(dir, f);
  const name = f.replace(/\.json$/, "");
  const doc = JSON.parse(readFileSync(path, "utf8"));

  let peak = peakOf(path, name);
  if (peak >= LO && peak <= HI) continue;

  const orig = doc.state.volume;
  let lo = 1, hi = 100, best = orig, bestErr = Infinity;

  for (let it = 0; it < MAX_ITERS; it++) {
    const mid = Math.round((lo + hi) / 2);
    doc.state.volume = mid;
    writeFileSync(path, JSON.stringify(doc));
    peak = peakOf(path, name);

    const err = Math.abs(peak - TARGET);
    if (err < bestErr) { bestErr = err; best = mid; }
    if (peak >= LO && peak <= HI) { best = mid; break; }
    if (peak > TARGET) hi = mid - 1; else lo = mid + 1;
    if (lo > hi) break;
  }

  doc.state.volume = best;
  writeFileSync(path, JSON.stringify(doc));
  const final = peakOf(path, name);
  if (final < LO || final > HI) stuck.push(`${name}: peak ${final.toFixed(3)} at volume ${best}`);
  if (best !== orig) changed++;
  console.log(`${name.padEnd(26)} vol ${String(orig).padStart(3)} -> ${String(best).padStart(3)}   peak ${final.toFixed(3)}`);
}

console.log(`\n${changed}/${files.length} re-levelled`);
if (stuck.length) {
  /* Volume alone cannot fix these — the patch itself is too hot or too thin
   * (e.g. a band-pass that removed the fundamental), so they need authoring. */
  console.log(`\nCOULD NOT REACH TARGET (needs an authoring fix, not gain):\n  ` + stuck.join("\n  "));
}
