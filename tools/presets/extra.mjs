/* Fill for the dropped FX / DR / CH slots — redistributed across the five
 * surviving categories to reach 128 distinct patches. Same genre brief:
 * synthwave, industrial, new wave, darkwave; nothing dry. */
import { FX, st } from "./base.mjs";

const MB = { voices: 1, vel_vol: 15, vel_env: 25 };                     /* bass  */
const ML = { voices: 1, vel_vol: 20, vel_env: 20, pw_pitch: 25 };       /* lead  */
const PP = { voices: 6, vel_vol: 25, vel_env: 15, pw_pitch: 20 };       /* pad   */
const KK = { voices: 6, vel_vol: 45, vel_env: 40, vel_cut: 30 };        /* keys  */
const AA = { voices: 1, vel_vol: 25, vel_env: 35, aenv_a: 0, aenv_s: 0 };/* arp  */

export default [
  /* ---- BS +8 ------------------------------------------------------------ */

  { cat: "BS", name: "Blade Runner", fx: [FX.chorusDeep, FX.cathedral, FX.tape],
    p: { ...MB, osc1_wave: 0, osc2_wave: 0, osc2_vol: 62, osc2_tune: st(-12),
         osc3_vol: 58, detune: 40, vintage: 30, filter_type: 3, cutoff: 24,
         resonance: 16, filter_env: 42, fenv_a: 14, fenv_d: 48, fenv_s: 26,
         aenv_a: 10, aenv_s: 84, aenv_r: 52 } },

  { cat: "BS", name: "Static Pull", fx: [FX.chorus, FX.room, FX.pingpong],
    p: { ...MB, osc1_wave: 1, osc1_pw: 38, osc2_wave: 0, osc2_vol: 58,
         osc3_vol: 44, detune: 28, vintage: 38, filter_type: 2, cutoff: 28,
         resonance: 32, filter_env: 62, fenv_d: 34, fenv_s: 10,
         aenv_s: 76, aenv_r: 28 } },

  { cat: "BS", name: "Undertow", fx: [FX.chorusDeep, FX.murk, FX.quarter],
    p: { ...MB, osc1_wave: 0, osc2_wave: 2, osc2_vol: 50, osc2_tune: st(-12),
         osc3_vol: 74, detune: 18, filter_type: 3, cutoff: 20, resonance: 10,
         filter_env: 38, fenv_a: 16, fenv_d: 50, fenv_s: 28,
         aenv_a: 12, aenv_s: 86, aenv_r: 56 } },

  { cat: "BS", name: "Chrome Thumb", fx: [FX.chorus, FX.gated, FX.eighth],
    p: { ...MB, osc1_wave: 0, osc2_wave: 1, osc2_vol: 52, osc3_vol: 42,
         detune: 24, filter_type: 2, cutoff: 34, resonance: 42, keyfollow: 46,
         filter_env: 76, vel_env: 55, fenv_d: 18, fenv_s: 0, fenv_r: 14,
         aenv_d: 30, aenv_s: 44, aenv_r: 16 } },

  { cat: "BS", name: "Overload", fx: [FX.gated, FX.tape],
    p: { ...MB, osc1_wave: 1, osc1_pw: 24, osc2_wave: 1, osc2_vol: 64,
         osc2_tune: st(-12), osc3_vol: 40, detune: 44, filter_drive: 72,
         filter_type: 0, cutoff: 22, resonance: 44, filter_env: 66,
         fenv_d: 26, fenv_s: 4, aenv_d: 36, aenv_s: 62, aenv_r: 20 } },

  { cat: "BS", name: "Notch Bass", fx: [FX.chorus, FX.plate, FX.dotted],
    p: { ...MB, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, osc2_tune: st(-12),
         osc3_vol: 46, detune: 32, filter_type: 6, cutoff: 32, resonance: 38,
         filter_env: 50, fenv_d: 36, fenv_s: 14, aenv_s: 76, aenv_r: 30 } },

  { cat: "BS", name: "Cold Storage", fx: [FX.chorusWide, FX.murk, FX.tape],
    p: { ...MB, osc1_wave: 0, osc2_wave: 3, osc2_vol: 46, osc2_tune: st(-12),
         osc3_vol: 62, detune: 20, vintage: 44, filter_type: 1, cutoff: 22,
         resonance: 18, filter_env: 46, fenv_a: 10, fenv_d: 44, fenv_s: 20,
         aenv_a: 6, aenv_s: 80, aenv_r: 46 } },

  /* Sub-and-click: the fundamental plus a fast filter blip. Where the click
   * sits relative to the sub is a mix call. */
  { cat: "BS", name: "Click Sub", fx: [FX.room, FX.slap],
    p: { ...MB, osc1_wave: 0, osc1_vol: 44, osc2_vol: 0, osc3_vol: 84,
         filter_type: 2, cutoff: 26, keyfollow: 40, fenv_s: 0, fenv_r: 10,
         aenv_d: 40, aenv_s: 70, aenv_r: 20 },
    vars: [
      { p: { resonance: 30, filter_env: 60, fenv_d: 10 } },
      { p: { resonance: 52, filter_env: 78, fenv_d: 16 } },
    ] },

  /* ---- LD +8 ------------------------------------------------------------ */

  { cat: "LD", name: "Turbo", fx: [FX.chorusWide, FX.plate, FX.eighth],
    p: { ...ML, portamento: 14, porta_mode: 1, osc1_wave: 0, osc2_wave: 0,
         osc2_vol: 68, osc2_tune: st(7), detune: 32, filter_type: 2,
         cutoff: 46, resonance: 34, keyfollow: 44, filter_env: 52,
         fenv_d: 40, fenv_s: 28, aenv_a: 2, aenv_s: 80, aenv_r: 34 } },

  { cat: "LD", name: "Vice", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...ML, portamento: 22, porta_mode: 1, osc1_wave: 1, osc1_pw: 38,
         osc2_wave: 0, osc2_vol: 62, detune: 30, filter_type: 3, cutoff: 52,
         resonance: 26, filter_env: 40, fenv_d: 42, fenv_s: 30,
         aenv_a: 4, aenv_s: 82, aenv_r: 40 } },

  { cat: "LD", name: "Whip", fx: [FX.chorus, FX.gated, FX.pingpong],
    p: { ...ML, osc1_wave: 0, osc2_wave: 0, osc2_vol: 60, detune: 26,
         filter_type: 2, cutoff: 40, resonance: 46, keyfollow: 52,
         filter_env: 72, fenv_d: 22, fenv_s: 10, fenv_r: 18,
         aenv_a: 0, aenv_d: 40, aenv_s: 66, aenv_r: 22 } },

  { cat: "LD", name: "Wire Choir", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...ML, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(12),
         detune: 44, filter_type: 3, cutoff: 48, resonance: 18,
         filter_env: 28, fenv_a: 20, fenv_d: 50, fenv_s: 34,
         aenv_a: 22, aenv_s: 84, aenv_r: 58 } },

  { cat: "LD", name: "Grinder", fx: [FX.gated, FX.tape],
    p: { ...ML, osc1_wave: 1, osc1_pw: 18, osc2_wave: 1, osc2_vol: 60,
         osc2_tune: st(-12), detune: 40, filter_drive: 66, vintage: 44,
         filter_type: 5, cutoff: 42, resonance: 46, filter_env: 50,
         fenv_d: 28, fenv_s: 12, aenv_d: 42, aenv_s: 70, aenv_r: 24 } },

  { cat: "LD", name: "Distress", fx: [FX.chorus, FX.murk, FX.tape],
    p: { ...ML, portamento: 34, porta_mode: 1, osc1_wave: 0, osc2_wave: 0,
         osc2_vol: 58, osc2_tune: st(-12), detune: 46, vintage: 52,
         filter_type: 1, cutoff: 32, resonance: 42, filter_env: 48,
         fenv_a: 8, fenv_d: 44, fenv_s: 22, aenv_a: 8, aenv_s: 78, aenv_r: 50 } },

  { cat: "LD", name: "Ice Pick", fx: [FX.chorusWide, FX.gated, FX.eighth],
    p: { ...ML, osc1_wave: 1, osc1_pw: 82, osc2_vol: 0, filter_type: 3,
         cutoff: 62, resonance: 22, keyfollow: 50, filter_env: 36,
         fenv_d: 24, fenv_s: 14, aenv_a: 0, aenv_d: 38, aenv_s: 62, aenv_r: 20 } },

  /* Sine-lead whistle. Pure carrier; FM depth decides flute vs bell. */
  { cat: "LD", name: "Ghost Whistle", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...ML, portamento: 26, porta_mode: 1, osc1_wave: 0, osc1_vol: 0,
         osc2_wave: 3, osc2_vol: 80, filter_type: 3, cutoff: 62,
         resonance: 8, filter_env: 16, aenv_a: 14, aenv_s: 84, aenv_r: 54 },
    vars: [
      { p: { osc2_fm: 0 } },
      { p: { osc2_fm: 3, osc2_tune: st(-3) } },
      { p: { osc2_fm: 7, osc2_tune: st(-7) } },
    ] },

  /* ---- PD +7 ------------------------------------------------------------ */

  { cat: "PD", name: "Neon Rain", fx: [FX.chorusWide, FX.cathedral, FX.pingpong],
    p: { ...PP, osc1_wave: 0, osc2_wave: 0, osc2_vol: 68, osc2_tune: st(7),
         detune: 40, filter_type: 3, cutoff: 46, resonance: 16,
         filter_env: 28, fenv_a: 46, fenv_d: 60, fenv_s: 42, fenv_r: 68,
         aenv_a: 44, aenv_s: 86, aenv_r: 70 } },

  { cat: "PD", name: "Slow Machine", fx: [FX.chorusDeep, FX.murk, FX.tape],
    p: { ...PP, voices: 4, osc1_wave: 1, osc1_pw: 30, osc2_wave: 1, osc2_vol: 62,
         detune: 50, filter_drive: 30, vintage: 50, filter_type: 1,
         cutoff: 30, resonance: 28, filter_env: 30,
         fenv_a: 56, fenv_d: 64, fenv_s: 32, fenv_r: 74,
         aenv_a: 54, aenv_s: 80, aenv_r: 76 } },

  { cat: "PD", name: "Vellum", fx: [FX.chorusWide, FX.hall, FX.quarter],
    p: { ...PP, osc1_wave: 0, osc2_wave: 2, osc2_vol: 64, detune: 28,
         filter_type: 3, cutoff: 48, resonance: 10, filter_env: 22,
         fenv_a: 44, fenv_d: 58, fenv_s: 44, fenv_r: 66,
         aenv_a: 42, aenv_s: 86, aenv_r: 68 } },

  { cat: "PD", name: "Deep Field", fx: [FX.chorusDeep, FX.cathedral, FX.tape],
    p: { ...PP, osc1_wave: 0, osc2_wave: 0, osc2_vol: 64, osc2_tune: st(-12),
         osc3_vol: 34, detune: 46, filter_type: 2, cutoff: 30, resonance: 22,
         filter_env: 34, fenv_a: 58, fenv_d: 66, fenv_s: 32, fenv_r: 76,
         aenv_a: 60, aenv_s: 80, aenv_r: 80 } },

  { cat: "PD", name: "Signal Loss", fx: [FX.chorusWide, FX.murk, FX.pingpong],
    p: { ...PP, voices: 4, osc1_wave: 0, osc2_wave: 0, osc2_vol: 62,
         detune: 44, bitcrush: 54, filter_type: 1, cutoff: 34, resonance: 26,
         filter_env: 28, fenv_a: 50, fenv_d: 62, fenv_s: 36, fenv_r: 70,
         aenv_a: 48, aenv_s: 80, aenv_r: 72 } },

  { cat: "PD", name: "Ladder Mist", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...PP, osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, detune: 36,
         filter_type: 11, cutoff: 36, resonance: 46, filter_drive: 18,
         filter_env: 32, fenv_a: 52, fenv_d: 62, fenv_s: 36, fenv_r: 72,
         aenv_a: 50, aenv_s: 82, aenv_r: 74 } },

  { cat: "PD", name: "Ring Veil", fx: [FX.chorusDeep, FX.cathedral, FX.tape],
    p: { ...PP, osc1_wave: 0, osc1_vol: 50, osc2_wave: 0, osc2_vol: 50,
         osc2_tune: st(12), ringmod: 20, detune: 30, filter_type: 3,
         cutoff: 44, resonance: 14, filter_env: 24,
         fenv_a: 54, fenv_d: 62, fenv_s: 38, fenv_r: 72,
         aenv_a: 56, aenv_s: 82, aenv_r: 78 } },

  /* ---- KB +6 ------------------------------------------------------------ */

  { cat: "KB", name: "Hotel Lobby", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...KK, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 80,
         osc2_fm: 3, osc2_tune: st(-3), filter_type: 3, cutoff: 54,
         resonance: 10, keyfollow: 42, filter_env: 26,
         fenv_d: 44, fenv_s: 16, aenv_a: 0, aenv_d: 60, aenv_s: 44, aenv_r: 46 } },

  { cat: "KB", name: "Analog Stack", fx: [FX.chorusWide, FX.plate, FX.eighth],
    p: { ...KK, osc1_wave: 0, osc2_wave: 1, osc2_vol: 60, osc2_tune: st(12),
         detune: 30, filter_type: 2, cutoff: 46, resonance: 18,
         keyfollow: 44, filter_env: 40, fenv_d: 40, fenv_s: 20, fenv_r: 34,
         aenv_a: 0, aenv_d: 52, aenv_s: 58, aenv_r: 38 } },

  { cat: "KB", name: "Dust Organ", fx: [FX.chorusDeep, FX.murk, FX.tape],
    p: { ...KK, osc1_wave: 1, osc1_pw: 48, osc2_wave: 1, osc2_vol: 58,
         osc2_tune: st(12), detune: 20, vintage: 56, filter_type: 1,
         cutoff: 40, resonance: 14, filter_env: 18,
         aenv_a: 4, aenv_d: 34, aenv_s: 86, aenv_r: 40 } },

  { cat: "KB", name: "Broken Tine", fx: [FX.gated, FX.tape],
    p: { ...KK, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 78,
         osc2_fm: 12, osc2_tune: st(-12), bitcrush: 40, filter_drive: 30,
         filter_type: 5, cutoff: 48, resonance: 26, filter_env: 32,
         fenv_d: 34, fenv_s: 8, aenv_a: 0, aenv_d: 50, aenv_s: 26, aenv_r: 34 } },

  { cat: "KB", name: "Chapel Reed", fx: [FX.chorusWide, FX.cathedral, FX.quarter],
    p: { ...KK, osc1_wave: 1, osc1_pw: 36, osc2_wave: 2, osc2_vol: 56,
         osc2_tune: st(12), detune: 18, filter_type: 3, cutoff: 48,
         resonance: 12, filter_env: 22, fenv_a: 8, fenv_d: 36, fenv_s: 44,
         aenv_a: 10, aenv_d: 40, aenv_s: 84, aenv_r: 50 } },

  { cat: "KB", name: "Sub Keys", fx: [FX.chorus, FX.plate, FX.slap],
    p: { ...KK, osc1_wave: 0, osc2_wave: 0, osc2_vol: 52, osc3_vol: 56,
         detune: 24, filter_type: 3, cutoff: 42, resonance: 12,
         keyfollow: 40, filter_env: 34, fenv_d: 40, fenv_s: 18, fenv_r: 32,
         aenv_a: 0, aenv_d: 54, aenv_s: 56, aenv_r: 36 } },

  /* ---- ARP +4 ------------------------------------------------------------ */

  { cat: "ARP", name: "Night Shift", fx: [FX.chorusWide, FX.hall, FX.pingpong],
    p: { ...AA, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, osc2_tune: st(12),
         detune: 22, filter_type: 2, cutoff: 42, resonance: 36,
         keyfollow: 46, filter_env: 62, fenv_d: 20, fenv_s: 0,
         aenv_d: 24, aenv_r: 10 } },

  { cat: "ARP", name: "Conveyor", fx: [FX.gated, FX.eighth],
    p: { ...AA, osc1_wave: 1, osc1_pw: 20, osc2_wave: 1, osc2_vol: 54,
         detune: 30, filter_drive: 52, bitcrush: 42, filter_type: 0,
         cutoff: 36, resonance: 42, filter_env: 60, fenv_d: 16, fenv_s: 0,
         aenv_d: 18, aenv_r: 6 } },

  { cat: "ARP", name: "Glass Steps", fx: [FX.chorusWide, FX.cathedral, FX.dotted],
    p: { ...AA, osc1_wave: 0, osc2_wave: 3, osc2_vol: 58, osc2_tune: st(12),
         detune: 16, filter_type: 3, cutoff: 58, resonance: 12,
         filter_env: 30, fenv_d: 24, fenv_s: 0, aenv_d: 28, aenv_r: 14 } },

  { cat: "ARP", name: "Deep Runner", fx: [FX.chorusDeep, FX.murk, FX.quarter],
    p: { ...AA, osc1_wave: 0, osc2_wave: 0, osc2_vol: 54, osc2_tune: st(-12),
         osc3_vol: 48, detune: 26, vintage: 34, filter_type: 1, cutoff: 30,
         resonance: 32, keyfollow: 42, filter_env: 64, fenv_d: 22, fenv_s: 0,
         aenv_d: 26, aenv_r: 12 } },
];
