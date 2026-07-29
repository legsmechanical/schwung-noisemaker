/* Shared scaffolding for the authored preset bank (tools/gen_presets.mjs).
 *
 * Everything here speaks the wrapper's DISPLAY units — the same units
 * get_param/set_param exchange and build_state serializes:
 *   continuous  0..100        (K_PCT)
 *   bipolar     0..100, 50=centre  (K_BIPOLAR)
 *   toggle      0 / 1
 *   enum        option index
 *   tune2       0..255        (native 8-bit macro wire)
 */

/* Spline-free AND completely dry factory patch (verified against the corpus).
 * Every authored preset names it as its base so `restore_state` -> `load_preset`
 * installs a known-flat Envelope Editor shape; without a base index a preset
 * inherits whatever spline the previously-loaded patch left behind. */
export const BASE_PRESET = 0;

/* osc2_tune / osc1_tune are bipolar 0..100 spanning +/-24 semitones, and the
 * engine TRUNCATES toward zero (`(int)(v*48 - 24)`). Aiming at the exact
 * boundary is a coin-flip on float error, so bias half a step away from it. */
export function st(semis) {
  const x = semis + 24 + (semis < 0 ? -0.5 : 0.5);
  return Math.max(0, Math.min(100, Math.round((x / 48) * 100)));
}

/* Full default state. Anything a preset does not override lands here, so the
 * defaults must be SAFE — most importantly bitcrush:100, which is OFF
 * (setOscBitcrusher treats 1.0 as disabled; 0 would be bit depth 1). */
export const DEFAULTS = {
  preset: BASE_PRESET, octave_transpose: 0,

  /* macros: wave OFF so the preset's own osc section stands and the knob is
   * free to take over; env times at the x1 detent so authored A/D/R are real */
  wave: 0, tune2: 0, fenv_time: 50, aenv_time: 50,

  volume: 35, highpass: 0,

  osc1_wave: 0, osc2_wave: 0,
  osc1_vol: 75, osc2_vol: 0, osc3_vol: 0,
  osc_tune: 50, osc1_tune: st(0), osc2_tune: st(0),
  osc1_fine: 50, osc2_fine: 50,
  osc1_pw: 50, osc1_phase: 0, osc2_phase: 0,
  osc2_fm: 0, osc_sync: 0, ringmod: 0, detune: 20,
  bitcrush: 100,          /* 100 == OFF. Never omit this. */
  vintage: 0,

  filter_type: 0, cutoff: 45, resonance: 15, keyfollow: 25,
  filter_env: 40, filter_drive: 0,

  fenv_a: 0, fenv_d: 40, fenv_s: 20, fenv_r: 35,
  aenv_a: 0, aenv_d: 45, aenv_s: 80, aenv_r: 35,

  lfo1_wave: 0, lfo1_rate: 30, lfo1_amount: 0, lfo1_dest: 0,
  lfo1_sync: 0, lfo1_keytrig: 0, lfo1_phase: 0,
  lfo2_wave: 0, lfo2_rate: 30, lfo2_amount: 0, lfo2_dest: 0,
  lfo2_sync: 0, lfo2_keytrig: 0, lfo2_phase: 0,

  free_a: 0, free_d: 30, free_amt: 50, free_dest: 0,

  vel_vol: 20, vel_env: 0, vel_cut: 0, pw_cutoff: 0, pw_pitch: 20,
  portamento: 0, porta_mode: 0, voices: 6,

  chorus1: 0, chorus2: 0,
  reverb_wet: 0, reverb_decay: 45, reverb_pre: 10, reverb_hi: 70, reverb_lo: 10,
  delay_wet: 0, delay_time: 35, delay_sync: 0, delay_fac_l: 0, delay_fac_r: 0,
  delay_fb: 40, delay_hi: 60, delay_lo: 20,

  env_amt: 0, env_speed: 0, env_dest: 0,
};

/* ---- FX flavours -------------------------------------------------------
 * The brief is "nothing dry", and every wet stage in this engine ADDS gain
 * with no output limiter downstream — so these stay conservative and the
 * generator's auto-gain pass trims master volume afterwards by measurement. */

export const FX = {
  /* Juno-ish stereo shimmer. Chorus II is the wider/wobblier one. */
  chorus:      { chorus1: 1 },
  chorusWide:  { chorus1: 1, chorus2: 1 },
  chorusDeep:  { chorus2: 1 },

  /* Reverbs. reverb_hi is a HIGH CUT (lower = darker tail). */
  room:        { reverb_wet: 22, reverb_decay: 30, reverb_pre: 6,  reverb_hi: 62, reverb_lo: 14 },
  plate:       { reverb_wet: 34, reverb_decay: 52, reverb_pre: 10, reverb_hi: 72, reverb_lo: 12 },
  hall:        { reverb_wet: 42, reverb_decay: 72, reverb_pre: 16, reverb_hi: 58, reverb_lo: 18 },
  cathedral:   { reverb_wet: 52, reverb_decay: 88, reverb_pre: 22, reverb_hi: 50, reverb_lo: 22 },
  /* Short + bright: the 80s gated-snare treatment, for stabs and drums. */
  gated:       { reverb_wet: 46, reverb_decay: 18, reverb_pre: 4,  reverb_hi: 84, reverb_lo: 28 },
  /* Dark smear for darkwave pads — heavy high cut, long tail. */
  murk:        { reverb_wet: 48, reverb_decay: 80, reverb_pre: 14, reverb_hi: 34, reverb_lo: 26 },

  /* Delays. Sync'd for anything rhythmic; free-time for pads and drones.
   * delay_fb is the LOOP GAIN x100 (see K_FBGAIN in the wrapper): at 100 the
   * delay line stops decaying on its own, so everything here stays well under
   * it. The repeat counts in the comments are upper bounds to -60 dB — the
   * high cut sits inside the loop and shortens them further.
   * These were authored against the OLD raw-knob wire, where 34-52 read as
   * "moderate" but was really gain 0.97-1.00 — i.e. tails of hundreds of
   * repeats, and `tape` was over unity and never decayed at all. */
  slap:        { delay_wet: 20, delay_time: 14, delay_fb: 25, delay_sync: 0, delay_hi: 52, delay_lo: 26 }, // ~5
  eighth:      { delay_wet: 30, delay_time: 25, delay_fb: 42, delay_sync: 1, delay_hi: 54, delay_lo: 24 }, // ~7
  dotted:      { delay_wet: 34, delay_time: 38, delay_fb: 48, delay_sync: 1, delay_hi: 50, delay_lo: 26 }, // ~8
  quarter:     { delay_wet: 32, delay_time: 50, delay_fb: 45, delay_sync: 1, delay_hi: 46, delay_lo: 28 }, // ~9
  /* Ping-pong: the 2x factors offset the two channels. */
  pingpong:    { delay_wet: 34, delay_time: 25, delay_fb: 45, delay_sync: 1, delay_fac_l: 1, delay_hi: 52, delay_lo: 24 }, // ~9
  /* Long, dark, degraded — dub/industrial. delay_fac_l offsets the left
   * channel so the repeats spread: stereo width in this engine comes from
   * chorus or an L/R delay offset, and a centred delay plus a short reverb
   * measures as literally mono. */
  tape:        { delay_wet: 36, delay_time: 44, delay_fb: 62, delay_sync: 0, delay_fac_l: 1, delay_hi: 34, delay_lo: 30 }, // ~14
};

/* Merge a preset spec down to a full state dict. */
export function build(spec) {
  const s = { ...DEFAULTS };
  for (const layer of spec.fx || []) Object.assign(s, layer);
  Object.assign(s, spec.p || {});
  return s;
}

export function wrap(name, state) {
  return { name, module: "noisemaker", version: 1, state };
}

/* Expand one spec into its emitted presets.
 *
 * A spec with no `vars` emits a single "<CAT> <Name> JG". A spec WITH `vars`
 * emits one numbered preset per variant instead — "<CAT> <Name> 1 JG",
 * "2 JG", ... — each variant layering its own overrides on top of the base
 * spec. That is for patches where I am guessing at the taste call and want
 * Josh choosing between real alternatives rather than accepting my first one.
 *
 * Variants inherit the spec's fx layers unless they supply their own `fx`.
 *
 * How a second bank coexists with the first in the same preset store:
 *   `spec.prefix` puts a bank tag FIRST  -> "SW BS Nightdrive"  (sorts together)
 *   `spec.tag`    replaces the trailing "JG"
 * A prefix means the category is no longer the first token, and both
 * autogain_presets.mjs and verify_presets.mjs pick the render plan from the
 * name — see `catOf()` in each. Adding a new prefix without teaching them
 * about it silently auditions every bass with the generic lead plan. */
export const BANK_TAGS = ["SW"];

/* The category token, skipping any leading bank tag. Mirrored in the two
 * preset tools; keep them in step. */
export function catOf(name) {
  const t = String(name).split(" ");
  return BANK_TAGS.includes(t[0]) ? t[1] : t[0];
}

export function expand(spec) {
  const out = [];
  const prefix = spec.prefix ? `${spec.prefix} ` : "";
  const tag = spec.tag !== undefined ? spec.tag : (spec.prefix ? "" : "JG");
  const suffix = tag ? ` ${tag}` : "";
  const mk = (name, extraFx, extraP) => {
    const s = { ...DEFAULTS };
    for (const layer of (extraFx || spec.fx || [])) Object.assign(s, layer);
    Object.assign(s, spec.p || {}, extraP || {});
    out.push(wrap(name, s));
  };
  if (!spec.vars || !spec.vars.length) {
    mk(`${prefix}${spec.cat} ${spec.name}${suffix}`);
  } else {
    spec.vars.forEach((v, i) => {
      mk(`${prefix}${spec.cat} ${spec.name} ${i + 1}${suffix}`, v.fx, v.p);
    });
  }
  return out;
}
