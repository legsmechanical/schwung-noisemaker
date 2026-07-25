/* LD — leads. Mono + portamento is the factory idiom (78/256 presets, all
 * median voices=1). Corpus: cutoff .32, reso .45, filter_env .64, LP12. */
import { FX, st } from "./base.mjs";

const M = { voices: 1, vel_vol: 20, vel_env: 20, pw_pitch: 25 };
const GLIDE = { portamento: 18, porta_mode: 1 };

export default [
  /* ---- synthwave staples ---------------------------------------------- */

  { cat: "LD", name: "Neon Blade", fx: [FX.chorusWide, FX.plate, FX.dotted],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 70, detune: 46,
         filter_type: 2, cutoff: 44, resonance: 32, keyfollow: 45,
         filter_env: 52, fenv_a: 2, fenv_d: 46, fenv_s: 34, fenv_r: 40,
         aenv_a: 3, aenv_d: 50, aenv_s: 82, aenv_r: 40 } },

  { cat: "LD", name: "Midnight Drive", fx: [FX.chorusWide, FX.hall, FX.quarter],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(12),
         detune: 30, filter_type: 2, cutoff: 48, resonance: 26,
         filter_env: 46, fenv_d: 44, fenv_s: 30, aenv_a: 6, aenv_s: 84, aenv_r: 48 } },

  /* The big saw lead. How much detune reads as "wide" vs "out of tune" is a
   * taste call I cannot make without hearing it on the device. */
  { cat: "LD", name: "Skyline", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 74,
         filter_type: 2, cutoff: 50, resonance: 22, keyfollow: 40,
         filter_env: 44, fenv_d: 48, fenv_s: 36, aenv_a: 4, aenv_s: 86, aenv_r: 46 },
    vars: [
      { p: { detune: 24 } },
      { p: { detune: 46 } },
      { p: { detune: 70, osc2_tune: st(12) } },
    ] },

  { cat: "LD", name: "Chrome Solo", fx: [FX.chorus, FX.plate, FX.eighth],
    p: { ...M, ...GLIDE, portamento: 26, osc1_wave: 1, osc1_pw: 42, osc2_wave: 0,
         osc2_vol: 56, detune: 26, filter_type: 2, cutoff: 46, resonance: 40,
         keyfollow: 50, filter_env: 54, fenv_d: 38, fenv_s: 28,
         aenv_a: 2, aenv_s: 80, aenv_r: 34 } },

  { cat: "LD", name: "Hotline", fx: [FX.chorus, FX.gated, FX.pingpong],
    p: { ...M, osc1_wave: 1, osc1_pw: 30, osc2_wave: 1, osc2_vol: 60,
         detune: 34, filter_type: 3, cutoff: 54, resonance: 20,
         filter_env: 40, fenv_d: 34, fenv_s: 26, aenv_a: 1, aenv_d: 44,
         aenv_s: 74, aenv_r: 30 } },

  /* ---- new wave -------------------------------------------------------- */

  { cat: "LD", name: "Thin Ice", fx: [FX.chorusWide, FX.room, FX.slap],
    p: { ...M, osc1_wave: 1, osc1_pw: 74, osc2_vol: 0,
         filter_type: 3, cutoff: 58, resonance: 18, keyfollow: 46,
         filter_env: 34, fenv_d: 30, fenv_s: 24, aenv_a: 1, aenv_s: 78, aenv_r: 26 } },

  { cat: "LD", name: "Telex", fx: [FX.chorus, FX.room, FX.eighth],
    p: { ...M, osc1_wave: 1, osc1_pw: 50, osc2_wave: 2, osc2_vol: 54, osc2_tune: st(12),
         detune: 18, filter_type: 3, cutoff: 60, resonance: 14,
         filter_env: 30, fenv_d: 28, fenv_s: 30, aenv_a: 2, aenv_s: 80, aenv_r: 24 } },

  { cat: "LD", name: "Pulse Code", fx: [FX.chorusDeep, FX.plate, FX.pingpong],
    p: { ...M, osc1_wave: 1, osc1_pw: 36, osc2_wave: 1, osc2_vol: 52, detune: 22,
         lfo1_wave: 0, lfo1_rate: 26, lfo1_amount: 34, lfo1_dest: 4,
         filter_type: 2, cutoff: 48, resonance: 28, filter_env: 38,
         fenv_d: 34, fenv_s: 28, aenv_a: 2, aenv_s: 78, aenv_r: 30 } },

  { cat: "LD", name: "Glass Wire", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...M, osc1_wave: 0, osc2_wave: 3, osc2_vol: 62, osc2_tune: st(12),
         detune: 16, filter_type: 3, cutoff: 62, resonance: 12,
         filter_env: 26, fenv_d: 30, fenv_s: 34, aenv_a: 8, aenv_s: 84, aenv_r: 42 } },

  /* ---- darkwave -------------------------------------------------------- */

  { cat: "LD", name: "Black Veil", fx: [FX.chorus, FX.murk, FX.tape],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, osc2_tune: st(-12),
         detune: 40, vintage: 30, filter_type: 1, cutoff: 34, resonance: 34,
         filter_env: 50, fenv_a: 6, fenv_d: 44, fenv_s: 22,
         aenv_a: 10, aenv_s: 78, aenv_r: 56 } },

  { cat: "LD", name: "Funeral Neon", fx: [FX.chorusDeep, FX.cathedral, FX.quarter],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 2, osc2_vol: 58,
         detune: 28, filter_type: 1, cutoff: 38, resonance: 40, keyfollow: 38,
         filter_env: 48, fenv_a: 4, fenv_d: 50, fenv_s: 26,
         aenv_a: 14, aenv_s: 80, aenv_r: 62 } },

  { cat: "LD", name: "Cold Cathode", fx: [FX.chorus, FX.murk, FX.pingpong],
    p: { ...M, osc1_wave: 1, osc1_pw: 26, osc2_wave: 1, osc2_vol: 58, osc2_tune: st(7),
         detune: 24, filter_type: 6, cutoff: 46, resonance: 44,
         filter_env: 42, fenv_d: 40, fenv_s: 24, aenv_a: 4, aenv_s: 76, aenv_r: 44 } },

  /* ---- industrial ------------------------------------------------------ */

  { cat: "LD", name: "Scrap Metal", fx: [FX.gated, FX.tape],
    p: { ...M, osc1_wave: 1, osc1_pw: 20, osc2_wave: 1, osc2_vol: 62, osc2_tune: st(7),
         detune: 44, ringmod: 22, filter_drive: 54, bitcrush: 46,
         filter_type: 5, cutoff: 48, resonance: 42, filter_env: 46,
         fenv_d: 26, fenv_s: 12, aenv_d: 40, aenv_s: 68, aenv_r: 24 } },

  { cat: "LD", name: "Foundry", fx: [FX.gated, FX.quarter],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(5),
         detune: 52, filter_drive: 62, vintage: 40, filter_type: 0,
         cutoff: 36, resonance: 50, filter_env: 56, fenv_d: 32, fenv_s: 14,
         aenv_d: 44, aenv_s: 72, aenv_r: 28 } },

  /* Bitcrushed lead. 100 = OFF, so these values are deliberate destruction. */
  { cat: "LD", name: "Data Loss", fx: [FX.room, FX.pingpong],
    p: { ...M, osc1_wave: 0, osc2_wave: 1, osc2_vol: 58, detune: 20,
         filter_type: 2, cutoff: 54, resonance: 26, filter_env: 40,
         fenv_d: 32, fenv_s: 24, aenv_a: 1, aenv_s: 76, aenv_r: 26 },
    vars: [
      { p: { bitcrush: 52 } },
      { p: { bitcrush: 38 } },
      { p: { bitcrush: 36, filter_drive: 30 } },
    ] },

  { cat: "LD", name: "Siren Coil", fx: [FX.chorus, FX.hall, FX.tape],
    p: { ...M, ...GLIDE, portamento: 40, osc1_wave: 0, osc2_wave: 0, osc2_vol: 60,
         osc2_tune: st(12), detune: 36, lfo1_wave: 1, lfo1_rate: 14,
         lfo1_amount: 18, lfo1_dest: 7, filter_type: 2, cutoff: 44,
         resonance: 38, filter_env: 44, fenv_d: 40, fenv_s: 26,
         aenv_a: 6, aenv_s: 80, aenv_r: 44 } },

  /* ---- feature-forward -------------------------------------------------- */

  { cat: "LD", name: "Moog Cut", fx: [FX.chorus, FX.plate, FX.eighth],
    p: { ...M, ...GLIDE, osc1_wave: 0, osc2_wave: 0, osc2_vol: 62, detune: 28,
         filter_type: 10, cutoff: 42, resonance: 56, keyfollow: 48,
         filter_env: 54, filter_drive: 28, fenv_d: 40, fenv_s: 26,
         aenv_a: 2, aenv_s: 80, aenv_r: 34 } },

  { cat: "LD", name: "Ladder Cry", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...M, ...GLIDE, portamento: 32, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58,
         detune: 34, filter_type: 11, cutoff: 38, resonance: 62,
         filter_env: 60, fenv_a: 8, fenv_d: 46, fenv_s: 22,
         aenv_a: 8, aenv_s: 82, aenv_r: 46 } },

  { cat: "LD", name: "State Glass", fx: [FX.chorusWide, FX.plate, FX.pingpong],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, detune: 30,
         filter_type: 8, cutoff: 40, resonance: 46, keyfollow: 42,
         filter_env: 44, fenv_d: 38, fenv_s: 28, aenv_a: 3, aenv_s: 78, aenv_r: 36 } },

  /* Hard sync against osc3 (2 octaves below) — sync leads are the classic
   * "tearing" sound, but the perceived pitch drops with the master. */
  { cat: "LD", name: "Sync Tear", fx: [FX.chorus, FX.gated, FX.eighth],
    p: { ...M, osc_sync: 1, osc1_wave: 0, osc2_vol: 0, osc3_vol: 0,
         filter_type: 2, cutoff: 56, resonance: 24, filter_env: 44,
         fenv_d: 34, fenv_s: 20, aenv_a: 1, aenv_d: 44, aenv_s: 74, aenv_r: 26 },
    vars: [
      { p: { osc1_tune: st(12) } },
      { p: { osc1_tune: st(19) } },
      { p: { osc1_tune: st(24), filter_env: 56 } },
    ] },

  /* FM lead: osc2 carrier, osc1 the silent modulator, tune compensating the
   * unipolar modulator's pitch rise. */
  { cat: "LD", name: "Bell Ratio", fx: [FX.chorus, FX.hall, FX.dotted],
    p: { ...M, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 82,
         osc2_fm: 5, osc2_tune: st(-5), filter_type: 3, cutoff: 60,
         resonance: 12, filter_env: 26, fenv_d: 40, fenv_s: 24,
         aenv_a: 1, aenv_d: 60, aenv_s: 46, aenv_r: 50 } },

  { cat: "LD", name: "Glass Ratio", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...M, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 80,
         osc2_fm: 9, osc2_tune: st(-9), filter_type: 3, cutoff: 64,
         resonance: 10, filter_env: 20, aenv_a: 12, aenv_d: 70, aenv_s: 40, aenv_r: 66 } },

  { cat: "LD", name: "Ring Choir", fx: [FX.chorusWide, FX.cathedral, FX.tape],
    p: { ...M, osc1_wave: 0, osc1_vol: 50, osc2_wave: 0, osc2_vol: 50,
         osc2_tune: st(12), ringmod: 24, filter_type: 2, cutoff: 46,
         resonance: 24, filter_env: 36, fenv_a: 10, fenv_d: 44, fenv_s: 28,
         aenv_a: 16, aenv_s: 80, aenv_r: 58 } },

  { cat: "LD", name: "Vintage Horn", fx: [FX.chorus, FX.plate, FX.slap],
    p: { ...M, ...GLIDE, osc1_wave: 1, osc1_pw: 44, osc2_wave: 0, osc2_vol: 60,
         detune: 26, vintage: 44, filter_type: 1, cutoff: 40, resonance: 22,
         keyfollow: 36, filter_env: 56, fenv_a: 6, fenv_d: 40, fenv_s: 30,
         aenv_a: 6, aenv_s: 82, aenv_r: 32 } },
];
