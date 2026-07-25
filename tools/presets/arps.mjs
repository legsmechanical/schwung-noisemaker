/* ARP — arpeggio/sequence voices. Mono, with a very short release: the
 * factory median for this category is amp R .048, i.e. deliberately staccato
 * so runs don't smear into themselves at speed. */
import { FX, st } from "./base.mjs";

const A = { voices: 1, vel_vol: 25, vel_env: 35, aenv_a: 0, aenv_s: 0 };

export const arps = [
  { cat: "ARP", name: "Runner", fx: [FX.chorus, FX.room, FX.eighth],
    p: { ...A, osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, detune: 24,
         filter_type: 1, cutoff: 40, resonance: 38, keyfollow: 44,
         filter_env: 70, fenv_d: 22, fenv_s: 0, fenv_r: 14,
         aenv_d: 24, aenv_r: 10 } },

  { cat: "ARP", name: "Grid Lock", fx: [FX.chorus, FX.gated, FX.pingpong],
    p: { ...A, osc1_wave: 1, osc1_pw: 34, osc2_wave: 1, osc2_vol: 54,
         detune: 20, filter_type: 2, cutoff: 46, resonance: 44,
         keyfollow: 48, filter_env: 64, fenv_d: 18, fenv_s: 0, fenv_r: 12,
         aenv_d: 20, aenv_r: 8 } },

  /* Classic acid sequence. Resonance vs drive is the taste axis. */
  { cat: "ARP", name: "Acid Run", fx: [FX.room, FX.eighth],
    p: { ...A, osc1_wave: 0, osc2_vol: 0, filter_type: 0, cutoff: 26,
         keyfollow: 46, filter_env: 78, fenv_d: 18, fenv_s: 0, fenv_r: 10,
         aenv_d: 22, aenv_r: 8, portamento: 10, porta_mode: 1 },
    vars: [
      { p: { resonance: 62 } },
      { p: { resonance: 80, filter_drive: 22 } },
      { p: { resonance: 90, filter_drive: 44, bitcrush: 48 } },
    ] },

  { cat: "ARP", name: "Neon Ladder", fx: [FX.chorusWide, FX.plate, FX.dotted],
    p: { ...A, osc1_wave: 0, osc2_wave: 0, osc2_vol: 56, detune: 28,
         filter_type: 10, cutoff: 38, resonance: 52, keyfollow: 46,
         filter_env: 66, fenv_d: 20, fenv_s: 0, fenv_r: 12,
         aenv_d: 24, aenv_r: 10 } },

  { cat: "ARP", name: "Telegraph", fx: [FX.chorus, FX.room, FX.pingpong],
    p: { ...A, osc1_wave: 1, osc1_pw: 22, osc2_vol: 0, filter_type: 3,
         cutoff: 56, resonance: 20, keyfollow: 50, filter_env: 46,
         fenv_d: 16, fenv_s: 0, fenv_r: 10, aenv_d: 18, aenv_r: 6 } },

  { cat: "ARP", name: "Rust Sequence", fx: [FX.gated, FX.tape],
    p: { ...A, osc1_wave: 1, osc1_pw: 28, osc2_wave: 1, osc2_vol: 52,
         detune: 34, bitcrush: 40, filter_drive: 46, filter_type: 5,
         cutoff: 42, resonance: 40, filter_env: 58,
         fenv_d: 18, fenv_s: 0, aenv_d: 20, aenv_r: 8 } },

  { cat: "ARP", name: "Cold Pulse", fx: [FX.chorusWide, FX.hall, FX.dotted],
    p: { ...A, osc1_wave: 1, osc1_pw: 42, osc2_wave: 2, osc2_vol: 54,
         osc2_tune: st(12), detune: 18, filter_type: 3, cutoff: 52,
         resonance: 24, keyfollow: 44, filter_env: 50,
         fenv_d: 20, fenv_s: 0, aenv_d: 22, aenv_r: 10 } },

  { cat: "ARP", name: "Bell Grid", fx: [FX.chorus, FX.plate, FX.eighth],
    p: { ...A, osc1_wave: 0, osc1_vol: 0, osc2_wave: 3, osc2_vol: 80,
         osc2_fm: 8, osc2_tune: st(-8), filter_type: 3, cutoff: 58,
         resonance: 10, filter_env: 24, fenv_d: 22, fenv_s: 0,
         aenv_d: 28, aenv_r: 12 } },

  { cat: "ARP", name: "State Runner", fx: [FX.chorusWide, FX.plate, FX.pingpong],
    p: { ...A, osc1_wave: 0, osc2_wave: 0, osc2_vol: 56, detune: 26,
         filter_type: 9, cutoff: 44, resonance: 46, keyfollow: 44,
         filter_env: 56, fenv_d: 18, fenv_s: 0, aenv_d: 22, aenv_r: 8 } },

  { cat: "ARP", name: "Sub Pulse", fx: [FX.chorus, FX.room, FX.eighth],
    p: { ...A, osc1_wave: 0, osc2_vol: 0, osc3_vol: 64, filter_type: 1,
         cutoff: 32, resonance: 26, keyfollow: 40, filter_env: 64,
         fenv_d: 20, fenv_s: 0, aenv_d: 24, aenv_r: 10 } },

  { cat: "ARP", name: "Vintage Step", fx: [FX.chorus, FX.murk, FX.tape],
    p: { ...A, osc1_wave: 0, osc2_wave: 0, osc2_vol: 54, detune: 32,
         vintage: 46, filter_type: 1, cutoff: 34, resonance: 34,
         keyfollow: 42, filter_env: 62, fenv_d: 22, fenv_s: 0,
         aenv_d: 26, aenv_r: 12 } },

  { cat: "ARP", name: "Ring Step", fx: [FX.gated, FX.pingpong],
    p: { ...A, osc1_wave: 0, osc1_vol: 48, osc2_wave: 0, osc2_vol: 48,
         osc2_tune: st(7), ringmod: 26, filter_type: 2, cutoff: 44,
         resonance: 30, filter_env: 54, fenv_d: 18, fenv_s: 0,
         aenv_d: 20, aenv_r: 8 } },
];

export default arps;
