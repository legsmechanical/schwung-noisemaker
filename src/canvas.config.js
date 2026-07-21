/* Noisemaker canvas config for schwung-canvaskit (../schwung-canvaskit).
 * SOURCE for src/canvas.js — regenerate after editing:
 *   node ../schwung-canvaskit/build.mjs src/canvas.config.js src/canvas.js
 * Concatenated between the kit prelude (cell constructors in scope) and the
 * kit engine (reads CONFIG) inside one IIFE.
 *
 * Wire contract (src/dsp/noisemaker_plugin.cpp): every param is a native int.
 * Continuous 0..100 (K_PCT / K_BIPOLAR — bipolar centered at 50, matching the
 * kit `bip` cell); enums exchange the OPTION INDEX on read AND write (the
 * wrapper's K_ENUM maps index<->engine value). So NO per-cell codecs are
 * needed — the kit's native-int cells drive the wrapper directly. */

KIT_PARAM_MAX = 100;

/* ---- enum label tables (order MUST match the wrapper's PARAMS[] enum_vals) ---- */
const FILT   = ["Off", "LP24", "LP18", "LP12", "LP6", "HP24", "BP24", "Notch"];
const FILT_SQ = ["Off", "L24", "L18", "L12", "L6", "H24", "B24", "Ntc"];
const LDST1  = ["None", "Filter", "Osc1", "Osc2", "PW", "FM", "LFO2"];
const LDST1_SQ = ["Non", "Flt", "Os1", "Os2", "PW", "FM", "LF2"];
const LDST2  = ["None", "Filter", "Osc1", "Osc2", "PW", "FM", "LFO1"];
const LDST2_SQ = ["Non", "Flt", "Os1", "Os2", "PW", "FM", "LF1"];
const FDST   = ["None", "Filter", "Osc1&2", "Osc2", "PW"];
const FDST_SQ = ["Non", "Flt", "O12", "Os2", "PW"];

const CONFIG = {
  name: "Noisemaker",

  /* Every editable param exactly once (kit contract). 32px label cells fit ~4
   * glyphs of the 6px-advance font, so labels stay <=4 chars. */
  banks: [
    { label: "Osc 1", knobs: [
        wavesel("osc1_wave", "Wave", ["Saw", "Pulse", "Noise"], ["saw", "square", "sh"]),
        uni("osc1_vol", "Lvl"), bip("osc1_tune", "Tune"), bip("osc1_fine", "Fine"),
        uni("osc1_pw", "PW"), uni("osc1_phase", "Phse"), tog("osc_sync", "Sync"),
        uni("detune", "Detn")] },

    { label: "Osc 2", knobs: [
        wavesel("osc2_wave", "Wave", ["Saw", "Pulse", "Tri", "Sine"], ["saw", "square", "tri", "sine"]),
        uni("osc2_vol", "Lvl"), bip("osc2_tune", "Tune"), bip("osc2_fine", "Fine"),
        uni("osc2_phase", "Phse"), uni("osc2_fm", "FM"), uni("osc3_vol", "Sub"),
        uni("ringmod", "Ring")] },

    { label: "Filter", knobs: [
        enumc("filter_type", "Type", FILT, FILT_SQ),
        uni("cutoff", "Cut"), uni("resonance", "Res"), uni("keyfollow", "Key"),
        uni("filter_env", "Env"), uni("highpass", "HP"), bip("osc_tune", "MTun"),
        uni("bitcrush", "Crsh")] },

    { label: "Filter Env", env: true, knobs: [
        fader("fenv_a", "A"), fader("fenv_d", "D"), fader("fenv_s", "S"), fader("fenv_r", "R")] },

    { label: "Amp Env", env: true, knobs: [
        fader("aenv_a", "A"), fader("aenv_d", "D"), fader("aenv_s", "S"), fader("aenv_r", "R"),
        uni("volume", "Vol"), count("voices", "Vcs", 1, 6), uni("portamento", "Port"),
        tog("porta_mode", "PMde")] },

    { label: "LFO 1", knobs: [
        uni("lfo1_wave", "Wave"), uni("lfo1_rate", "Rate"), uni("lfo1_amount", "Amt"),
        enumc("lfo1_dest", "Dest", LDST1, LDST1_SQ), tog("lfo1_sync", "Sync"),
        tog("lfo1_keytrig", "KTrg"), uni("lfo1_phase", "Phse")] },

    { label: "LFO 2", knobs: [
        uni("lfo2_wave", "Wave"), uni("lfo2_rate", "Rate"), uni("lfo2_amount", "Amt"),
        enumc("lfo2_dest", "Dest", LDST2, LDST2_SQ), tog("lfo2_sync", "Sync"),
        tog("lfo2_keytrig", "KTrg"), uni("lfo2_phase", "Phse")] },

    { label: "Env 3", knobs: [
        uni("free_a", "Atk"), uni("free_d", "Dec"), bip("free_amt", "Amt"),
        enumc("free_dest", "Dest", FDST, FDST_SQ)] },

    { label: "Vel / Wheel", knobs: [
        uni("vel_vol", "VVol"), uni("vel_env", "VEnv"), uni("vel_cut", "VCut"),
        uni("pw_cutoff", "WCut"), uni("pw_pitch", "Bend")] },

    { label: "Chorus / Reverb", knobs: [
        tog("chorus1", "Chr1"), tog("chorus2", "Chr2"), uni("reverb_wet", "Wet"),
        uni("reverb_decay", "Dec"), uni("reverb_pre", "Pre"), uni("reverb_hi", "HiCt"),
        uni("reverb_lo", "LoCt")] },
  ],

  /* SHIFT-picker rows — one per bank (each section owns its single bank). */
  sections: [
    { name: "OSC 1", bank: 0 },
    { name: "OSC 2", bank: 1 },
    { name: "FILTER", bank: 2 },
    { name: "FILTER ENV", bank: 3 },
    { name: "AMP ENV", bank: 4 },
    { name: "LFO 1", bank: 5 },
    { name: "LFO 2", bank: 6 },
    { name: "ENV 3", bank: 7 },
    { name: "VEL / WHEEL", bank: 8 },
    { name: "FX", bank: 9 },
  ],

  icons: ["sawpulse", "sawpulse", "lp", "envf", "enva", "sine", "sine", "env", "bend", "global"],

  /* Off-device defaults only (previewer/tests); on device every read is live.
   * Mirrors DEFAULT_PATCH display units; bipolar centers = 50. */
  defaults: {
    volume: 50, highpass: 0,
    osc1_wave: 0, osc1_vol: 80, osc1_tune: 50, osc1_fine: 50, osc1_pw: 50, osc1_phase: 0,
    osc_sync: 0, detune: 20,
    osc2_wave: 0, osc2_vol: 0, osc2_tune: 50, osc2_fine: 50, osc2_phase: 0, osc2_fm: 0,
    osc3_vol: 0, ringmod: 0,
    filter_type: 1, cutoff: 55, resonance: 12, keyfollow: 30, filter_env: 35,
    osc_tune: 50, bitcrush: 0,
    fenv_a: 0, fenv_d: 45, fenv_s: 30, fenv_r: 30,
    aenv_a: 0, aenv_d: 50, aenv_s: 85, aenv_r: 28, voices: 6, portamento: 0, porta_mode: 0,
    lfo1_wave: 0, lfo1_rate: 30, lfo1_amount: 0, lfo1_dest: 0, lfo1_sync: 0, lfo1_keytrig: 0, lfo1_phase: 0,
    lfo2_wave: 0, lfo2_rate: 30, lfo2_amount: 0, lfo2_dest: 0, lfo2_sync: 0, lfo2_keytrig: 0, lfo2_phase: 0,
    free_a: 0, free_d: 0, free_amt: 50, free_dest: 0,
    vel_vol: 0, vel_env: 0, vel_cut: 0, pw_cutoff: 0, pw_pitch: 20,
    chorus1: 0, chorus2: 0, reverb_wet: 0, reverb_decay: 0, reverb_pre: 0, reverb_hi: 100, reverb_lo: 0,
  },

  testExports: { FILT, LDST1, LDST2, FDST },
};
