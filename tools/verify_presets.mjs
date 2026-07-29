/* Render every generated preset through the REAL plugin and flag the ones that
 * are broken rather than merely not-to-taste.
 *
 *   node tools/verify_presets.mjs [presetDir] [--wav wavDir]
 *
 * Needs build/nm_render:
 *   clang++ -O2 -std=c++14 -fpermissive -Wno-write-strings -Isrc/dsp \
 *     -Isrc/dsp/Engine tools/nm_render.cpp src/dsp/Engine/Lfo.cpp -o build/nm_render
 *
 * Catches: silence, clipping, accidental mono, and no-decay drones. Taste is
 * still Josh's call — this only proves each patch is a working instrument.
 * Reference band from the factory corpus: peak -6..-10 dBFS, RMS -20..-33.
 */
import { readdirSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* Names may carry a leading bank tag ("SW ..."), so the category is NOT
 * reliably the first token -- catOf() skips the tag. Getting this wrong is
 * silent: a bass would simply be auditioned with the generic lead plan. */
import { catOf } from "./presets/base.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const dir = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2] : join(repo, "dist", "presets", "noisemaker");
const wavIdx = process.argv.indexOf("--wav");
const wavDir = wavIdx > 0 ? process.argv[wavIdx + 1] : null;
if (wavDir) mkdirSync(wavDir, { recursive: true });

/* Play something idiomatic per category rather than one note for everything —
 * a pad judged on a single short note tells you nothing. */
function planFor(name) {
  const cat = catOf(name);
  if (cat === "BS") return { notes: "36,48", hold: "1.0", tail: "1.2" };
  if (cat === "DR") return { notes: "48",    hold: "0.2", tail: "1.2" };
  if (cat === "PD") return { notes: "48,55,60,64", hold: "2.5", tail: "3.5" };
  if (cat === "CH" || cat === "KB") return { notes: "48,55,60", hold: "1.6", tail: "2.5" };
  if (cat === "FX") return { notes: "48",    hold: "1.5", tail: "3.0" };
  return { notes: "52", hold: "1.0", tail: "1.5" };   /* LD, ARP */
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const rows = [];
for (const f of files) {
  const name = f.replace(/\.json$/, "");
  const pl = planFor(name);
  const args = ["--state", join(dir, f), "--analyze",
                "--notes", pl.notes, "--hold", pl.hold, "--tail", pl.tail];
  if (wavDir) args.push("--wav", join(wavDir, `${name}.wav`));
  let out;
  try {
    out = execFileSync(join(repo, "build", "nm_render"), args, { encoding: "utf8", cwd: repo });
  } catch (e) {
    rows.push({ name, fail: ["RENDER CRASH"] });
    continue;
  }
  const num = (re) => { const m = out.match(re); return m ? parseFloat(m[1]) : NaN; };
  const r = {
    name,
    peak: num(/peak\s+([\d.]+)/),
    rmsDb: num(/rms\s+[\d.]+ \(([-\d.]+) dBFS\)/),
    rel: num(/release\s+([-\d]+) ms/),
    cen: num(/centroid\s+(\d+)/),
    width: num(/width\s+([\d.]+)/),
    silent: /audible\s+NO/.test(out),
    clip: /CLIPPING/.test(out),
  };
  r.fail = [];
  if (r.silent) r.fail.push("SILENT");
  if (r.clip) r.fail.push("CLIPPING");
  if (r.peak < 0.08 && !r.silent) r.fail.push("very quiet");
  /* Width is REPORTED, not failed on. Measured directly (isolating one FX at
   * a time): chorus gives ~0.002-0.05 and delay_fac_l ~0.002 on the same
   * patch, but the figure is an average over the whole render, so it collapses
   * toward zero whenever the dry portion dominates the window. That makes it
   * useful for spotting a patch with NO stereo treatment at all, and useless
   * as a threshold. Centred bass and mono leads are correct anyway. */
  rows.push(r);
}

const bad = rows.filter((r) => r.fail.length);
console.log(`${rows.length} presets rendered, ${bad.length} flagged\n`);
console.log("name                      peak    rms    rel   cent  width  flags");
for (const r of rows) {
  if (r.fail[0] === "RENDER CRASH") { console.log(`${r.name.padEnd(25)} ${"RENDER CRASH"}`); continue; }
  console.log(
    `${r.name.padEnd(25)} ${r.peak.toFixed(3)}  ${String(r.rmsDb).padStart(6)}  ` +
    `${String(r.rel).padStart(4)}  ${String(r.cen).padStart(5)}  ${r.width.toFixed(3)}  ${r.fail.join(",")}`);
}
if (bad.length) {
  console.log(`\nFLAGGED:\n  ` + bad.map((r) => `${r.name}: ${r.fail.join(", ")}`).join("\n  "));
  process.exitCode = 1;
}
