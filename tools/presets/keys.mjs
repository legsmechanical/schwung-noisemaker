/* KB — keys. Polyphonic (factory median 6 voices) with a real amp decay and
 * sustain around .72 — struck-and-held rather than pad-swelled. */
import { FX, st } from "./base.mjs";

const K = { voices: 6, vel_vol: 45, vel_env: 40, vel_cut: 30, pw_pitch: 20 };

export default [
  { cat: "KB", name: "Neon Rhodes", fx: [FX.chorusWide, FX.plate, FX.eighth],
    p: { ...K, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 82,
         osc2_fm: 4, osc2_tune: st(-4), filter_type: 3, cutoff: 52,
         resonance: 10, keyfollow: 40, filter_env: 30,
         fenv_d: 44, fenv_s: 18, fenv_r: 36,
         aenv_a: 0, aenv_d: 58, aenv_s: 40, aenv_r: 40 } },

  { cat: "KB", name: "Cold Wurli", fx: [FX.chorus, FX.room, FX.slap],
    p: { ...K, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 80,
         osc2_fm: 7, osc2_tune: st(-7), filter_type: 2, cutoff: 46,
         resonance: 16, keyfollow: 44, filter_env: 40,
         fenv_d: 36, fenv_s: 12, aenv_d: 50, aenv_s: 34, aenv_r: 34 } },

  { cat: "KB", name: "Juno Keys", fx: [FX.chorusWide, FX.plate, FX.dotted],
    p: { ...K, osc1_wave: 1, osc1_pw: 52, osc2_wave: 0, osc2_vol: 62,
         detune: 28, filter_type: 3, cutoff: 48, resonance: 14,
         keyfollow: 38, filter_env: 34, fenv_d: 46, fenv_s: 24, fenv_r: 40,
         aenv_a: 1, aenv_d: 56, aenv_s: 62, aenv_r: 42 } },

  /* Organ. Drawbar-ish stack; how much upper octave reads as "organ" vs
   * "thin" is an ear call. */
  { cat: "KB", name: "Vault Organ", fx: [FX.chorusWide, FX.hall, FX.quarter],
    p: { ...K, osc1_wave: 1, osc1_pw: 50, osc2_wave: 1, osc2_vol: 60,
         detune: 12, filter_type: 3, cutoff: 56, resonance: 8,
         filter_env: 14, fenv_d: 30, fenv_s: 60,
         aenv_a: 2, aenv_d: 30, aenv_s: 92, aenv_r: 22 },
    vars: [
      { p: { osc2_tune: st(12) } },
      { p: { osc2_tune: st(19) } },
      { p: { osc2_tune: st(24) } },
    ] },

  { cat: "KB", name: "Chapel", fx: [FX.chorusDeep, FX.cathedral, FX.quarter],
    p: { ...K, osc1_wave: 1, osc1_pw: 46, osc2_wave: 1, osc2_vol: 58,
         osc2_tune: st(12), detune: 16, filter_type: 3, cutoff: 50,
         resonance: 10, filter_env: 16, fenv_d: 34, fenv_s: 54,
         aenv_a: 6, aenv_d: 36, aenv_s: 88, aenv_r: 48 } },

  { cat: "KB", name: "Ghost Piano", fx: [FX.chorus, FX.murk, FX.tape],
    p: { ...K, osc1_wave: 0, osc2_wave: 2, osc2_vol: 58, detune: 20,
         vintage: 34, filter_type: 1, cutoff: 38, resonance: 18,
         keyfollow: 48, filter_env: 46, fenv_d: 38, fenv_s: 10, fenv_r: 34,
         aenv_a: 0, aenv_d: 54, aenv_s: 24, aenv_r: 44 } },

  { cat: "KB", name: "Clav Wire", fx: [FX.chorus, FX.gated, FX.eighth],
    p: { ...K, osc1_wave: 1, osc1_pw: 24, osc2_wave: 1, osc2_vol: 54,
         detune: 18, filter_type: 2, cutoff: 44, resonance: 40,
         keyfollow: 54, filter_env: 60, fenv_d: 22, fenv_s: 0, fenv_r: 18,
         aenv_a: 0, aenv_d: 34, aenv_s: 20, aenv_r: 20, vel_env: 60 } },

  { cat: "KB", name: "Bell Tine", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...K, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 80,
         osc2_fm: 10, osc2_tune: st(-10), filter_type: 3, cutoff: 60,
         resonance: 8, filter_env: 20, fenv_d: 40, fenv_s: 10,
         aenv_a: 0, aenv_d: 62, aenv_s: 22, aenv_r: 52 } },

  { cat: "KB", name: "Mall Piano", fx: [FX.chorusWide, FX.plate, FX.slap],
    p: { ...K, osc1_wave: 0, osc2_wave: 3, osc2_vol: 56, detune: 22,
         filter_type: 3, cutoff: 50, resonance: 12, keyfollow: 46,
         filter_env: 38, fenv_d: 40, fenv_s: 14, fenv_r: 34,
         aenv_a: 0, aenv_d: 56, aenv_s: 36, aenv_r: 38 } },

  { cat: "KB", name: "Rust Keys", fx: [FX.gated, FX.tape],
    p: { ...K, osc1_wave: 1, osc1_pw: 32, osc2_wave: 1, osc2_vol: 56,
         detune: 30, bitcrush: 44, filter_drive: 34, filter_type: 5,
         cutoff: 46, resonance: 32, filter_env: 44,
         fenv_d: 30, fenv_s: 8, aenv_a: 0, aenv_d: 44, aenv_s: 30, aenv_r: 26 } },

  { cat: "KB", name: "Moog Keys", fx: [FX.chorus, FX.plate, FX.eighth],
    p: { ...K, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, detune: 26,
         filter_type: 11, cutoff: 40, resonance: 42, filter_drive: 20,
         keyfollow: 44, filter_env: 48, fenv_d: 40, fenv_s: 16, fenv_r: 34,
         aenv_a: 0, aenv_d: 54, aenv_s: 52, aenv_r: 36 } },

  { cat: "KB", name: "State Keys", fx: [FX.chorusWide, FX.plate, FX.pingpong],
    p: { ...K, osc1_wave: 0, osc2_wave: 1, osc2_vol: 60, detune: 24,
         filter_type: 7, cutoff: 44, resonance: 38, keyfollow: 42,
         filter_env: 44, fenv_d: 38, fenv_s: 18, fenv_r: 32,
         aenv_a: 0, aenv_d: 52, aenv_s: 54, aenv_r: 36 } },

  { cat: "KB", name: "Nightclub", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...K, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, osc2_tune: st(12),
         detune: 34, filter_type: 3, cutoff: 46, resonance: 16,
         filter_env: 36, fenv_d: 44, fenv_s: 22, fenv_r: 38,
         aenv_a: 2, aenv_d: 56, aenv_s: 58, aenv_r: 44 } },

  { cat: "KB", name: "Tape Celeste", fx: [FX.chorusWide, FX.cathedral, FX.tape],
    p: { ...K, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 78,
         osc2_fm: 6, osc2_tune: st(-6), vintage: 40, filter_type: 3,
         cutoff: 56, resonance: 10, filter_env: 18,
         aenv_a: 0, aenv_d: 66, aenv_s: 18, aenv_r: 60 } },
];
