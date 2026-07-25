/* BS — bass. Mono (voices:1) per the factory idiom for this category.
 * Corpus reference: cutoff .21, reso .37, filter_env .79, LP18, osc3 (sub) .51
 * — basses lean on the sub and a deep filter envelope. */
import { FX, st } from "./base.mjs";

const M = { voices: 1, vel_vol: 15, vel_env: 25 };

export default [
  /* ---- staples ------------------------------------------------------- */

  { cat: "BS", name: "Nightdrive", fx: [FX.chorus, FX.room, FX.slap],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc1_vol: 78, osc2_vol: 56, osc3_vol: 62,
         osc2_tune: st(-12), detune: 26, filter_type: 1, cutoff: 22, resonance: 34,
         filter_env: 72, fenv_d: 34, fenv_s: 8, fenv_r: 30,
         aenv_d: 50, aenv_s: 74, aenv_r: 26, portamento: 0 } },

  { cat: "BS", name: "Outrun", fx: [FX.chorusWide, FX.room, FX.eighth],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc1_vol: 74, osc2_vol: 68, osc3_vol: 40,
         detune: 44, filter_type: 2, cutoff: 30, resonance: 28, keyfollow: 34,
         filter_env: 62, fenv_d: 40, fenv_s: 14, fenv_r: 34, aenv_s: 78, aenv_r: 30 } },

  /* Reso-pluck bass: the acid-adjacent staple. Variants trade resonance for
   * envelope depth, which is exactly the axis I cannot call without ears. */
  { cat: "BS", name: "Acid Cell", fx: [FX.room, FX.eighth],
    p: { ...M, osc1_wave: 0, osc2_vol: 0, osc3_vol: 30, filter_type: 0,
         keyfollow: 40, fenv_d: 26, fenv_s: 0, fenv_r: 20,
         aenv_d: 40, aenv_s: 60, aenv_r: 20, portamento: 12, porta_mode: 1 },
    vars: [
      { p: { cutoff: 16, resonance: 62, filter_env: 78 } },
      { p: { cutoff: 24, resonance: 78, filter_env: 58 } },
      { p: { cutoff: 12, resonance: 88, filter_env: 88, filter_drive: 22 } },
    ] },

  { cat: "BS", name: "Deep Pulse", fx: [FX.chorus, FX.room, FX.slap],
    p: { ...M, osc1_wave: 1, osc1_pw: 32, osc2_wave: 1, osc2_vol: 48, osc2_tune: st(-12),
         osc3_vol: 55, detune: 18, filter_type: 1, cutoff: 24, resonance: 22,
         filter_env: 66, fenv_d: 38, fenv_s: 10, aenv_s: 76, aenv_r: 28 } },

  { cat: "BS", name: "Sub Anchor", fx: [FX.room, FX.slap],
    p: { ...M, osc1_wave: 0, osc1_vol: 58, osc2_vol: 0, osc3_vol: 88,
         filter_type: 3, cutoff: 30, resonance: 8, filter_env: 34,
         fenv_d: 30, fenv_s: 18, aenv_a: 2, aenv_s: 84, aenv_r: 24, detune: 8 } },

  { cat: "BS", name: "Tape Bass", fx: [FX.chorus, FX.room, FX.tape],
    p: { ...M, osc1_wave: 0, osc2_wave: 2, osc2_vol: 52, osc2_tune: st(-12),
         osc3_vol: 44, vintage: 34, detune: 30, filter_type: 2, cutoff: 26,
         resonance: 20, filter_env: 58, fenv_d: 36, fenv_s: 12,
         aenv_s: 78, aenv_r: 32, highpass: 8 } },

  /* ---- darkwave / industrial ----------------------------------------- */

  { cat: "BS", name: "Rust Engine", fx: [FX.murk, FX.tape],
    p: { ...M, osc1_wave: 1, osc1_pw: 22, osc2_wave: 1, osc2_vol: 60,
         osc2_tune: st(-12), osc3_vol: 46, detune: 36, vintage: 52,
         filter_type: 1, cutoff: 18, resonance: 40, filter_env: 70,
         filter_drive: 46, fenv_d: 30, fenv_s: 6, aenv_s: 72, aenv_r: 30 } },

  { cat: "BS", name: "Corrosion", fx: [FX.gated, FX.tape],
    p: { ...M, osc1_wave: 1, osc1_pw: 18, osc2_wave: 1, osc2_vol: 55, osc2_tune: st(-11),
         osc3_vol: 40, detune: 48, bitcrush: 42, filter_drive: 58,
         filter_type: 5, cutoff: 34, resonance: 46, filter_env: 60,
         fenv_d: 24, fenv_s: 0, aenv_d: 38, aenv_s: 60, aenv_r: 22 } },

  { cat: "BS", name: "Hammer Plant", fx: [FX.gated, FX.eighth],
    p: { ...M, osc1_wave: 1, osc1_pw: 46, osc2_wave: 0, osc2_vol: 62, osc2_tune: st(-12),
         osc3_vol: 52, ringmod: 16, filter_drive: 40, filter_type: 0,
         cutoff: 20, resonance: 30, filter_env: 80, fenv_d: 18, fenv_s: 0, fenv_r: 16,
         aenv_d: 30, aenv_s: 42, aenv_r: 16, vel_env: 45 } },

  { cat: "BS", name: "Bunker", fx: [FX.murk, FX.quarter],
    p: { ...M, osc1_wave: 0, osc2_wave: 3, osc2_vol: 44, osc2_tune: st(-24),
         osc3_vol: 70, detune: 14, filter_type: 3, cutoff: 18, resonance: 14,
         filter_env: 44, fenv_a: 12, fenv_d: 44, fenv_s: 24,
         aenv_a: 6, aenv_s: 82, aenv_r: 44, highpass: 4 } },

  /* ---- new wave ------------------------------------------------------- */

  { cat: "BS", name: "Skinny Tie", fx: [FX.chorusWide, FX.room, FX.slap],
    p: { ...M, osc1_wave: 1, osc1_pw: 62, osc2_vol: 0, osc3_vol: 34,
         filter_type: 2, cutoff: 36, resonance: 26, keyfollow: 40,
         filter_env: 54, fenv_d: 24, fenv_s: 6, fenv_r: 18,
         aenv_d: 34, aenv_s: 58, aenv_r: 18, vel_env: 40 } },

  { cat: "BS", name: "Pulse Wire", fx: [FX.chorus, FX.plate, FX.pingpong],
    p: { ...M, osc1_wave: 1, osc1_pw: 40, osc2_wave: 1, osc2_vol: 50,
         detune: 24, lfo1_wave: 0, lfo1_rate: 22, lfo1_amount: 26, lfo1_dest: 4,
         filter_type: 2, cutoff: 34, resonance: 24, filter_env: 50,
         fenv_d: 30, fenv_s: 12, aenv_s: 72, aenv_r: 26 } },

  /* Picked/plucked bass. The decay length is the whole character here. */
  { cat: "BS", name: "Cold Pick", fx: [FX.chorus, FX.gated, FX.slap],
    p: { ...M, osc1_wave: 0, osc2_wave: 1, osc2_vol: 46, osc3_vol: 36,
         detune: 22, filter_type: 2, cutoff: 32, resonance: 34, keyfollow: 44,
         filter_env: 74, vel_env: 50, aenv_a: 0, aenv_s: 0 },
    vars: [
      { p: { fenv_d: 16, fenv_r: 12, aenv_d: 26, aenv_r: 14 } },
      { p: { fenv_d: 26, fenv_r: 20, aenv_d: 40, aenv_r: 22 } },
    ] },

  /* ---- feature-forward (the DISTRHO additions the factory bank ignores) */

  /* Moog ladder — zero factory presets use it. */
  { cat: "BS", name: "Ladder Growl", fx: [FX.room, FX.eighth],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, osc2_tune: st(-12),
         osc3_vol: 44, detune: 28, filter_type: 10, cutoff: 24, resonance: 52,
         filter_env: 68, filter_drive: 34, fenv_d: 32, fenv_s: 8,
         aenv_s: 76, aenv_r: 28 } },

  { cat: "BS", name: "Moog Stack", fx: [FX.chorus, FX.plate, FX.dotted],
    p: { ...M, osc1_wave: 0, osc2_wave: 1, osc2_vol: 54, osc3_vol: 50,
         detune: 34, filter_type: 11, cutoff: 28, resonance: 44,
         filter_env: 62, filter_drive: 26, fenv_d: 36, fenv_s: 14,
         aenv_s: 78, aenv_r: 30 } },

  /* State-variable band-pass: hollow, phasey — good for darkwave. */
  { cat: "BS", name: "Hollow State", fx: [FX.murk, FX.pingpong],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc2_vol: 60, osc2_tune: st(-12),
         osc3_vol: 38, detune: 30, filter_type: 9, cutoff: 34, resonance: 40,
         filter_env: 52, fenv_d: 38, fenv_s: 16, aenv_s: 74, aenv_r: 34 } },

  { cat: "BS", name: "SV Drive", fx: [FX.gated, FX.tape],
    p: { ...M, osc1_wave: 1, osc1_pw: 36, osc2_wave: 0, osc2_vol: 52,
         osc3_vol: 44, filter_type: 7, cutoff: 26, resonance: 48,
         filter_drive: 52, filter_env: 66, fenv_d: 28, fenv_s: 6,
         aenv_s: 70, aenv_r: 24, vintage: 26 } },

  /* FM bass — osc2 is the carrier, osc1 the (silent) modulator; osc2 tune
   * compensates the unipolar modulator's DC pitch rise. */
  { cat: "BS", name: "Metal Ratio", fx: [FX.room, FX.eighth],
    p: { ...M, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 82,
         osc2_fm: 6, osc2_tune: st(-6), osc3_vol: 48,
         filter_type: 1, cutoff: 34, resonance: 18, filter_env: 56,
         fenv_d: 26, fenv_s: 8, aenv_d: 40, aenv_s: 64, aenv_r: 22 },
    vars: [
      { p: { osc2_fm: 4, osc2_tune: st(-4) } },
      { p: { osc2_fm: 8, osc2_tune: st(-8) } },
      { p: { osc2_fm: 12, osc2_tune: st(-12), filter_drive: 24 } },
    ] },

  /* Ring mod — the engine multiplies its product term by 8, so levels are
   * pulled well down here. */
  { cat: "BS", name: "Ring Iron", fx: [FX.gated, FX.tape],
    p: { ...M, osc1_wave: 0, osc1_vol: 46, osc2_wave: 0, osc2_vol: 46,
         osc2_tune: st(7), ringmod: 26, osc3_vol: 40,
         filter_type: 1, cutoff: 26, resonance: 26, filter_env: 58,
         filter_drive: 20, fenv_d: 26, fenv_s: 4, aenv_d: 36, aenv_s: 56, aenv_r: 20 } },

  /* Osc sync against osc3 (the hardwired sub, 2 octaves down) — note the
   * perceived fundamental drops accordingly. */
  { cat: "BS", name: "Sync Slab", fx: [FX.gated, FX.eighth],
    p: { ...M, osc1_wave: 0, osc1_tune: st(12), osc_sync: 1, osc2_vol: 0,
         osc3_vol: 30, filter_type: 2, cutoff: 34, resonance: 30,
         filter_env: 64, fenv_d: 24, fenv_s: 0, aenv_d: 34, aenv_s: 52, aenv_r: 18 } },

  { cat: "BS", name: "Vintage Hum", fx: [FX.chorus, FX.murk, FX.tape],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc2_vol: 50, osc2_tune: st(-12),
         osc3_vol: 56, vintage: 68, detune: 38, filter_type: 3,
         cutoff: 22, resonance: 12, filter_env: 40,
         fenv_a: 8, fenv_d: 46, fenv_s: 22, aenv_a: 4, aenv_s: 80, aenv_r: 40 } },

  { cat: "BS", name: "Gated Stomp", fx: [FX.gated, FX.pingpong],
    p: { ...M, osc1_wave: 1, osc1_pw: 28, osc2_wave: 1, osc2_vol: 58,
         osc2_tune: st(-12), osc3_vol: 48, detune: 20, filter_drive: 30,
         filter_type: 0, cutoff: 22, resonance: 36, filter_env: 76,
         fenv_d: 20, fenv_s: 0, fenv_r: 14, aenv_d: 28, aenv_s: 40, aenv_r: 14,
         vel_env: 55, vel_cut: 30 } },

  { cat: "BS", name: "Neon Floor", fx: [FX.chorusWide, FX.plate, FX.dotted],
    p: { ...M, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, osc3_vol: 42,
         detune: 52, filter_type: 2, cutoff: 32, resonance: 30, keyfollow: 30,
         filter_env: 58, fenv_d: 42, fenv_s: 18, aenv_s: 80, aenv_r: 34 } },
];
