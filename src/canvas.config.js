/* Noisemaker canvas config for schwung-canvaskit (../schwung-canvaskit).
 * SOURCE for src/canvas.js — regenerate after editing:
 *   node ../schwung-canvaskit/build.mjs src/canvas.config.js src/canvas.js
 *
 * Grouping mirrors the TAL NoiseMaker desktop panels (LFO1/LFO2/OSC1/OSC2/
 * MASTER, FILTER + AMP with their ADSR sliders, and the Chorus/Crush/Reverb/
 * Delay effect strip). Uses the kit's visual models where the synth does:
 * wavesel (osc + LFO waveform shape boxes), filterViz (filter-response curve).
 *
 * Wire contract (src/dsp/noisemaker_plugin.cpp): all params are native ints —
 * continuous 0..100 (K_PCT / K_BIPOLAR centered at 50), enums exchange the
 * OPTION INDEX both ways. No per-cell codecs needed. */

KIT_PARAM_MAX = 100;

/* enum labels — order MUST match the wrapper's PARAMS[] option order. */
const FILT     = ["LP24","LP18","LP12","LP6","HP24","BP24","Notch","SV-LP","SV-HP","SV-BP","Moog","Moog2"];
const FILT_SQ  = ["L24","L18","L12","L6","H24","B24","Ntc","SVL","SVH","SVB","Mog","Mg2"];
/* filterViz curve shape per filter type. */
const FILT_MODES = ["lp","lp","lp","lp","hp","bp","notch","lp","hp","bp","lp","lp"];
const LDST1    = ["None","Filter","Osc1","Osc2","PW","FM","LFO2","Osc1+2"];
const LDST1_SQ = ["Non","Flt","Os1","Os2","PW","FM","LF2","O12"];
const LDST2    = ["None","Filter","Osc1","Osc2","PW","FM","LFO1","Osc1+2"];
const LDST2_SQ = ["Non","Flt","Os1","Os2","PW","FM","LF1","O12"];
const FDST     = ["Off","Filter","Osc1","Osc2","PW","FM"];
const FDST_SQ  = ["Off","Flt","Os1","Os2","PW","FM"];
const PMODE    = ["Off","Auto","On"];
const OSC1_WAVES = ["Saw","Pulse","Noise"];
const OSC1_SHAPES = ["saw","square","swishy"];
const OSC2_WAVES = ["Saw","Pulse","Tri","Sine","Noise"];
const OSC2_SHAPES = ["saw","square","tri","sine","swishy"];
const LFO_WAVES  = ["Sin","Tri","Saw","Sqr","S+H","Rnd"];
const LFO_SHAPES = ["sine","tri","saw","square","sh","swishy"];
/* Envelope Editor (spline mod source) — order MUST match PARAMS[] option order. */
const ENVDST    = ["Off","Filter","Osc1","Osc2","Osc1+2","FM","RingMod","Volume"];
const ENVDST_SQ = ["Off","Flt","Os1","Os2","O12","FM","Rng","Vol"];
const ENVSPD    = ["x1","x2","x4","x8","x16","x32"];

const CONFIG = {
  name: "Noisemaker",

  banks: [
    /* ---- OSC 1 ---- */
    { label: "Osc 1", knobs: [
        wavesel("osc1_wave", "Wave", OSC1_WAVES, OSC1_SHAPES),
        bip("osc1_tune", "Tune"), bip("osc1_fine", "Fine"),
        uni("osc1_phase", "Phse"), uni("osc1_pw", "PW"), uni("osc1_vol", "Lvl")] },

    /* ---- OSC 2 ---- */
    { label: "Osc 2", knobs: [
        wavesel("osc2_wave", "Wave", OSC2_WAVES, OSC2_SHAPES),
        bip("osc2_tune", "Tune"), bip("osc2_fine", "Fine"),
        uni("osc2_phase", "Phse"), uni("osc2_fm", "FM"), uni("osc2_vol", "Lvl")] },

    /* ---- MASTER ---- */
    { label: "Master", knobs: [
        uni("osc3_vol", "Sub"), uni("volume", "Vol"), uni("highpass", "HP"),
        uni("vintage", "Nois"), uni("detune", "Detn"), uni("ringmod", "Ring"),
        tog("osc_sync", "Sync"), bip("osc_tune", "MTun")] },

    /* ---- FILTER (+ response curve) ---- */
    { label: "Filter", knobs: [
        enumc("filter_type", "Type", FILT, FILT_SQ),
        uni("cutoff", "Cut"), uni("resonance", "Res"), uni("keyfollow", "Key"),
        uni("filter_env", "Cont"), uni("filter_drive", "Driv"), blank(), blank()],
      filterViz: { cell: 6, cutoffKey: "cutoff", resoKey: "resonance",
                   mode: { key: "filter_type", modes: FILT_MODES } } },

    /* ---- Filter Env ---- */
    { label: "Filter Env", env: true, knobs: [
        fader("fenv_a", "A"), fader("fenv_d", "D"), fader("fenv_s", "S"), fader("fenv_r", "R")] },

    /* ---- Amp Env (+ Free/Env3, as TAL groups them) ---- */
    { label: "Amp Env", env: true, knobs: [
        fader("aenv_a", "A"), fader("aenv_d", "D"), fader("aenv_s", "S"), fader("aenv_r", "R"),
        uni("free_a", "E3A"), uni("free_d", "E3D"), bip("free_amt", "E3Amt"),
        enumc("free_dest", "E3Ds", FDST, FDST_SQ)] },

    /* ---- LFO 1 ---- */
    { label: "LFO 1", knobs: [
        wavesel("lfo1_wave", "Wave", LFO_WAVES, LFO_SHAPES),
        uni("lfo1_rate", "Rate"), uni("lfo1_amount", "Amt"), uni("lfo1_phase", "Phse"),
        enumc("lfo1_dest", "Dest", LDST1, LDST1_SQ),
        tog("lfo1_sync", "Sync"), tog("lfo1_keytrig", "Trig")] },

    /* ---- LFO 2 ---- */
    { label: "LFO 2", knobs: [
        wavesel("lfo2_wave", "Wave", LFO_WAVES, LFO_SHAPES),
        uni("lfo2_rate", "Rate"), uni("lfo2_amount", "Amt"), uni("lfo2_phase", "Phse"),
        enumc("lfo2_dest", "Dest", LDST2, LDST2_SQ),
        tog("lfo2_sync", "Sync"), tog("lfo2_keytrig", "Trig")] },

    /* ---- Voicing / Velocity / Wheel ---- */
    { label: "Voice / Vel", knobs: [
        count("voices", "Vcs", 1, 6), uni("portamento", "Port"),
        enumc("porta_mode", "PMde", PMODE),
        uni("vel_vol", "VVol"), uni("vel_env", "VEnv"), uni("vel_cut", "VCut"),
        uni("pw_cutoff", "WCut"), uni("pw_pitch", "Bend")] },

    /* ---- Chorus / Crush / Reverb ---- */
    { label: "Chorus / Reverb", knobs: [
        tog("chorus1", "Ch1"), tog("chorus2", "Ch2"), uni("bitcrush", "Crsh"),
        uni("reverb_wet", "RWet"), uni("reverb_decay", "RSiz"), uni("reverb_pre", "RPre"),
        uni("reverb_hi", "RHi"), uni("reverb_lo", "RLo")] },

    /* ---- Delay ---- */
    { label: "Delay", knobs: [
        uni("delay_wet", "Wet"), uni("delay_time", "Time"), uni("delay_fb", "Fbk"),
        tog("delay_sync", "Sync"), tog("delay_fac_l", "2xL"), tog("delay_fac_r", "2xR"),
        uni("delay_hi", "HiCt"), uni("delay_lo", "LoCt")] },

    /* ---- Env Draw (spline mod source; shape fixed per preset) ---- */
    { label: "Env Draw", knobs: [
        enumc("env_dest", "Dest", ENVDST, ENVDST_SQ),
        uni("env_amt", "Amt"), enumc("env_speed", "Spd", ENVSPD),
        blank(), blank(), blank(), blank(), blank()] },
  ],

  sections: [
    { name: "OSC 1", bank: 0 }, { name: "OSC 2", bank: 1 }, { name: "MASTER", bank: 2 },
    { name: "FILTER", bank: 3 }, { name: "FILT ENV", bank: 4 }, { name: "AMP ENV", bank: 5 },
    { name: "LFO 1", bank: 6 }, { name: "LFO 2", bank: 7 }, { name: "VOICE", bank: 8 },
    { name: "REVERB", bank: 9 }, { name: "DELAY", bank: 10 }, { name: "ENV DRAW", bank: 11 },
  ],

  icons: ["sawpulse","sawpulse","global","lp","envf","enva","sine","sine","bend","pan","routes","envf"],

  /* Off-device defaults only (previewer/tests); on device every read is live. */
  defaults: {
    osc1_wave: 0, osc1_tune: 50, osc1_fine: 50, osc1_phase: 0, osc1_pw: 50, osc1_vol: 80,
    osc2_wave: 0, osc2_tune: 50, osc2_fine: 50, osc2_phase: 0, osc2_fm: 0, osc2_vol: 0,
    osc3_vol: 0, volume: 50, highpass: 0, vintage: 0, detune: 20, ringmod: 0, osc_sync: 0, osc_tune: 50,
    filter_type: 0, cutoff: 60, resonance: 12, keyfollow: 30, filter_env: 35, filter_drive: 0,
    fenv_a: 0, fenv_d: 45, fenv_s: 30, fenv_r: 30,
    aenv_a: 0, aenv_d: 50, aenv_s: 85, aenv_r: 28, free_a: 0, free_d: 0, free_amt: 50, free_dest: 0,
    lfo1_wave: 0, lfo1_rate: 30, lfo1_amount: 0, lfo1_phase: 0, lfo1_dest: 0, lfo1_sync: 0, lfo1_keytrig: 0,
    lfo2_wave: 0, lfo2_rate: 30, lfo2_amount: 0, lfo2_phase: 0, lfo2_dest: 0, lfo2_sync: 0, lfo2_keytrig: 0,
    voices: 6, portamento: 0, porta_mode: 0, vel_vol: 0, vel_env: 0, vel_cut: 0, pw_cutoff: 0, pw_pitch: 20,
    chorus1: 0, chorus2: 0, bitcrush: 0, reverb_wet: 0, reverb_decay: 0, reverb_pre: 0, reverb_hi: 100, reverb_lo: 0,
    delay_wet: 0, delay_time: 30, delay_fb: 0, delay_sync: 0, delay_fac_l: 0, delay_fac_r: 0, delay_hi: 100, delay_lo: 0,
    env_dest: 0, env_amt: 0, env_speed: 0,
  },

  testExports: { FILT, LDST1, LDST2, FDST, PMODE },
};
