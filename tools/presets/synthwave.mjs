/* SW — the synthwave bank. A SECOND bank that ships alongside the original
 * "JG" one (prefix "SW"), so both can be browsed and A/B'd on the device.
 *
 * ---------------------------------------------------------------------------
 * Why this bank exists. The JG bank measured, across all 146 patches:
 *   - LFO 1 routed to a destination on 6 of them, LFO 2 on 1, the free
 *     envelope on ZERO and the Envelope Editor on ZERO. It set `free_amt: 50`
 *     everywhere while leaving `free_dest` at Off, so it read as modulated and
 *     was not. Effectively a bank of static patches.
 *   - Median spectral centroid 706 Hz, 73/146 with essentially no energy above
 *     2 kHz, `cutoff` averaging 40.6/100 and never once exceeding 64. 121 of
 *     146 were a lowpass.
 *   - Every single patch had BOTH reverb and delay on, with `reverb_wet` taking
 *     6 distinct values bank-wide and `delay_wet` 5. One wash, everywhere.
 *
 * So the rules here, and the contract checks in gen_presets.mjs enforce the
 * first one because it is the whole point of the bank:
 *   1. EVERY preset routes at least one modulator with real depth. No patch
 *      ships static.
 *   2. Bright by default. Higher cutoff, more keyfollow, shallower filter
 *      slopes (LP12/LP6/BP/SV) where the character allows, and harmonics
 *      generated ABOVE the filter via drive / FM / ring mod rather than by
 *      merely opening it. Nothing here should measure under ~400 Hz unless it
 *      is deliberately a sub.
 *   3. Still nothing dry -- but the wet spread is wide. SWFX spans reverb_wet
 *      12..62 and delay_wet 14..55 instead of 22..52 / 20..36.
 *
 * Modulation vocabulary (destination enums, from the wrapper's PARAMS[]):
 *   lfo1_dest / lfo2_dest : 0 None 1 Filter 2 Osc1 3 Osc2 4 PW 5 FM
 *                           6 the-other-LFO 7 Osc1+2
 *   free_dest             : 0 Off 1 Filter 2 Osc1 3 Osc2 4 PW 5 FM
 *   lfo waveform          : 0 Sin 1 Tri 2 Saw 3 Sqr 4 S+H 5 Rnd
 *   filter_type           : 0 LP24 1 LP18 2 LP12 3 LP6 4 HP24 5 BP24 6 Notch
 *                           7 SV-LP 8 SV-HP 9 SV-BP 10 Moog 11 Moog2
 */
import { FX, st } from "./base.mjs";

/* ---- FX flavours, spread hard ------------------------------------------
 * Same "nothing dry" brief, but these have to stop sounding like one room.
 * Reuses the base FX where the shape was already right; the additions fill in
 * the dry end (air/tick) and the drenched end (cavern/wide) that were missing.
 * reverb_hi is a HIGH CUT: lower = darker tail. */
const SWFX = {
  ...FX,

  air:      { reverb_wet: 12, reverb_decay: 20, reverb_pre: 4,  reverb_hi: 88, reverb_lo: 16 },
  chamber:  { reverb_wet: 28, reverb_decay: 44, reverb_pre: 12, reverb_hi: 78, reverb_lo: 12 },
  cavern:   { reverb_wet: 62, reverb_decay: 86, reverb_pre: 24, reverb_hi: 56, reverb_lo: 20 },
  /* Bright short gate -- the 80s stab treatment, and the one reverb that does
   * not cost you top end. */
  snap:     { reverb_wet: 44, reverb_decay: 16, reverb_pre: 3,  reverb_hi: 92, reverb_lo: 30 },

  /* delay_fb is the LOOP GAIN x100 (K_FBGAIN); 100 is where the line stops
   * decaying on its own, so these stay well below it. */
  tick:     { delay_wet: 14, delay_time: 10, delay_fb: 18, delay_sync: 0, delay_hi: 60, delay_lo: 24 },
  sixteenth:{ delay_wet: 26, delay_time: 12, delay_fb: 38, delay_sync: 1, delay_hi: 62, delay_lo: 22 },
  wide:     { delay_wet: 55, delay_time: 30, delay_fb: 70, delay_sync: 1, delay_fac_l: 1, delay_hi: 40, delay_lo: 30 },
  triplet:  { delay_wet: 44, delay_time: 33, delay_fb: 58, delay_sync: 1, delay_fac_r: 1, delay_hi: 58, delay_lo: 26 },
};

/* ---- modulation building blocks ----------------------------------------
 * Spread as layers so each patch reads as "this sound + this movement", and so
 * the movement is never accidentally omitted. */

/* Classic PWM: triangle LFO on pulse width. The single most retro-sounding
 * modulation this engine has, and it needs a pulse osc to hear it. */
const PWM = (amount = 42, rate = 24) =>
  ({ lfo1_wave: 1, lfo1_rate: rate, lfo1_amount: amount, lfo1_dest: 4, lfo1_keytrig: 0 });

/* Filter wobble. Sine for smooth, square for the gated/stepped feel. */
const WOBBLE = (amount = 34, rate = 30, wave = 0) =>
  ({ lfo1_wave: wave, lfo1_rate: rate, lfo1_amount: amount, lfo1_dest: 1 });

/* Slow stereo-ish drift on both oscillators -- the "analog instability" that
 * keeps a held chord from sounding like a sample. Deliberately tiny. */
const DRIFT = (amount = 12, rate = 8) =>
  ({ lfo2_wave: 0, lfo2_rate: rate, lfo2_amount: amount, lfo2_dest: 7 });

/* Delayed vibrato on LFO2 so it does not smear the attack. */
const VIB = (amount = 16, rate = 34) =>
  ({ lfo2_wave: 0, lfo2_rate: rate, lfo2_amount: amount, lfo2_dest: 7 });

/* Env 3 (the free A/D envelope) as a per-note accent. Short = a click/blip on
 * the attack, which is where the "modern" bite comes from. */
const BLIP = (amt = 72, dec = 18, dest = 1) =>
  ({ free_a: 0, free_d: dec, free_amt: amt, free_dest: dest });

/* Sample-and-hold on the filter: the arpeggio-adjacent random stepping. */
const SH = (amount = 40, rate = 52) =>
  ({ lfo1_wave: 4, lfo1_rate: rate, lfo1_amount: amount, lfo1_dest: 1 });

const BASS  = { voices: 1, vel_vol: 15, vel_env: 30 };
const POLY  = { voices: 6, vel_vol: 22, vel_env: 20 };
const MONO  = { voices: 1, vel_vol: 20, vel_env: 25 };

export default [
  /* ======================= BS — bass ================================== */
  /* Basses stay dark by nature, but they get movement and a defined top edge
   * (drive / resonance) so they read as a synth rather than a sine. */

  { cat: "BS", prefix: "SW", name: "Nightdrive", fx: [SWFX.chorus, SWFX.air, SWFX.tick],
    p: { ...BASS, ...PWM(38, 18), ...BLIP(60, 22),
         osc1_wave: 1, osc1_pw: 42, osc2_wave: 0, osc2_vol: 58, osc2_tune: st(-12),
         osc3_vol: 58, detune: 24, filter_type: 2, cutoff: 42, resonance: 38,
         keyfollow: 42, filter_env: 74, filter_drive: 26,
         fenv_d: 30, fenv_s: 12, fenv_r: 28, aenv_d: 50, aenv_s: 76, aenv_r: 26 } },

  { cat: "BS", prefix: "SW", name: "Outrun", fx: [SWFX.chorusWide, SWFX.room, SWFX.sixteenth],
    p: { ...BASS, ...WOBBLE(26, 22), ...DRIFT(10, 6),
         osc1_wave: 0, osc2_wave: 0, osc1_vol: 74, osc2_vol: 70, osc3_vol: 38,
         detune: 46, filter_type: 2, cutoff: 48, resonance: 32, keyfollow: 46,
         filter_env: 66, filter_drive: 30, fenv_d: 36, fenv_s: 16, fenv_r: 32,
         aenv_s: 78, aenv_r: 30 } },

  { cat: "BS", prefix: "SW", name: "Acid Drive", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...BASS, ...BLIP(84, 14),
         osc1_wave: 0, osc1_vol: 82, osc2_vol: 0, osc3_vol: 26,
         filter_type: 10, cutoff: 34, resonance: 74, keyfollow: 52,
         filter_env: 86, filter_drive: 44, fenv_d: 22, fenv_s: 0, fenv_r: 18,
         aenv_d: 38, aenv_s: 58, aenv_r: 18, portamento: 14, porta_mode: 1 } },

  { cat: "BS", prefix: "SW", name: "Reso Stab", fx: [SWFX.snap, SWFX.tick],
    p: { ...BASS, ...BLIP(90, 10),
         osc1_wave: 1, osc1_pw: 28, osc2_wave: 1, osc2_vol: 52, osc2_tune: st(-12),
         osc3_vol: 34, detune: 20, filter_type: 5, cutoff: 52, resonance: 62,
         keyfollow: 40, filter_env: 78, filter_drive: 38,
         fenv_d: 18, fenv_s: 0, fenv_r: 14, aenv_d: 30, aenv_s: 40, aenv_r: 16 } },

  { cat: "BS", prefix: "SW", name: "FM Growl", fx: [SWFX.chamber, SWFX.tick],
    p: { ...BASS, ...BLIP(76, 26, 5), ...DRIFT(8, 5),
         osc1_wave: 0, osc2_wave: 3, osc2_vol: 44, osc2_tune: st(-12), osc2_fm: 11,
         osc3_vol: 48, detune: 14, filter_type: 1, cutoff: 40, resonance: 30,
         keyfollow: 38, filter_env: 68, filter_drive: 34,
         fenv_d: 32, fenv_s: 10, aenv_s: 74, aenv_r: 26 } },

  { cat: "BS", prefix: "SW", name: "Ring Bass", fx: [SWFX.chorus, SWFX.snap, SWFX.tick],
    p: { ...BASS, ...WOBBLE(30, 26, 3),
         osc1_wave: 1, osc1_pw: 36, osc2_wave: 1, osc2_vol: 58, osc2_tune: st(7),
         ringmod: 24, osc3_vol: 44, detune: 16, filter_type: 2, cutoff: 46,
         resonance: 36, keyfollow: 40, filter_env: 70, filter_drive: 28,
         fenv_d: 26, fenv_s: 8, aenv_d: 42, aenv_s: 66, aenv_r: 22 } },

  { cat: "BS", prefix: "SW", name: "Moog Sub", fx: [SWFX.air, SWFX.tick],
    p: { ...BASS, ...BLIP(58, 30),
         osc1_wave: 0, osc1_vol: 66, osc2_vol: 0, osc3_vol: 84,
         filter_type: 11, cutoff: 38, resonance: 24, keyfollow: 34,
         filter_env: 56, filter_drive: 40, fenv_d: 28, fenv_s: 14,
         aenv_a: 2, aenv_s: 84, aenv_r: 24, detune: 8, highpass: 4 } },

  { cat: "BS", prefix: "SW", name: "PWM Bass", fx: [SWFX.chorusWide, SWFX.room, SWFX.slap],
    p: { ...BASS, ...PWM(56, 26), ...DRIFT(10, 7),
         osc1_wave: 1, osc1_pw: 50, osc2_wave: 1, osc2_vol: 62, osc2_tune: st(-12),
         osc3_vol: 40, detune: 22, filter_type: 2, cutoff: 50, resonance: 28,
         keyfollow: 44, filter_env: 62, filter_drive: 24,
         fenv_d: 34, fenv_s: 14, aenv_s: 78, aenv_r: 28 } },

  { cat: "BS", prefix: "SW", name: "Sync Bass", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...BASS, ...BLIP(80, 20, 3),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, osc2_tune: st(5), osc_sync: 1,
         osc3_vol: 30, detune: 10, filter_type: 2, cutoff: 54, resonance: 40,
         keyfollow: 44, filter_env: 76, filter_drive: 36,
         fenv_d: 24, fenv_s: 4, aenv_d: 36, aenv_s: 60, aenv_r: 18 } },

  { cat: "BS", prefix: "SW", name: "Tape Sub", fx: [SWFX.chorus, SWFX.murk, SWFX.tape],
    p: { ...BASS, ...DRIFT(18, 4), ...BLIP(50, 34),
         osc1_wave: 0, osc2_wave: 2, osc2_vol: 54, osc2_tune: st(-12),
         osc3_vol: 50, vintage: 46, detune: 32, filter_type: 1, cutoff: 36,
         resonance: 26, keyfollow: 32, filter_env: 60, filter_drive: 20,
         fenv_d: 34, fenv_s: 12, aenv_s: 78, aenv_r: 32, highpass: 8 } },

  { cat: "BS", prefix: "SW", name: "Gated Bass", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...BASS, ...WOBBLE(56, 58, 3),
         osc1_wave: 1, osc1_pw: 34, osc2_wave: 0, osc2_vol: 56, osc3_vol: 42,
         detune: 18, filter_type: 2, cutoff: 46, resonance: 44, keyfollow: 38,
         filter_env: 64, filter_drive: 30, fenv_d: 26, fenv_s: 10,
         aenv_d: 40, aenv_s: 70, aenv_r: 20 } },

  { cat: "BS", prefix: "SW", name: "Crush Bass", fx: [SWFX.chamber, SWFX.tick],
    p: { ...BASS, ...BLIP(70, 22), ...DRIFT(8, 6),
         osc1_wave: 1, osc1_pw: 40, osc2_wave: 0, osc2_vol: 50, osc2_tune: st(-12),
         osc3_vol: 46, bitcrush: 52, detune: 20, filter_type: 2, cutoff: 44,
         resonance: 34, keyfollow: 36, filter_env: 66, filter_drive: 32,
         fenv_d: 28, fenv_s: 10, aenv_s: 74, aenv_r: 24 } },

  /* ======================= LD — leads ================================= */
  /* The bright end of the bank. Leads carry the melody so they sit high, with
   * vibrato and PWM doing the "played" feel. */

  { cat: "LD", prefix: "SW", name: "Neon", fx: [SWFX.chorusWide, SWFX.plate, SWFX.dotted],
    p: { ...MONO, ...PWM(48, 28), ...VIB(18, 36),
         osc1_wave: 1, osc1_pw: 46, osc2_wave: 0, osc2_vol: 64, osc2_tune: st(-12),
         detune: 30, filter_type: 2, cutoff: 74, resonance: 30, keyfollow: 58,
         filter_env: 48, filter_drive: 26, fenv_d: 40, fenv_s: 42, fenv_r: 34,
         aenv_a: 3, aenv_s: 84, aenv_r: 30, portamento: 10, porta_mode: 1 } },

  { cat: "LD", prefix: "SW", name: "Sync Scream", fx: [SWFX.snap, SWFX.triplet],
    p: { ...MONO, ...BLIP(86, 24, 3), ...VIB(22, 38),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 74, osc2_tune: st(7), osc_sync: 1,
         detune: 12, filter_type: 3, cutoff: 82, resonance: 34, keyfollow: 62,
         filter_env: 58, filter_drive: 44, fenv_d: 30, fenv_s: 30, fenv_r: 26,
         aenv_a: 2, aenv_s: 82, aenv_r: 24 } },

  { cat: "LD", prefix: "SW", name: "Hero Saw", fx: [SWFX.chorusWide, SWFX.hall, SWFX.dotted],
    p: { ...MONO, ...VIB(20, 34), ...DRIFT(14, 6),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 78, detune: 58,
         filter_type: 2, cutoff: 78, resonance: 24, keyfollow: 60,
         filter_env: 44, filter_drive: 30, fenv_d: 44, fenv_s: 48, fenv_r: 36,
         aenv_a: 4, aenv_s: 86, aenv_r: 34, portamento: 8, porta_mode: 1 } },

  { cat: "LD", prefix: "SW", name: "Glass Bell", fx: [SWFX.chorus, SWFX.cavern, SWFX.triplet],
    p: { ...POLY, ...BLIP(64, 30, 5), ...DRIFT(10, 7),
         osc1_wave: 0, osc1_vol: 46, osc2_wave: 3, osc2_vol: 72, osc2_tune: st(12),
         osc2_fm: 12, ringmod: 18, detune: 14, filter_type: 3, cutoff: 86,
         resonance: 18, keyfollow: 64, filter_env: 40, fenv_d: 34, fenv_s: 26,
         aenv_a: 0, aenv_d: 60, aenv_s: 30, aenv_r: 44 } },

  { cat: "LD", prefix: "SW", name: "PWM Lead", fx: [SWFX.chorusDeep, SWFX.plate, SWFX.eighth],
    p: { ...MONO, ...PWM(62, 32), ...VIB(14, 40),
         osc1_wave: 1, osc1_pw: 52, osc2_wave: 1, osc2_vol: 58, osc2_tune: st(-12),
         detune: 24, filter_type: 2, cutoff: 76, resonance: 28, keyfollow: 56,
         filter_env: 46, filter_drive: 24, fenv_d: 38, fenv_s: 40, fenv_r: 32,
         aenv_a: 3, aenv_s: 84, aenv_r: 28 } },

  { cat: "LD", prefix: "SW", name: "Whistle", fx: [SWFX.chorus, SWFX.hall, SWFX.dotted],
    p: { ...MONO, ...VIB(26, 42), ...BLIP(48, 26, 5),
         osc1_wave: 0, osc1_vol: 34, osc2_wave: 3, osc2_vol: 80, osc2_fm: 6,
         detune: 10, filter_type: 3, cutoff: 88, resonance: 16, keyfollow: 66,
         filter_env: 34, fenv_d: 36, fenv_s: 40,
         aenv_a: 8, aenv_s: 88, aenv_r: 34, portamento: 16, porta_mode: 1 } },

  { cat: "LD", prefix: "SW", name: "Acid Lead", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...MONO, ...BLIP(88, 16),
         osc1_wave: 0, osc2_vol: 0, filter_type: 10, cutoff: 58, resonance: 78,
         keyfollow: 60, filter_env: 82, filter_drive: 46,
         fenv_d: 24, fenv_s: 6, fenv_r: 18, aenv_d: 40, aenv_s: 70, aenv_r: 18,
         portamento: 18, porta_mode: 1 } },

  { cat: "LD", prefix: "SW", name: "Ring Lead", fx: [SWFX.chorus, SWFX.snap, SWFX.triplet],
    p: { ...MONO, ...WOBBLE(34, 34), ...VIB(16, 36),
         osc1_wave: 1, osc1_pw: 40, osc2_wave: 1, osc2_vol: 66, osc2_tune: st(7),
         ringmod: 26, detune: 18, filter_type: 5, cutoff: 72, resonance: 40,
         keyfollow: 54, filter_env: 52, filter_drive: 34,
         fenv_d: 32, fenv_s: 34, aenv_a: 2, aenv_s: 80, aenv_r: 26 } },

  { cat: "LD", prefix: "SW", name: "Chime", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...BLIP(58, 24, 5), ...DRIFT(12, 8),
         osc1_wave: 0, osc1_vol: 40, osc2_wave: 3, osc2_vol: 76, osc2_tune: st(19),
         osc2_fm: 9, detune: 12, filter_type: 3, cutoff: 90, resonance: 14,
         keyfollow: 68, filter_env: 32, fenv_d: 30,
         aenv_a: 0, aenv_d: 55, aenv_s: 24, aenv_r: 48 } },

  { cat: "LD", prefix: "SW", name: "Drive Lead", fx: [SWFX.chamber, SWFX.eighth],
    p: { ...MONO, ...PWM(40, 30), ...BLIP(70, 20),
         osc1_wave: 1, osc1_pw: 34, osc2_wave: 0, osc2_vol: 62, detune: 34,
         filter_type: 10, cutoff: 68, resonance: 44, keyfollow: 56,
         filter_env: 60, filter_drive: 52, fenv_d: 30, fenv_s: 28, fenv_r: 26,
         aenv_a: 2, aenv_s: 82, aenv_r: 24 } },

  { cat: "LD", prefix: "SW", name: "Detune Stack", fx: [SWFX.chorusWide, SWFX.hall, SWFX.wide],
    p: { ...POLY, ...DRIFT(20, 5), ...VIB(12, 32), voices: 6,
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 82, osc2_fine: 56, detune: 70,
         filter_type: 2, cutoff: 72, resonance: 20, keyfollow: 56,
         filter_env: 42, filter_drive: 26, fenv_d: 46, fenv_s: 46,
         aenv_a: 6, aenv_s: 86, aenv_r: 38 } },

  { cat: "LD", prefix: "SW", name: "S+H Lead", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...MONO, ...SH(46, 56), ...VIB(14, 34),
         osc1_wave: 1, osc1_pw: 44, osc2_wave: 0, osc2_vol: 58, detune: 26,
         filter_type: 5, cutoff: 66, resonance: 48, keyfollow: 52,
         filter_env: 54, filter_drive: 32, fenv_d: 28, fenv_s: 30,
         aenv_a: 2, aenv_s: 80, aenv_r: 22 } },

  { cat: "LD", prefix: "SW", name: "Vox Lead", fx: [SWFX.chorusDeep, SWFX.plate, SWFX.dotted],
    p: { ...MONO, ...PWM(52, 20), ...VIB(18, 38),
         osc1_wave: 1, osc1_pw: 62, osc2_wave: 1, osc2_vol: 60, osc2_tune: st(-12),
         detune: 26, filter_type: 6, cutoff: 70, resonance: 34, keyfollow: 54,
         filter_env: 44, filter_drive: 22, fenv_d: 40, fenv_s: 44,
         aenv_a: 6, aenv_s: 86, aenv_r: 30 } },

  { cat: "LD", prefix: "SW", name: "Crush Lead", fx: [SWFX.snap, SWFX.triplet],
    p: { ...MONO, ...BLIP(78, 18), ...VIB(16, 36),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 60, osc2_tune: st(12),
         bitcrush: 46, detune: 22, filter_type: 3, cutoff: 80, resonance: 30,
         keyfollow: 60, filter_env: 50, filter_drive: 38,
         fenv_d: 26, fenv_s: 32, aenv_a: 2, aenv_s: 82, aenv_r: 22 } },

  /* ======================= PD — pads ================================== */
  /* Pads are where DRIFT earns its keep: slow, small, always on. Attacks are
   * soft but the filters stay open enough that they still have a top edge. */

  { cat: "PD", prefix: "SW", name: "Neon Wash", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...PWM(46, 12), ...DRIFT(18, 4),
         osc1_wave: 1, osc1_pw: 50, osc2_wave: 0, osc2_vol: 72, osc2_tune: st(-12),
         detune: 44, filter_type: 2, cutoff: 62, resonance: 22, keyfollow: 44,
         filter_env: 40, fenv_a: 22, fenv_d: 60, fenv_s: 50, fenv_r: 60,
         aenv_a: 34, aenv_d: 60, aenv_s: 86, aenv_r: 62 } },

  { cat: "PD", prefix: "SW", name: "Warm Drift", fx: [SWFX.chorus, SWFX.hall, SWFX.tape],
    p: { ...POLY, ...DRIFT(24, 3), ...PWM(34, 9),
         osc1_wave: 1, osc1_pw: 46, osc2_wave: 0, osc2_vol: 66, vintage: 38,
         detune: 40, filter_type: 1, cutoff: 56, resonance: 18, keyfollow: 40,
         filter_env: 36, fenv_a: 30, fenv_d: 66, fenv_s: 48, fenv_r: 64,
         aenv_a: 44, aenv_s: 84, aenv_r: 66 } },

  { cat: "PD", prefix: "SW", name: "Glass Pad", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.triplet],
    p: { ...POLY, ...DRIFT(14, 5), ...BLIP(46, 40, 5),
         osc1_wave: 0, osc1_vol: 52, osc2_wave: 3, osc2_vol: 68, osc2_tune: st(12),
         osc2_fm: 7, detune: 26, filter_type: 3, cutoff: 82, resonance: 14,
         keyfollow: 58, filter_env: 30, fenv_a: 18, fenv_d: 60, fenv_s: 46,
         aenv_a: 28, aenv_s: 86, aenv_r: 58 } },

  { cat: "PD", prefix: "SW", name: "Sweep Pad", fx: [SWFX.chorusDeep, SWFX.hall, SWFX.wide],
    p: { ...POLY, ...WOBBLE(44, 7), ...DRIFT(16, 4),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 74, detune: 52,
         filter_type: 2, cutoff: 58, resonance: 34, keyfollow: 42,
         filter_env: 46, fenv_a: 26, fenv_d: 70, fenv_s: 44, fenv_r: 66,
         aenv_a: 38, aenv_s: 84, aenv_r: 64 } },

  { cat: "PD", prefix: "SW", name: "Choir", fx: [SWFX.chorusWide, SWFX.cathedral, SWFX.wide],
    p: { ...POLY, ...PWM(56, 8), ...DRIFT(20, 3),
         osc1_wave: 1, osc1_pw: 58, osc2_wave: 1, osc2_vol: 70, osc2_tune: st(-12),
         detune: 46, filter_type: 6, cutoff: 64, resonance: 26, keyfollow: 44,
         filter_env: 34, fenv_a: 34, fenv_d: 64, fenv_s: 48,
         aenv_a: 52, aenv_s: 88, aenv_r: 70 } },

  { cat: "PD", prefix: "SW", name: "Dark Drift", fx: [SWFX.chorus, SWFX.murk, SWFX.tape],
    p: { ...POLY, ...DRIFT(26, 3), ...WOBBLE(28, 5),
         osc1_wave: 0, osc2_wave: 2, osc2_vol: 64, osc2_tune: st(-12),
         vintage: 54, detune: 38, filter_type: 1, cutoff: 46, resonance: 24,
         keyfollow: 34, filter_env: 38, fenv_a: 32, fenv_d: 70, fenv_s: 40,
         aenv_a: 48, aenv_s: 82, aenv_r: 72, highpass: 6 } },

  { cat: "PD", prefix: "SW", name: "Shimmer", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.triplet],
    p: { ...POLY, ...DRIFT(12, 6), ...BLIP(52, 46, 5),
         osc1_wave: 0, osc1_vol: 46, osc2_wave: 3, osc2_vol: 70, osc2_tune: st(19),
         osc2_fm: 8, ringmod: 14, detune: 22, filter_type: 3, cutoff: 88,
         resonance: 12, keyfollow: 62, filter_env: 26,
         fenv_a: 20, fenv_d: 58, fenv_s: 44, aenv_a: 30, aenv_s: 86, aenv_r: 60 } },

  { cat: "PD", prefix: "SW", name: "Sync Pad", fx: [SWFX.chorusDeep, SWFX.hall, SWFX.wide],
    p: { ...POLY, ...WOBBLE(38, 6), ...DRIFT(14, 4),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 70, osc2_tune: st(5), osc_sync: 1,
         detune: 24, filter_type: 2, cutoff: 66, resonance: 30, keyfollow: 48,
         filter_env: 42, fenv_a: 24, fenv_d: 64, fenv_s: 46,
         aenv_a: 36, aenv_s: 84, aenv_r: 60 } },

  { cat: "PD", prefix: "SW", name: "Ring Pad", fx: [SWFX.chorusWide, SWFX.cathedral, SWFX.wide],
    p: { ...POLY, ...DRIFT(18, 4), ...PWM(38, 10),
         osc1_wave: 1, osc1_pw: 44, osc2_wave: 1, osc2_vol: 62, osc2_tune: st(7),
         ringmod: 22, detune: 30, filter_type: 5, cutoff: 70, resonance: 28,
         keyfollow: 46, filter_env: 36, fenv_a: 28, fenv_d: 62, fenv_s: 44,
         aenv_a: 40, aenv_s: 84, aenv_r: 64 } },

  { cat: "PD", prefix: "SW", name: "Strings", fx: [SWFX.chorusWide, SWFX.hall, SWFX.wide],
    p: { ...POLY, ...DRIFT(22, 4), ...VIB(14, 30),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 80, osc2_fine: 55, detune: 62,
         filter_type: 2, cutoff: 60, resonance: 16, keyfollow: 44,
         filter_env: 34, fenv_a: 30, fenv_d: 66, fenv_s: 46,
         aenv_a: 42, aenv_s: 88, aenv_r: 68 } },

  { cat: "PD", prefix: "SW", name: "Cold Air", fx: [SWFX.chorus, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...SH(30, 26), ...DRIFT(16, 5),
         osc1_wave: 1, osc1_pw: 66, osc2_wave: 0, osc2_vol: 56, osc2_tune: st(12),
         detune: 34, filter_type: 8, cutoff: 54, resonance: 32, keyfollow: 46,
         filter_env: 40, fenv_a: 26, fenv_d: 60, fenv_s: 44,
         aenv_a: 46, aenv_s: 84, aenv_r: 66 } },

  { cat: "PD", prefix: "SW", name: "Crush Pad", fx: [SWFX.chorusDeep, SWFX.murk, SWFX.tape],
    p: { ...POLY, ...DRIFT(20, 4), ...WOBBLE(30, 6),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 66, bitcrush: 54, vintage: 30,
         detune: 42, filter_type: 2, cutoff: 58, resonance: 26, keyfollow: 40,
         filter_env: 38, fenv_a: 28, fenv_d: 64, fenv_s: 42,
         aenv_a: 40, aenv_s: 82, aenv_r: 62 } },

  /* ======================= KB — keys ================================== */

  { cat: "KB", prefix: "SW", name: "Tine EP", fx: [SWFX.chorusWide, SWFX.chamber, SWFX.slap],
    p: { ...POLY, ...BLIP(66, 22, 5), ...DRIFT(10, 6),
         osc1_wave: 0, osc1_vol: 48, osc2_wave: 3, osc2_vol: 74, osc2_fm: 10,
         detune: 16, filter_type: 3, cutoff: 78, resonance: 16, keyfollow: 58,
         filter_env: 44, fenv_d: 34, fenv_s: 18, fenv_r: 30,
         aenv_a: 0, aenv_d: 58, aenv_s: 34, aenv_r: 40 } },

  { cat: "KB", prefix: "SW", name: "Bell Keys", fx: [SWFX.chorus, SWFX.cavern, SWFX.triplet],
    p: { ...POLY, ...BLIP(72, 18, 5),
         osc1_wave: 0, osc1_vol: 40, osc2_wave: 3, osc2_vol: 78, osc2_tune: st(12),
         osc2_fm: 12, ringmod: 20, detune: 12, filter_type: 3, cutoff: 88,
         resonance: 12, keyfollow: 64, filter_env: 36, fenv_d: 30,
         aenv_a: 0, aenv_d: 52, aenv_s: 22, aenv_r: 46 } },

  { cat: "KB", prefix: "SW", name: "Bright EP", fx: [SWFX.chorusWide, SWFX.plate, SWFX.eighth],
    p: { ...POLY, ...PWM(36, 22), ...DRIFT(10, 6),
         osc1_wave: 1, osc1_pw: 48, osc2_wave: 0, osc2_vol: 62, detune: 26,
         filter_type: 2, cutoff: 74, resonance: 22, keyfollow: 56,
         filter_env: 48, fenv_d: 38, fenv_s: 24, fenv_r: 32,
         aenv_a: 0, aenv_d: 56, aenv_s: 46, aenv_r: 38 } },

  { cat: "KB", prefix: "SW", name: "Clav", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...POLY, ...BLIP(84, 12),
         osc1_wave: 1, osc1_pw: 24, osc2_wave: 1, osc2_vol: 56, osc2_tune: st(12),
         detune: 14, filter_type: 5, cutoff: 72, resonance: 52, keyfollow: 56,
         filter_env: 66, filter_drive: 34, fenv_d: 18, fenv_s: 0, fenv_r: 16,
         aenv_a: 0, aenv_d: 34, aenv_s: 20, aenv_r: 20 } },

  { cat: "KB", prefix: "SW", name: "Organ", fx: [SWFX.chorusDeep, SWFX.chamber, SWFX.slap],
    p: { ...POLY, ...VIB(22, 40), ...DRIFT(8, 7),
         osc1_wave: 1, osc1_pw: 50, osc2_wave: 1, osc2_vol: 70, osc2_tune: st(12),
         osc3_vol: 40, detune: 10, filter_type: 3, cutoff: 80, resonance: 14,
         keyfollow: 52, filter_env: 20, fenv_d: 30, fenv_s: 60,
         aenv_a: 1, aenv_d: 30, aenv_s: 92, aenv_r: 12 } },

  { cat: "KB", prefix: "SW", name: "Glass Keys", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...BLIP(58, 26, 5), ...DRIFT(12, 5),
         osc1_wave: 0, osc1_vol: 44, osc2_wave: 3, osc2_vol: 72, osc2_tune: st(19),
         osc2_fm: 8, detune: 18, filter_type: 3, cutoff: 90, resonance: 12,
         keyfollow: 66, filter_env: 30, fenv_d: 32,
         aenv_a: 0, aenv_d: 54, aenv_s: 30, aenv_r: 44 } },

  { cat: "KB", prefix: "SW", name: "Pluck Keys", fx: [SWFX.chorus, SWFX.snap, SWFX.eighth],
    p: { ...POLY, ...BLIP(78, 16),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 58, detune: 30,
         filter_type: 2, cutoff: 68, resonance: 42, keyfollow: 54,
         filter_env: 70, filter_drive: 26, fenv_d: 20, fenv_s: 4, fenv_r: 18,
         aenv_a: 0, aenv_d: 40, aenv_s: 18, aenv_r: 26 } },

  { cat: "KB", prefix: "SW", name: "Toy Piano", fx: [SWFX.chorus, SWFX.snap, SWFX.tick],
    p: { ...POLY, ...BLIP(80, 12, 5),
         osc1_wave: 0, osc1_vol: 42, osc2_wave: 3, osc2_vol: 70, osc2_tune: st(12),
         osc2_fm: 11, bitcrush: 56, detune: 14, filter_type: 3, cutoff: 84,
         resonance: 18, keyfollow: 62, filter_env: 42, fenv_d: 22,
         aenv_a: 0, aenv_d: 38, aenv_s: 14, aenv_r: 28 } },

  { cat: "KB", prefix: "SW", name: "Vintage EP", fx: [SWFX.chorusWide, SWFX.plate, SWFX.tape],
    p: { ...POLY, ...DRIFT(18, 4), ...BLIP(54, 28, 5),
         osc1_wave: 0, osc1_vol: 50, osc2_wave: 3, osc2_vol: 66, osc2_fm: 8,
         vintage: 42, detune: 22, filter_type: 1, cutoff: 62, resonance: 18,
         keyfollow: 50, filter_env: 44, fenv_d: 36, fenv_s: 20,
         aenv_a: 0, aenv_d: 60, aenv_s: 38, aenv_r: 42 } },

  { cat: "KB", prefix: "SW", name: "Reso Keys", fx: [SWFX.chorusDeep, SWFX.chamber, SWFX.dotted],
    p: { ...POLY, ...WOBBLE(32, 28), ...DRIFT(10, 6),
         osc1_wave: 1, osc1_pw: 38, osc2_wave: 0, osc2_vol: 60, detune: 24,
         filter_type: 5, cutoff: 70, resonance: 50, keyfollow: 54,
         filter_env: 56, filter_drive: 30, fenv_d: 30, fenv_s: 22, fenv_r: 28,
         aenv_a: 0, aenv_d: 52, aenv_s: 44, aenv_r: 34 } },

  /* ======================= ARP — arps / sequences ===================== */
  /* Short, bright, and rhythmically modulated -- these are the ones that
   * should sound obviously alive when a step sequence runs into them. */

  { cat: "ARP", prefix: "SW", name: "Acid Run", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...MONO, ...BLIP(88, 14),
         osc1_wave: 0, osc2_vol: 0, filter_type: 10, cutoff: 52, resonance: 76,
         keyfollow: 58, filter_env: 84, filter_drive: 44,
         fenv_d: 20, fenv_s: 0, fenv_r: 16, aenv_d: 30, aenv_s: 40, aenv_r: 16,
         portamento: 10, porta_mode: 1 } },

  { cat: "ARP", prefix: "SW", name: "Bright Steps", fx: [SWFX.chorus, SWFX.snap, SWFX.sixteenth],
    p: { ...POLY, ...BLIP(76, 14),
         osc1_wave: 1, osc1_pw: 36, osc2_wave: 0, osc2_vol: 58, detune: 24,
         filter_type: 3, cutoff: 80, resonance: 34, keyfollow: 60,
         filter_env: 62, filter_drive: 28, fenv_d: 18, fenv_s: 0, fenv_r: 14,
         aenv_a: 0, aenv_d: 30, aenv_s: 16, aenv_r: 18 } },

  { cat: "ARP", prefix: "SW", name: "PWM Seq", fx: [SWFX.chorusWide, SWFX.room, SWFX.eighth],
    p: { ...POLY, ...PWM(58, 40), ...BLIP(60, 16),
         osc1_wave: 1, osc1_pw: 46, osc2_wave: 1, osc2_vol: 62, osc2_tune: st(-12),
         detune: 22, filter_type: 2, cutoff: 70, resonance: 30, keyfollow: 54,
         filter_env: 58, fenv_d: 20, fenv_s: 6, fenv_r: 16,
         aenv_a: 0, aenv_d: 32, aenv_s: 24, aenv_r: 18 } },

  { cat: "ARP", prefix: "SW", name: "S+H Grid", fx: [SWFX.snap, SWFX.triplet],
    p: { ...POLY, ...SH(52, 62), ...BLIP(58, 14),
         osc1_wave: 1, osc1_pw: 32, osc2_wave: 0, osc2_vol: 54, detune: 20,
         filter_type: 5, cutoff: 64, resonance: 54, keyfollow: 52,
         filter_env: 54, filter_drive: 32, fenv_d: 18, fenv_s: 0,
         aenv_a: 0, aenv_d: 28, aenv_s: 14, aenv_r: 16 } },

  { cat: "ARP", prefix: "SW", name: "FM Steps", fx: [SWFX.chorus, SWFX.chamber, SWFX.sixteenth],
    p: { ...POLY, ...BLIP(70, 16, 5),
         osc1_wave: 0, osc1_vol: 44, osc2_wave: 3, osc2_vol: 70, osc2_tune: st(12),
         osc2_fm: 12, detune: 14, filter_type: 3, cutoff: 84, resonance: 20,
         keyfollow: 62, filter_env: 48, fenv_d: 20, fenv_s: 4,
         aenv_a: 0, aenv_d: 30, aenv_s: 16, aenv_r: 20 } },

  { cat: "ARP", prefix: "SW", name: "Octave Run", fx: [SWFX.chorusWide, SWFX.plate, SWFX.eighth],
    p: { ...POLY, ...PWM(40, 36), ...DRIFT(10, 7),
         osc1_wave: 1, osc1_pw: 44, osc2_wave: 1, osc2_vol: 66, osc2_tune: st(12),
         detune: 18, filter_type: 2, cutoff: 76, resonance: 28, keyfollow: 58,
         filter_env: 54, fenv_d: 22, fenv_s: 8, fenv_r: 18,
         aenv_a: 0, aenv_d: 34, aenv_s: 22, aenv_r: 20 } },

  { cat: "ARP", prefix: "SW", name: "Sync Grid", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...MONO, ...BLIP(82, 16, 3),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 70, osc2_tune: st(7), osc_sync: 1,
         detune: 10, filter_type: 3, cutoff: 78, resonance: 36, keyfollow: 58,
         filter_env: 64, filter_drive: 36, fenv_d: 18, fenv_s: 0,
         aenv_a: 0, aenv_d: 28, aenv_s: 18, aenv_r: 16 } },

  { cat: "ARP", prefix: "SW", name: "Glass Grid", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.triplet],
    p: { ...POLY, ...BLIP(62, 18, 5), ...DRIFT(10, 6),
         osc1_wave: 0, osc1_vol: 40, osc2_wave: 3, osc2_vol: 74, osc2_tune: st(19),
         osc2_fm: 8, detune: 16, filter_type: 3, cutoff: 90, resonance: 14,
         keyfollow: 66, filter_env: 38, fenv_d: 20,
         aenv_a: 0, aenv_d: 32, aenv_s: 12, aenv_r: 26 } },

  { cat: "ARP", prefix: "SW", name: "Ring Steps", fx: [SWFX.chorus, SWFX.snap, SWFX.triplet],
    p: { ...POLY, ...WOBBLE(40, 46, 3), ...BLIP(58, 14),
         osc1_wave: 1, osc1_pw: 34, osc2_wave: 1, osc2_vol: 62, osc2_tune: st(7),
         ringmod: 24, detune: 16, filter_type: 5, cutoff: 68, resonance: 44,
         keyfollow: 54, filter_env: 56, filter_drive: 30, fenv_d: 18, fenv_s: 2,
         aenv_a: 0, aenv_d: 30, aenv_s: 18, aenv_r: 18 } },

  { cat: "ARP", prefix: "SW", name: "Crush Run", fx: [SWFX.snap, SWFX.sixteenth],
    p: { ...POLY, ...SH(44, 58), ...BLIP(66, 14),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 56, bitcrush: 48, detune: 22,
         filter_type: 2, cutoff: 72, resonance: 40, keyfollow: 56,
         filter_env: 58, filter_drive: 34, fenv_d: 18, fenv_s: 2,
         aenv_a: 0, aenv_d: 30, aenv_s: 16, aenv_r: 18 } },

  /* ======================= FX — atmospheres / hits ==================== */

  { cat: "FX", prefix: "SW", name: "Riser", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...WOBBLE(30, 14), ...DRIFT(30, 3),
         osc1_wave: 2, osc1_vol: 62, osc2_wave: 0, osc2_vol: 48, detune: 56,
         filter_type: 2, cutoff: 40, resonance: 46, keyfollow: 20,
         filter_env: 88, fenv_a: 72, fenv_d: 70, fenv_s: 90, fenv_r: 50,
         aenv_a: 40, aenv_s: 88, aenv_r: 50 } },

  { cat: "FX", prefix: "SW", name: "Downlift", fx: [SWFX.chorusDeep, SWFX.murk, SWFX.tape],
    p: { ...POLY, ...WOBBLE(36, 10), ...DRIFT(26, 4),
         osc1_wave: 0, osc2_wave: 2, osc2_vol: 60, osc2_tune: st(-12),
         vintage: 48, detune: 46, filter_type: 1, cutoff: 60, resonance: 40,
         keyfollow: 18, filter_env: 20, fenv_a: 0, fenv_d: 88, fenv_s: 0,
         fenv_r: 70, aenv_a: 6, aenv_s: 82, aenv_r: 66 } },

  { cat: "FX", prefix: "SW", name: "Ring Sweep", fx: [SWFX.chorusWide, SWFX.cathedral, SWFX.wide],
    p: { ...POLY, ...WOBBLE(52, 18), ...DRIFT(22, 5),
         osc1_wave: 1, osc1_pw: 30, osc2_wave: 1, osc2_vol: 70, osc2_tune: st(7),
         ringmod: 26, detune: 34, filter_type: 5, cutoff: 58, resonance: 52,
         keyfollow: 30, filter_env: 60, fenv_a: 30, fenv_d: 70, fenv_s: 50,
         aenv_a: 26, aenv_s: 86, aenv_r: 60 } },

  { cat: "FX", prefix: "SW", name: "Noise Wash", fx: [SWFX.chorusWide, SWFX.cavern, SWFX.wide],
    p: { ...POLY, ...SH(44, 20), ...DRIFT(24, 3),
         osc1_wave: 2, osc1_vol: 72, osc2_vol: 0, detune: 40,
         filter_type: 5, cutoff: 54, resonance: 56, keyfollow: 16,
         filter_env: 46, fenv_a: 44, fenv_d: 70, fenv_s: 46,
         aenv_a: 50, aenv_s: 84, aenv_r: 70 } },

  { cat: "FX", prefix: "SW", name: "Sync Zap", fx: [SWFX.snap, SWFX.triplet],
    p: { ...MONO, ...BLIP(92, 10, 3),
         osc1_wave: 0, osc2_wave: 0, osc2_vol: 74, osc2_tune: st(7), osc_sync: 1,
         detune: 12, filter_type: 3, cutoff: 76, resonance: 44, keyfollow: 40,
         filter_env: 86, filter_drive: 42, fenv_d: 14, fenv_s: 0, fenv_r: 12,
         aenv_a: 0, aenv_d: 24, aenv_s: 0, aenv_r: 18 } },

  { cat: "FX", prefix: "SW", name: "Drone", fx: [SWFX.chorusDeep, SWFX.cathedral, SWFX.wide],
    p: { ...POLY, ...DRIFT(32, 2), ...PWM(48, 5),
         osc1_wave: 1, osc1_pw: 54, osc2_wave: 1, osc2_vol: 68, osc2_tune: st(-12),
         osc3_vol: 40, vintage: 36, detune: 50, filter_type: 1, cutoff: 50,
         resonance: 30, keyfollow: 24, filter_env: 30,
         fenv_a: 40, fenv_d: 70, fenv_s: 50, aenv_a: 60, aenv_s: 88, aenv_r: 78 } },
];
