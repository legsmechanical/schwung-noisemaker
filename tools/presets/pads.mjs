/* PD — pads. The one category the factory bank runs fully polyphonic
 * (median voices 6) with slow envelopes: amp A .50 / R .60, filter A .52 / R .65.
 * Corpus filter median is LP6 (gentle) — pads want slope, not bite. */
import { FX, st } from "./base.mjs";

const P = { voices: 6, vel_vol: 25, vel_env: 15, pw_pitch: 20 };

export default [
  /* ---- staples --------------------------------------------------------- */

  { cat: "PD", name: "Vapour", fx: [FX.chorusWide, FX.hall, FX.quarter],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 70, detune: 44,
         filter_type: 3, cutoff: 40, resonance: 14, keyfollow: 30,
         filter_env: 34, fenv_a: 48, fenv_d: 60, fenv_s: 40, fenv_r: 66,
         aenv_a: 46, aenv_d: 60, aenv_s: 84, aenv_r: 64 } },

  { cat: "PD", name: "Nightfall", fx: [FX.chorusWide, FX.cathedral, FX.tape],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(-12),
         osc3_vol: 26, detune: 38, filter_type: 2, cutoff: 34, resonance: 18,
         filter_env: 38, fenv_a: 52, fenv_d: 62, fenv_s: 34, fenv_r: 70,
         aenv_a: 52, aenv_s: 82, aenv_r: 70 } },

  /* Warm analog pad. Attack length is the whole personality — slow enough to
   * swell, fast enough to still be playable. Worth choosing by ear. */
  { cat: "PD", name: "Warm Drift", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 68, detune: 40,
         vintage: 22, filter_type: 3, cutoff: 42, resonance: 12,
         filter_env: 30, fenv_a: 44, fenv_d: 58, fenv_s: 42, fenv_r: 64 },
    vars: [
      { p: { aenv_a: 30, aenv_r: 54 } },
      { p: { aenv_a: 50, aenv_r: 68 } },
      { p: { aenv_a: 68, aenv_r: 80 } },
    ] },

  { cat: "PD", name: "Glass House", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...P, osc1_wave: 0, osc2_wave: 3, osc2_vol: 64, osc2_tune: st(12),
         detune: 24, filter_type: 3, cutoff: 52, resonance: 10,
         filter_env: 24, fenv_a: 50, fenv_d: 60, fenv_s: 44, fenv_r: 70,
         aenv_a: 48, aenv_s: 86, aenv_r: 72 } },

  { cat: "PD", name: "Halogen", fx: [FX.chorusWide, FX.hall, FX.pingpong],
    p: { ...P, osc1_wave: 1, osc1_pw: 56, osc2_wave: 1, osc2_vol: 66,
         detune: 46, lfo1_wave: 0, lfo1_rate: 12, lfo1_amount: 22, lfo1_dest: 4,
         filter_type: 3, cutoff: 46, resonance: 14, filter_env: 28,
         fenv_a: 46, fenv_d: 58, fenv_s: 40, fenv_r: 66,
         aenv_a: 44, aenv_s: 84, aenv_r: 66 } },

  /* ---- darkwave --------------------------------------------------------- */

  { cat: "PD", name: "Cathedral", fx: [FX.chorusDeep, FX.cathedral, FX.tape],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 68, osc2_tune: st(7),
         detune: 34, filter_type: 1, cutoff: 32, resonance: 20,
         filter_env: 36, fenv_a: 56, fenv_d: 64, fenv_s: 32, fenv_r: 74,
         aenv_a: 58, aenv_s: 80, aenv_r: 78 } },

  { cat: "PD", name: "Mourning", fx: [FX.chorusDeep, FX.murk, FX.quarter],
    p: { ...P, osc1_wave: 0, osc2_wave: 2, osc2_vol: 62, osc2_tune: st(-12),
         detune: 30, vintage: 36, filter_type: 1, cutoff: 26, resonance: 24,
         filter_env: 34, fenv_a: 58, fenv_d: 66, fenv_s: 28, fenv_r: 76,
         aenv_a: 60, aenv_s: 78, aenv_r: 80, highpass: 6 } },

  { cat: "PD", name: "Ash Choir", fx: [FX.chorusWide, FX.cathedral, FX.tape],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(12),
         detune: 52, filter_type: 6, cutoff: 44, resonance: 30,
         filter_env: 26, fenv_a: 54, fenv_d: 62, fenv_s: 38, fenv_r: 72,
         aenv_a: 56, aenv_s: 82, aenv_r: 76 } },

  { cat: "PD", name: "Grave Mist", fx: [FX.chorusDeep, FX.murk, FX.tape],
    p: { ...P, osc1_wave: 1, osc1_pw: 34, osc2_wave: 1, osc2_vol: 60,
         osc2_tune: st(-12), detune: 42, vintage: 48, filter_type: 1,
         cutoff: 24, resonance: 26, filter_env: 32,
         fenv_a: 62, fenv_d: 68, fenv_s: 30, fenv_r: 78,
         aenv_a: 64, aenv_s: 78, aenv_r: 82 } },

  /* ---- industrial ------------------------------------------------------- */

  { cat: "PD", name: "Reactor Hum", fx: [FX.murk, FX.tape],
    p: { ...P, voices: 4, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64,
         osc2_tune: st(-12), detune: 56, filter_drive: 38, vintage: 54,
         filter_type: 1, cutoff: 28, resonance: 34, filter_env: 30,
         fenv_a: 50, fenv_d: 64, fenv_s: 34, fenv_r: 70,
         aenv_a: 40, aenv_s: 80, aenv_r: 72 } },

  { cat: "PD", name: "Cooling Tower", fx: [FX.chorusDeep, FX.cathedral, FX.tape],
    p: { ...P, voices: 4, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58,
         osc2_tune: st(7), ringmod: 14, detune: 44, filter_drive: 26,
         filter_type: 9, cutoff: 40, resonance: 34, filter_env: 28,
         fenv_a: 52, fenv_d: 62, fenv_s: 36, fenv_r: 72,
         aenv_a: 46, aenv_s: 78, aenv_r: 74 } },

  /* ---- new wave ---------------------------------------------------------- */

  { cat: "PD", name: "Polaroid", fx: [FX.chorusWide, FX.plate, FX.eighth],
    p: { ...P, osc1_wave: 1, osc1_pw: 62, osc2_wave: 2, osc2_vol: 58,
         detune: 26, filter_type: 3, cutoff: 50, resonance: 12,
         filter_env: 26, fenv_a: 34, fenv_d: 54, fenv_s: 40, fenv_r: 58,
         aenv_a: 30, aenv_s: 84, aenv_r: 56 } },

  { cat: "PD", name: "Magnetic", fx: [FX.chorusWide, FX.hall, FX.pingpong],
    p: { ...P, osc1_wave: 0, osc2_wave: 1, osc2_vol: 62, detune: 36,
         lfo1_wave: 0, lfo1_rate: 10, lfo1_amount: 16, lfo1_dest: 1,
         filter_type: 2, cutoff: 44, resonance: 20, filter_env: 30,
         fenv_a: 40, fenv_d: 58, fenv_s: 40, fenv_r: 64,
         aenv_a: 36, aenv_s: 84, aenv_r: 62 } },

  /* ---- feature-forward ---------------------------------------------------- */

  { cat: "PD", name: "State Drift", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, detune: 42,
         filter_type: 7, cutoff: 38, resonance: 32, filter_env: 32,
         fenv_a: 50, fenv_d: 62, fenv_s: 38, fenv_r: 70,
         aenv_a: 48, aenv_s: 84, aenv_r: 70 } },

  { cat: "PD", name: "Moog Veil", fx: [FX.chorusWide, FX.hall, FX.tape],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, detune: 38,
         filter_type: 10, cutoff: 34, resonance: 44, filter_drive: 22,
         filter_env: 36, fenv_a: 52, fenv_d: 62, fenv_s: 34, fenv_r: 72,
         aenv_a: 50, aenv_s: 82, aenv_r: 72 } },

  { cat: "PD", name: "Notch Fog", fx: [FX.chorusDeep, FX.murk, FX.quarter],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, detune: 48,
         filter_type: 6, cutoff: 42, resonance: 36, filter_env: 30,
         lfo2_wave: 0, lfo2_rate: 8, lfo2_amount: 24, lfo2_dest: 1,
         fenv_a: 54, fenv_d: 64, fenv_s: 34, fenv_r: 74,
         aenv_a: 52, aenv_s: 80, aenv_r: 76 } },

  /* FM pad — sine carrier, slow swell. */
  { cat: "PD", name: "Bell Drift", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...P, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 78,
         osc2_fm: 4, osc2_tune: st(-4), filter_type: 3, cutoff: 58,
         resonance: 10, filter_env: 20, fenv_a: 50, fenv_d: 60, fenv_s: 40,
         aenv_a: 54, aenv_s: 84, aenv_r: 76 } },

  { cat: "PD", name: "Sub Bed", fx: [FX.chorusDeep, FX.murk, FX.tape],
    p: { ...P, voices: 4, osc1_wave: 0, osc1_vol: 60, osc2_wave: 2, osc2_vol: 48,
         osc3_vol: 62, osc2_tune: st(-12), detune: 22, filter_type: 3,
         cutoff: 30, resonance: 10, filter_env: 24,
         fenv_a: 46, fenv_d: 60, fenv_s: 40, fenv_r: 68,
         aenv_a: 44, aenv_s: 86, aenv_r: 74 } },

  { cat: "PD", name: "Aurora", fx: [FX.chorusWide, FX.cathedral, FX.pingpong],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 68, osc2_tune: st(12),
         detune: 30, filter_type: 3, cutoff: 54, resonance: 16,
         lfo1_wave: 0, lfo1_rate: 8, lfo1_amount: 18, lfo1_dest: 1,
         filter_env: 26, fenv_a: 48, fenv_d: 60, fenv_s: 44, fenv_r: 70,
         aenv_a: 50, aenv_s: 86, aenv_r: 74 } },

  { cat: "PD", name: "Static Bloom", fx: [FX.chorusWide, FX.hall, FX.tape],
    p: { ...P, osc1_wave: 0, osc2_wave: 0, osc2_vol: 62, detune: 40,
         vintage: 62, filter_type: 2, cutoff: 40, resonance: 18,
         filter_env: 32, fenv_a: 50, fenv_d: 60, fenv_s: 38, fenv_r: 68,
         aenv_a: 48, aenv_s: 82, aenv_r: 70 } },
];
