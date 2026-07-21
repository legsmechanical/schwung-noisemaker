/*
 * Noisemaker — Schwung plugin_api_v2 wrapper around the TAL Noisemaker engine.
 *
 * Engine (src/dsp/Engine + src/dsp/Effects) = Patrick Kunz's TAL Noisemaker,
 * GPLv2, vendored byte-verbatim from the DISTRHO-Ports tal-noisemaker source
 * (the current TAL codebase: true 6-voice, Delay, Filter Drive, Vintage Noise,
 * Moog/State-Variable filters). This file is the thin host adapter.
 *
 * PARAM MODEL (differs from the older Nexbit port): the engine's setters take
 * NORMALIZED 0..1 for EVERYTHING — continuous params AND combo/enum params
 * (they convert internally via AudioUtils::calcComboBoxValue). So this wrapper
 * stores normalized values in inst->eng[] and passes them straight through in
 * apply_engine(); the only conversion is at the display boundary (disp<->norm),
 * where enums map a 0-based display index to the combo's normalized value.
 *
 * The drawable Envelope Editor mod source is deferred (JUCE-dependent); see
 * src/dsp/EnvelopeEditor/ stubs. Its params are accepted but inert.
 */

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <cmath>
#include <string>

#include "Engine/SynthEngine.h"   // header-only TAL engine (single translation unit)
#include "Engine/Params.h"        // SYNTHPARAMETERS enum + NUMPARAM
#include "factory_bank.h"         // NM_FACTORY_BANK[] (generated; normalized values)

/* ---- host / plugin ABI ---- */
#ifndef MOVE_SAMPLE_RATE
#define MOVE_SAMPLE_RATE 44100
#endif
#ifndef MOVE_FRAMES_PER_BLOCK
#define MOVE_FRAMES_PER_BLOCK 128
#endif

typedef struct host_api_v1 {
    uint32_t api_version;
    int sample_rate;
    int frames_per_block;
    uint8_t *mapped_memory;
    int audio_out_offset;
    int audio_in_offset;
    void (*log)(const char *msg);
    int (*midi_send_internal)(const uint8_t *msg, int len);
    int (*midi_send_external)(const uint8_t *msg, int len);
    int (*get_clock_status)(void);
    void *mod_emit_value;
    void *mod_clear_source;
    void *mod_host_ctx;
    float (*get_bpm)(void);
    int (*midi_inject_to_move)(const uint8_t *msg, int len);
    int (*slot_recv_channel)(void *instance);
} host_api_v1_t;

typedef struct plugin_api_v2 {
    uint32_t api_version;
    void* (*create_instance)(const char *module_dir, const char *json_defaults);
    void (*destroy_instance)(void *instance);
    void (*on_midi)(void *instance, const uint8_t *msg, int len, int source);
    void (*set_param)(void *instance, const char *key, const char *val);
    int (*get_param)(void *instance, const char *key, char *buf, int buf_len);
    int (*get_error)(void *instance, char *buf, int buf_len);
    void (*render_block)(void *instance, int16_t *out_interleaved_lr, int frames);
} plugin_api_v2_t;

#define MOVE_PLUGIN_API_VERSION_2 2

/* Native poly. The DISTRHO engine renders all MAX_VOICES=6 voices (the old
 * "phantom voice / notes drop at limit" bug is gone). setNumberOfVoices takes a
 * NORMALIZED value; 1.0 -> combo 6. */
#define NM_NUM_VOICES 6

static const host_api_v1_t *g_host = NULL;

/* ======================================================================== *
 *  Parameter surface
 * ======================================================================== */
enum ParamKind {
    K_PCT,      // norm 0..1   <-> display 0..100
    K_BIPOLAR,  // norm 0..1   <-> display 0..100 (50 center); UI shows +/-
    K_TOGGLE,   // norm 0/1    <-> display 0/1
    K_INT,      // combo count <-> display imin..imax (e.g. voices 1..6)
    K_ENUM      // combo       <-> display index 0..n_opts-1
};

#define MAX_ENUM_OPTS 12

typedef struct {
    const char *key;
    const char *name;
    int         engine_index;   // SYNTHPARAMETERS
    ParamKind   kind;
    int         imin, imax;     // K_INT range
    int         n_opts;         // K_ENUM combo-item count
    const char *opts[MAX_ENUM_OPTS];
} param_def_t;

/* Combo item counts must match AudioUtils::getNumComboBoxItems. */
static const char *FILT_OPTS[] = {"LP24","LP18","LP12","LP6","HP24","BP24","Notch",
                                  "SV-LP","SV-HP","SV-BP","Moog","Moog2"};      // 12
static const char *OSC1_OPTS[] = {"Saw","Pulse","Noise"};                       // 3
static const char *OSC2_OPTS[] = {"Saw","Pulse","Tri","Sine","Noise"};          // 5
static const char *LDST1_OPTS[] = {"None","Filter","Osc1","Osc2","PW","FM","LFO2","Osc1+2"}; // 8
static const char *LDST2_OPTS[] = {"None","Filter","Osc1","Osc2","PW","FM","LFO1","Osc1+2"}; // 8
static const char *FDST_OPTS[] = {"Off","Filter","Osc1","Osc2","PW","FM"};      // 6
static const char *PMODE_OPTS[] = {"Off","Auto","On"};                          // 3

static const param_def_t PARAMS[] = {
  /* ---- Master ---- */
  { "volume",        "Volume",        VOLUME,        K_PCT,    0,0, 0,{0} },
  { "highpass",      "High Pass",     HIGHPASS,      K_PCT,    0,0, 0,{0} },

  /* ---- Oscillators ---- */
  { "osc1_wave",     "Osc1 Wave",     OSC1WAVEFORM,  K_ENUM,   0,0, 3, {"Saw","Pulse","Noise"} },
  { "osc2_wave",     "Osc2 Wave",     OSC2WAVEFORM,  K_ENUM,   0,0, 5, {"Saw","Pulse","Tri","Sine","Noise"} },
  { "osc1_vol",      "Osc1 Level",    OSC1VOLUME,    K_PCT,    0,0, 0,{0} },
  { "osc2_vol",      "Osc2 Level",    OSC2VOLUME,    K_PCT,    0,0, 0,{0} },
  { "osc3_vol",      "Sub Level",     OSC3VOLUME,    K_PCT,    0,0, 0,{0} },
  { "osc_tune",      "Master Tune",   OSCMASTERTUNE, K_BIPOLAR,0,0, 0,{0} },
  { "osc1_tune",     "Osc1 Tune",     OSC1TUNE,      K_BIPOLAR,0,0, 0,{0} },
  { "osc2_tune",     "Osc2 Tune",     OSC2TUNE,      K_BIPOLAR,0,0, 0,{0} },
  { "osc1_fine",     "Osc1 Fine",     OSC1FINETUNE,  K_BIPOLAR,0,0, 0,{0} },
  { "osc2_fine",     "Osc2 Fine",     OSC2FINETUNE,  K_BIPOLAR,0,0, 0,{0} },
  { "osc1_pw",       "Osc1 PW",       OSC1PW,        K_PCT,    0,0, 0,{0} },
  { "osc1_phase",    "Osc1 Phase",    OSC1PHASE,     K_PCT,    0,0, 0,{0} },
  { "osc2_phase",    "Osc2 Phase",    OSC2PHASE,     K_PCT,    0,0, 0,{0} },
  { "osc2_fm",       "Osc2 FM",       OSC2FM,        K_PCT,    0,0, 0,{0} },
  { "osc_sync",      "Osc Sync",      OSCSYNC,       K_TOGGLE, 0,0, 0,{0} },
  { "ringmod",       "Ring Mod",      RINGMODULATION,K_PCT,    0,0, 0,{0} },
  { "detune",        "Detune",        DETUNE,        K_PCT,    0,0, 0,{0} },
  { "bitcrush",      "Bitcrusher",    OSCBITCRUSHER, K_PCT,    0,0, 0,{0} },
  { "vintage",       "Vintage",       VINTAGENOISE,  K_PCT,    0,0, 0,{0} },

  /* ---- Filter ---- */
  { "filter_type",   "Filter Type",   FILTERTYPE,    K_ENUM,   0,0, 12,
        {"LP24","LP18","LP12","LP6","HP24","BP24","Notch","SV-LP","SV-HP","SV-BP","Moog","Moog2"} },
  { "cutoff",        "Cutoff",        CUTOFF,        K_PCT,    0,0, 0,{0} },
  { "resonance",     "Resonance",     RESONANCE,     K_PCT,    0,0, 0,{0} },
  { "keyfollow",     "Key Follow",    KEYFOLLOW,     K_PCT,    0,0, 0,{0} },
  { "filter_env",    "Filter Env",    FILTERCONTOUR, K_PCT,    0,0, 0,{0} },
  { "filter_drive",  "Filter Drive",  FILTERDRIVE,   K_PCT,    0,0, 0,{0} },

  /* ---- Filter envelope ---- */
  { "fenv_a",        "Filter Attack", FILTERATTACK,  K_PCT,    0,0, 0,{0} },
  { "fenv_d",        "Filter Decay",  FILTERDECAY,   K_PCT,    0,0, 0,{0} },
  { "fenv_s",        "Filter Sustain",FILTERSUSTAIN, K_PCT,    0,0, 0,{0} },
  { "fenv_r",        "Filter Release",FILTERRELEASE, K_PCT,    0,0, 0,{0} },

  /* ---- Amp envelope ---- */
  { "aenv_a",        "Amp Attack",    AMPATTACK,     K_PCT,    0,0, 0,{0} },
  { "aenv_d",        "Amp Decay",     AMPDECAY,      K_PCT,    0,0, 0,{0} },
  { "aenv_s",        "Amp Sustain",   AMPSUSTAIN,    K_PCT,    0,0, 0,{0} },
  { "aenv_r",        "Amp Release",   AMPRELEASE,    K_PCT,    0,0, 0,{0} },

  /* ---- LFO 1 ---- */
  { "lfo1_wave",     "LFO1 Wave",     LFO1WAVEFORM,  K_PCT,    0,0, 0,{0} },
  { "lfo1_rate",     "LFO1 Rate",     LFO1RATE,      K_PCT,    0,0, 0,{0} },
  { "lfo1_amount",   "LFO1 Amount",   LFO1AMOUNT,    K_PCT,    0,0, 0,{0} },
  { "lfo1_dest",     "LFO1 Dest",     LFO1DESTINATION,K_ENUM,  0,0, 8,
        {"None","Filter","Osc1","Osc2","PW","FM","LFO2","Osc1+2"} },
  { "lfo1_sync",     "LFO1 Sync",     LFO1SYNC,      K_TOGGLE, 0,0, 0,{0} },
  { "lfo1_keytrig",  "LFO1 KeyTrig",  LFO1KEYTRIGGER,K_TOGGLE, 0,0, 0,{0} },
  { "lfo1_phase",    "LFO1 Phase",    LFO1PHASE,     K_PCT,    0,0, 0,{0} },

  /* ---- LFO 2 ---- */
  { "lfo2_wave",     "LFO2 Wave",     LFO2WAVEFORM,  K_PCT,    0,0, 0,{0} },
  { "lfo2_rate",     "LFO2 Rate",     LFO2RATE,      K_PCT,    0,0, 0,{0} },
  { "lfo2_amount",   "LFO2 Amount",   LFO2AMOUNT,    K_PCT,    0,0, 0,{0} },
  { "lfo2_dest",     "LFO2 Dest",     LFO2DESTINATION,K_ENUM,  0,0, 8,
        {"None","Filter","Osc1","Osc2","PW","FM","LFO1","Osc1+2"} },
  { "lfo2_sync",     "LFO2 Sync",     LFO2SYNC,      K_TOGGLE, 0,0, 0,{0} },
  { "lfo2_keytrig",  "LFO2 KeyTrig",  LFO2KEYTRIGGER,K_TOGGLE, 0,0, 0,{0} },
  { "lfo2_phase",    "LFO2 Phase",    LFO2PHASE,     K_PCT,    0,0, 0,{0} },

  /* ---- Free AD envelope ---- */
  { "free_a",        "Env3 Attack",   FREEADATTACK,  K_PCT,    0,0, 0,{0} },
  { "free_d",        "Env3 Decay",    FREEADDECAY,   K_PCT,    0,0, 0,{0} },
  { "free_amt",      "Env3 Amount",   FREEADAMOUNT,  K_BIPOLAR,0,0, 0,{0} },
  { "free_dest",     "Env3 Dest",     FREEADDESTINATION,K_ENUM,0,0, 6,
        {"Off","Filter","Osc1","Osc2","PW","FM"} },

  /* ---- Velocity / wheel ---- */
  { "vel_vol",       "Vel > Vol",     VELOCITYVOLUME, K_PCT,   0,0, 0,{0} },
  { "vel_env",       "Vel > Env",     VELOCITYCONTOUR,K_PCT,   0,0, 0,{0} },
  { "vel_cut",       "Vel > Cutoff",  VELOCITYCUTOFF, K_PCT,   0,0, 0,{0} },
  { "pw_cutoff",     "Wheel > Cutoff",PITCHWHEELCUTOFF,K_PCT,  0,0, 0,{0} },
  { "pw_pitch",      "Bend Range",    PITCHWHEELPITCH,K_PCT,   0,0, 0,{0} },

  /* ---- Voicing ---- */
  { "portamento",    "Portamento",    PORTAMENTO,    K_PCT,    0,0, 0,{0} },
  { "porta_mode",    "Porta Mode",    PORTAMENTOMODE,K_ENUM,   0,0, 3, {"Off","Auto","On"} },
  { "voices",        "Voices",        VOICES,        K_INT,    1,6, 6,{0} },

  /* ---- Chorus / Reverb ---- */
  { "chorus1",       "Chorus I",      CHORUS1ENABLE, K_TOGGLE, 0,0, 0,{0} },
  { "chorus2",       "Chorus II",     CHORUS2ENABLE, K_TOGGLE, 0,0, 0,{0} },
  { "reverb_wet",    "Reverb Wet",    REVERBWET,     K_PCT,    0,0, 0,{0} },
  { "reverb_decay",  "Reverb Decay",  REVERBDECAY,   K_PCT,    0,0, 0,{0} },
  { "reverb_pre",    "Reverb PreDly", REVERBPREDELAY,K_PCT,    0,0, 0,{0} },
  { "reverb_hi",     "Reverb HiCut",  REVERBHIGHCUT, K_PCT,    0,0, 0,{0} },
  { "reverb_lo",     "Reverb LoCut",  REVERBLOWCUT,  K_PCT,    0,0, 0,{0} },

  /* ---- Delay ---- */
  { "delay_wet",     "Delay Wet",     DELAYWET,      K_PCT,    0,0, 0,{0} },
  { "delay_time",    "Delay Time",    DELAYTIME,     K_PCT,    0,0, 0,{0} },
  { "delay_sync",    "Delay Sync",    DELAYSYNC,     K_TOGGLE, 0,0, 0,{0} },
  { "delay_fac_l",   "Delay 2x L",    DELAYFACTORL,  K_TOGGLE, 0,0, 0,{0} },
  { "delay_fac_r",   "Delay 2x R",    DELAYFACTORR,  K_TOGGLE, 0,0, 0,{0} },
  { "delay_fb",      "Delay Feedbk",  DELAYFEEDBACK, K_PCT,    0,0, 0,{0} },
  { "delay_hi",      "Delay HiCut",   DELAYHIGHSHELF,K_PCT,    0,0, 0,{0} },
  { "delay_lo",      "Delay LoCut",   DELAYLOWSHELF, K_PCT,    0,0, 0,{0} },
};

static const int NM_PARAM_COUNT = (int)(sizeof(PARAMS) / sizeof(PARAMS[0]));

/* Default patch (normalized) — a plain saw/LP init so a fresh instance is
 * audible before preset 0 loads over it. */
typedef struct { int index; float value; } patch_val_t;
static const patch_val_t DEFAULT_PATCH[] = {
  { VOLUME, 0.50f },
  { OSC1VOLUME, 0.80f }, { OSC1WAVEFORM, 0.0f },     // saw (combo 1)
  { OSC2VOLUME, 0.0f },  { OSC2WAVEFORM, 0.0f }, { OSC3VOLUME, 0.0f },
  { OSCMASTERTUNE, 0.5f }, { OSC1TUNE, 0.5f }, { OSC2TUNE, 0.5f },
  { OSC1FINETUNE, 0.5f }, { OSC2FINETUNE, 0.5f }, { DETUNE, 0.20f },
  { OSC1PW, 0.5f },
  { FILTERTYPE, 0.0f },                               // LP24 (combo 1 of 12)
  { CUTOFF, 0.60f }, { RESONANCE, 0.12f }, { KEYFOLLOW, 0.30f },
  { FILTERCONTOUR, 0.35f },
  { FILTERATTACK, 0.0f }, { FILTERDECAY, 0.45f }, { FILTERSUSTAIN, 0.30f }, { FILTERRELEASE, 0.30f },
  { AMPATTACK, 0.0f },    { AMPDECAY, 0.50f },   { AMPSUSTAIN, 0.85f }, { AMPRELEASE, 0.28f },
  { LFO1RATE, 0.30f }, { LFO1AMOUNT, 0.0f },
  { LFO2RATE, 0.30f }, { LFO2AMOUNT, 0.0f },
  { PITCHWHEELPITCH, 0.20f },
  { VOICES, 1.0f },                                   // normalized -> combo 6
};
static const int DEFAULT_PATCH_COUNT = (int)(sizeof(DEFAULT_PATCH) / sizeof(DEFAULT_PATCH[0]));

/* ======================================================================== *
 *  Instance
 * ======================================================================== */
typedef struct {
    char        module_dir[256];
    SynthEngine *synth;
    float       eng[NUMPARAM];   // shadow of NORMALIZED values, by SYNTHPARAMETERS
    int         octave_transpose;
    float       tempo_bpm;
    int         editor_page;     // canvas overlay state (persists per instance)
    int         cur_preset;      // index into NM_FACTORY_BANK, -1 == Init
} nm_instance_t;

static const param_def_t *find_param(const char *key) {
    for (int i = 0; i < NM_PARAM_COUNT; i++)
        if (strcmp(PARAMS[i].key, key) == 0) return &PARAMS[i];
    return NULL;
}

/* Push one NORMALIZED value into the engine. Most params pass straight to their
 * setter (which does its own log/combo scaling); LFO rate/sync need tempo, and
 * the delay params route through the delay engine. Mirrors TalCore::setParameter. */
static void apply_engine(nm_instance_t *inst, int idx, float v) {
    SynthEngine *e = inst->synth;
    inst->eng[idx] = v;
    float bpm = inst->tempo_bpm;
    switch (idx) {
        case VOLUME:         e->setVolume(v); break;
        case CUTOFF:         e->setCutoff(v); break;
        case RESONANCE:      e->setResonance(v); break;
        case FILTERCONTOUR:  e->setFilterContour(v); break;
        case KEYFOLLOW:      e->setKeyfollow(v); break;
        case FILTERDRIVE:    e->setFilterDrive(v); break;
        case FILTERATTACK:   e->setFilterAttack(v); break;
        case FILTERDECAY:    e->setFilterDecay(v); break;
        case FILTERSUSTAIN:  e->setFilterSustain(v); break;
        case FILTERRELEASE:  e->setFilterRelease(v); break;
        case AMPATTACK:      e->setAmpAttack(v); break;
        case AMPDECAY:       e->setAmpDecay(v); break;
        case AMPSUSTAIN:     e->setAmpSustain(v); break;
        case AMPRELEASE:     e->setAmpRelease(v); break;
        case OSC1VOLUME:     e->setOsc1Volume(v); break;
        case OSC2VOLUME:     e->setOsc2Volume(v); break;
        case OSC3VOLUME:     e->setOsc3Volume(v); break;
        case OSC1WAVEFORM:   e->setOsc1Waveform(v); break;
        case OSC2WAVEFORM:   e->setOsc2Waveform(v); break;
        case OSC1TUNE:       e->setOsc1Tune(v); break;
        case OSC2TUNE:       e->setOsc2Tune(v); break;
        case OSC1FINETUNE:   e->setOsc1FineTune(v); break;
        case OSC2FINETUNE:   e->setOsc2FineTune(v); break;
        case OSCSYNC:        e->setOscSync(v); break;
        case OSCMASTERTUNE:  e->setMastertune(v); break;
        case TRANSPOSE:      e->setTranspose(v); break;
        case DETUNE:         e->setDetune(v); break;
        case VINTAGENOISE:   e->setVintageNoise(v); break;
        case OSC1PW:         e->setOsc1Pw(v); break;
        case OSC1PHASE:      e->setOsc1Phase(v); break;
        case OSC2FM:         e->setOsc1Fm(v); break;   // TAL maps OSC2FM -> setOsc1Fm
        case OSC2PHASE:      e->setOsc2Phase(v); break;
        case RINGMODULATION: e->setRingmodulation(v); break;
        case OSCBITCRUSHER:  e->setOscBitcrusher(v); break;
        case HIGHPASS:       e->setHighPass(v); break;
        case FILTERTYPE:     e->setFiltertype(v); break;
        case PORTAMENTO:     e->setPortamento(v); break;
        case PORTAMENTOMODE: e->setPortamentoMode(v); break;
        case LFO1RATE:       e->setLfo1Rate(v, bpm); break;
        case LFO2RATE:       e->setLfo2Rate(v, bpm); break;
        case LFO1AMOUNT:     e->setLfo1Amount(v); break;
        case LFO2AMOUNT:     e->setLfo2Amount(v); break;
        case LFO1WAVEFORM:   e->setLfo1Waveform(v); break;
        case LFO2WAVEFORM:   e->setLfo2Waveform(v); break;
        case LFO1DESTINATION:e->setLfo1Destination(v); break;
        case LFO2DESTINATION:e->setLfo2Destination(v); break;
        case LFO1PHASE:      e->setLfo1Phase(v); break;
        case LFO2PHASE:      e->setLfo2Phase(v); break;
        case LFO1SYNC:       e->setLfo1Sync(v, inst->eng[LFO1RATE], bpm); break;
        case LFO2SYNC:       e->setLfo2Sync(v, inst->eng[LFO2RATE], bpm); break;
        case LFO1KEYTRIGGER: e->setLfo1KeyTrigger(v); break;
        case LFO2KEYTRIGGER: e->setLfo2KeyTrigger(v); break;
        case FREEADATTACK:   e->setFreeAdAttack(v); break;
        case FREEADDECAY:    e->setFreeAdDecay(v); break;
        case FREEADAMOUNT:   e->setFreeAdAmount(v); break;
        case FREEADDESTINATION: e->setFreeAdDestination(v); break;
        case VELOCITYVOLUME:  e->setVelocityVolume(v); break;
        case VELOCITYCONTOUR: e->setVelocityContour(v); break;
        case VELOCITYCUTOFF:  e->setVelocityCutoff(v); break;
        case PITCHWHEELCUTOFF:e->setPitchwheelCutoff(v); break;
        case PITCHWHEELPITCH: e->setPitchwheelPitch(v); break;
        case CHORUS1ENABLE:   e->setChorus(v > 0.5f, inst->eng[CHORUS2ENABLE] > 0.5f); break;
        case CHORUS2ENABLE:   e->setChorus(inst->eng[CHORUS1ENABLE] > 0.5f, v > 0.5f); break;
        case REVERBWET:       e->setReverbWet(v); break;
        case REVERBDECAY:     e->setReverbDecay(v); break;
        case REVERBPREDELAY:  e->setReverbPreDelay(v); break;
        case REVERBHIGHCUT:   e->setReverbHighCut(v); break;
        case REVERBLOWCUT:    e->setReverbLowCut(v); break;
        case DELAYWET:        e->getDelayEngine()->setWet(v); break;
        case DELAYTIME:       e->getDelayEngine()->setDelay(v); break;
        case DELAYSYNC:       e->getDelayEngine()->setSync(v > 0.5f); break;
        case DELAYFACTORL:    e->getDelayEngine()->setFactor2xL(v > 0.5f); break;
        case DELAYFACTORR:    e->getDelayEngine()->setFactor2xR(v > 0.5f); break;
        case DELAYHIGHSHELF:  e->getDelayEngine()->setHighCut(v); break;
        case DELAYLOWSHELF:   e->getDelayEngine()->setLowCut(v); break;
        case DELAYFEEDBACK:   e->getDelayEngine()->setFeedback(v); break;
        case VOICES:          e->setNumberOfVoices(v); break;
        /* EnvelopeEditor params accepted but inert (deferred, stubbed). */
        case ENVELOPEEDITORDEST1:   e->setEnvelopeEditorDest1(v); break;
        case ENVELOPEEDITORSPEED:   e->setEnvelopeEditorSpeed(v); break;
        case ENVELOPEEDITORAMOUNT:  e->setEnvelopeEditorAmount(v); break;
        default: break;
    }
}

/* ---- display <-> normalized conversion ---- */
static int combo_norm_to_idx(float norm, int n) {   // matches calcComboBoxValue-1
    if (n < 2) return 0;
    int k = (int)floorf(norm * (n - 1) + 1.5f) - 1;
    if (k < 0) k = 0;
    if (k > n - 1) k = n - 1;
    return k;
}
static float combo_idx_to_norm(int idx, int n) {
    if (n < 2) return 0.0f;
    if (idx < 0) idx = 0;
    if (idx > n - 1) idx = n - 1;
    return (float)idx / (float)(n - 1);
}

static float disp_to_engine(const param_def_t *p, const char *val) {
    switch (p->kind) {
        case K_PCT:
        case K_BIPOLAR: return (float)atof(val) / 100.0f;              // 0..100 -> 0..1
        case K_TOGGLE:  return (atoi(val) != 0) ? 1.0f : 0.0f;
        case K_INT: {
            int iv = atoi(val);
            if (iv < p->imin) iv = p->imin;
            if (iv > p->imax) iv = p->imax;
            return combo_idx_to_norm(iv - p->imin, p->n_opts);         // 1..6 -> norm
        }
        case K_ENUM:    return combo_idx_to_norm(atoi(val), p->n_opts);
    }
    return 0.0f;
}

static void engine_to_disp(const param_def_t *p, float norm, char *buf, int len) {
    switch (p->kind) {
        case K_PCT:
        case K_BIPOLAR: snprintf(buf, len, "%d", (int)lroundf(norm * 100.0f)); break;
        case K_TOGGLE:  snprintf(buf, len, "%d", norm > 0.5f ? 1 : 0); break;
        case K_INT:     snprintf(buf, len, "%d", p->imin + combo_norm_to_idx(norm, p->n_opts)); break;
        case K_ENUM:    snprintf(buf, len, "%d", combo_norm_to_idx(norm, p->n_opts)); break;
        default:        snprintf(buf, len, "0"); break;
    }
}

/* Load one factory program (256-entry bank, normalized values). Release first
 * so a held note across a switch isn't stranded (setNumberOfVoices clears the
 * playing list without note-offing). */
static void load_preset(nm_instance_t *inst, int idx) {
    if (idx < 0 || idx >= NM_FACTORY_COUNT) return;
    inst->cur_preset = idx;
    inst->synth->setPanic();
    const nm_factory_preset_t *p = &NM_FACTORY_BANK[idx];
    for (int i = 1; i < NUMPARAM; i++) {          // skip UNUSED1(0)
        if (i == PANIC) continue;
        apply_engine(inst, i, p->programData[i]);
    }
}

/* ======================================================================== *
 *  ui_hierarchy + chain_params JSON
 * ======================================================================== */
static const char *kUiHierarchy =
"{\"modes\":null,\"levels\":{"
 "\"root\":{\"label\":\"Noisemaker\","
   "\"list_param\":\"preset\",\"count_param\":\"preset_count\",\"name_param\":\"preset_name\","
   "\"knobs\":[\"cutoff\",\"resonance\",\"filter_env\",\"aenv_a\",\"aenv_d\",\"aenv_s\",\"aenv_r\",\"volume\"],"
   "\"params\":["
     "{\"key\":\"editor\",\"label\":\"Editor\"},"
     "{\"level\":\"osc\",\"label\":\"Oscillators\"},"
     "{\"level\":\"filter\",\"label\":\"Filter\"},"
     "{\"level\":\"fenv\",\"label\":\"Filter Env\"},"
     "{\"level\":\"aenv\",\"label\":\"Amp Env\"},"
     "{\"level\":\"lfo1\",\"label\":\"LFO 1\"},"
     "{\"level\":\"lfo2\",\"label\":\"LFO 2\"},"
     "{\"level\":\"env3\",\"label\":\"Env 3 (Free)\"},"
     "{\"level\":\"voice\",\"label\":\"Voicing / Vel\"},"
     "{\"level\":\"fx\",\"label\":\"Chorus / Reverb\"},"
     "{\"level\":\"delay\",\"label\":\"Delay\"}"
   "]},"
 "\"osc\":{\"knobs\":[\"osc1_wave\",\"osc2_wave\",\"osc1_vol\",\"osc2_vol\",\"osc3_vol\",\"detune\",\"osc1_pw\",\"ringmod\"],"
   "\"params\":[\"osc1_wave\",\"osc1_vol\",\"osc1_tune\",\"osc1_fine\",\"osc1_pw\",\"osc1_phase\","
     "\"osc2_wave\",\"osc2_vol\",\"osc2_tune\",\"osc2_fine\",\"osc2_phase\",\"osc2_fm\","
     "\"osc3_vol\",\"osc_sync\",\"ringmod\",\"detune\",\"osc_tune\",\"bitcrush\",\"vintage\"]},"
 "\"filter\":{\"knobs\":[\"filter_type\",\"cutoff\",\"resonance\",\"keyfollow\",\"filter_env\",\"filter_drive\",\"highpass\",\"vel_cut\"],"
   "\"params\":[\"filter_type\",\"cutoff\",\"resonance\",\"keyfollow\",\"filter_env\",\"filter_drive\",\"highpass\"]},"
 "\"fenv\":{\"knobs\":[\"fenv_a\",\"fenv_d\",\"fenv_s\",\"fenv_r\",\"filter_env\",\"vel_env\",\"cutoff\",\"resonance\"],"
   "\"params\":[\"fenv_a\",\"fenv_d\",\"fenv_s\",\"fenv_r\"]},"
 "\"aenv\":{\"knobs\":[\"aenv_a\",\"aenv_d\",\"aenv_s\",\"aenv_r\",\"vel_vol\",\"volume\",\"cutoff\",\"resonance\"],"
   "\"params\":[\"aenv_a\",\"aenv_d\",\"aenv_s\",\"aenv_r\"]},"
 "\"lfo1\":{\"knobs\":[\"lfo1_wave\",\"lfo1_rate\",\"lfo1_amount\",\"lfo1_dest\",\"lfo1_sync\",\"lfo1_keytrig\",\"lfo1_phase\",\"volume\"],"
   "\"params\":[\"lfo1_wave\",\"lfo1_rate\",\"lfo1_amount\",\"lfo1_dest\",\"lfo1_sync\",\"lfo1_keytrig\",\"lfo1_phase\"]},"
 "\"lfo2\":{\"knobs\":[\"lfo2_wave\",\"lfo2_rate\",\"lfo2_amount\",\"lfo2_dest\",\"lfo2_sync\",\"lfo2_keytrig\",\"lfo2_phase\",\"volume\"],"
   "\"params\":[\"lfo2_wave\",\"lfo2_rate\",\"lfo2_amount\",\"lfo2_dest\",\"lfo2_sync\",\"lfo2_keytrig\",\"lfo2_phase\"]},"
 "\"env3\":{\"knobs\":[\"free_a\",\"free_d\",\"free_amt\",\"free_dest\",\"cutoff\",\"resonance\",\"filter_env\",\"volume\"],"
   "\"params\":[\"free_a\",\"free_d\",\"free_amt\",\"free_dest\"]},"
 "\"voice\":{\"knobs\":[\"voices\",\"portamento\",\"porta_mode\",\"vel_vol\",\"vel_env\",\"vel_cut\",\"pw_pitch\",\"pw_cutoff\"],"
   "\"params\":[\"voices\",\"portamento\",\"porta_mode\",\"vel_vol\",\"vel_env\",\"vel_cut\",\"pw_pitch\",\"pw_cutoff\"]},"
 "\"fx\":{\"knobs\":[\"chorus1\",\"chorus2\",\"reverb_wet\",\"reverb_decay\",\"reverb_pre\",\"reverb_hi\",\"reverb_lo\",\"volume\"],"
   "\"params\":[\"chorus1\",\"chorus2\",\"reverb_wet\",\"reverb_decay\",\"reverb_pre\",\"reverb_hi\",\"reverb_lo\"]},"
 "\"delay\":{\"knobs\":[\"delay_wet\",\"delay_time\",\"delay_fb\",\"delay_sync\",\"delay_fac_l\",\"delay_fac_r\",\"delay_hi\",\"delay_lo\"],"
   "\"params\":[\"delay_wet\",\"delay_time\",\"delay_fb\",\"delay_sync\",\"delay_fac_l\",\"delay_fac_r\",\"delay_hi\",\"delay_lo\"]}"
"}}";

static int build_chain_params(char *buf, int len) {
    int n = 0;
    n += snprintf(buf + n, len - n, "[");
    n += snprintf(buf + n, len - n,
        "{\"key\":\"editor\",\"name\":\"Bank Editor\",\"type\":\"canvas\","
        "\"canvas_script\":\"canvas.js#bank_editor\",\"show_footer\":false,\"show_value\":false}");
    for (int i = 0; i < NM_PARAM_COUNT && n < len - 256; i++) {
        const param_def_t *p = &PARAMS[i];
        n += snprintf(buf + n, len - n, ",");
        switch (p->kind) {
            case K_PCT:
                n += snprintf(buf + n, len - n,
                    "{\"key\":\"%s\",\"name\":\"%s\",\"type\":\"int\",\"min\":0,\"max\":100,\"step\":1,\"unit\":\"%%\"}",
                    p->key, p->name);
                break;
            case K_BIPOLAR:
                n += snprintf(buf + n, len - n,
                    "{\"key\":\"%s\",\"name\":\"%s\",\"type\":\"int\",\"min\":0,\"max\":100,\"step\":1}",
                    p->key, p->name);
                break;
            case K_TOGGLE:
                n += snprintf(buf + n, len - n,
                    "{\"key\":\"%s\",\"name\":\"%s\",\"type\":\"enum\",\"options\":[\"Off\",\"On\"]}",
                    p->key, p->name);
                break;
            case K_INT:
                n += snprintf(buf + n, len - n,
                    "{\"key\":\"%s\",\"name\":\"%s\",\"type\":\"int\",\"min\":%d,\"max\":%d}",
                    p->key, p->name, p->imin, p->imax);
                break;
            case K_ENUM: {
                n += snprintf(buf + n, len - n,
                    "{\"key\":\"%s\",\"name\":\"%s\",\"type\":\"enum\",\"options\":[", p->key, p->name);
                for (int o = 0; o < p->n_opts; o++)
                    n += snprintf(buf + n, len - n, "%s\"%s\"", o ? "," : "", p->opts[o]);
                n += snprintf(buf + n, len - n, "]}");
                break;
            }
        }
    }
    n += snprintf(buf + n, len - n, "]");
    return n;
}

/* ======================================================================== *
 *  v2 entry points
 * ======================================================================== */
static void *v2_create_instance(const char *module_dir, const char *json_defaults) {
    (void)json_defaults;
    nm_instance_t *inst = (nm_instance_t *)calloc(1, sizeof(nm_instance_t));
    if (!inst) return NULL;
    if (module_dir) { strncpy(inst->module_dir, module_dir, sizeof(inst->module_dir) - 1); }
    inst->tempo_bpm = (g_host && g_host->get_bpm) ? g_host->get_bpm() : 120.0f;
    if (inst->tempo_bpm <= 0.0f) inst->tempo_bpm = 120.0f;
    inst->octave_transpose = 0;
    inst->editor_page = 0;
    inst->cur_preset = -1;

    inst->synth = new SynthEngine((float)MOVE_SAMPLE_RATE);
    inst->synth->setNumberOfVoices(1.0f);   // normalized -> combo 6

    for (int i = 0; i < NUMPARAM; i++) inst->eng[i] = 0.0f;
    for (int i = 0; i < DEFAULT_PATCH_COUNT; i++) {
        int idx = DEFAULT_PATCH[i].index;
        if (idx >= 0 && idx < NUMPARAM) apply_engine(inst, idx, DEFAULT_PATCH[i].value);
    }
    load_preset(inst, 0);   /* factory startup patch; host preset recall overrides */
    return inst;
}

static void v2_destroy_instance(void *instance) {
    nm_instance_t *inst = (nm_instance_t *)instance;
    if (!inst) return;
    delete inst->synth;
    free(inst);
}

static void v2_on_midi(void *instance, const uint8_t *msg, int len, int source) {
    nm_instance_t *inst = (nm_instance_t *)instance;
    if (!inst || !inst->synth || len < 2) return;
    (void)source;
    uint8_t status = msg[0] & 0xF0;
    uint8_t d1 = msg[1];
    uint8_t d2 = (len > 2) ? msg[2] : 0;

    switch (status) {
        case 0x90: {
            int note = d1 + inst->octave_transpose * 12;
            if (note < 0) note = 0; if (note > 127) note = 127;
            if (d2 > 0) inst->synth->setNoteOn(note, d2 / 127.0f);
            else        inst->synth->setNoteOff(note);
            break;
        }
        case 0x80: {
            int note = d1 + inst->octave_transpose * 12;
            if (note < 0) note = 0; if (note > 127) note = 127;
            inst->synth->setNoteOff(note);
            break;
        }
        case 0xE0: {
            if (len < 3) break;
            int bend = ((d2 << 7) | d1) - 8192;
            inst->synth->setPitchwheelAmount(bend / 8192.0f);
            break;
        }
        case 0xB0: {
            if (d1 == 120 || d1 == 123) inst->synth->setPanic();
            break;
        }
        default: break;
    }
}

static void v2_set_param(void *instance, const char *key, const char *val) {
    nm_instance_t *inst = (nm_instance_t *)instance;
    if (!inst || !key || !val) return;

    if (strcmp(key, "all_notes_off") == 0) { inst->synth->setPanic(); return; }
    if (strcmp(key, "octave_transpose") == 0) { inst->octave_transpose = atoi(val); return; }
    if (strcmp(key, "editor") == 0) { inst->editor_page = atoi(val); return; }
    if (strcmp(key, "preset") == 0) {
        int idx = atoi(val);
        if (idx >= 0 && idx < NM_FACTORY_COUNT && idx != inst->cur_preset)
            load_preset(inst, idx);
        return;
    }

    const param_def_t *p = find_param(key);
    if (!p) return;
    apply_engine(inst, p->engine_index, disp_to_engine(p, val));
}

static int v2_get_param(void *instance, const char *key, char *buf, int buf_len) {
    nm_instance_t *inst = (nm_instance_t *)instance;
    if (!inst || !key || !buf || buf_len <= 0) return -1;

    if (strcmp(key, "ui_hierarchy") == 0)
        return snprintf(buf, buf_len, "%s", kUiHierarchy);
    if (strcmp(key, "chain_params") == 0)
        return build_chain_params(buf, buf_len);
    if (strcmp(key, "preset_name") == 0)
        return snprintf(buf, buf_len, "%s",
            (inst->cur_preset >= 0 && inst->cur_preset < NM_FACTORY_COUNT)
                ? NM_FACTORY_BANK[inst->cur_preset].name : "Init");
    if (strcmp(key, "preset_count") == 0)
        return snprintf(buf, buf_len, "%d", NM_FACTORY_COUNT);
    if (strcmp(key, "preset") == 0)
        return snprintf(buf, buf_len, "%d", inst->cur_preset < 0 ? 0 : inst->cur_preset);
    if (strcmp(key, "octave_transpose") == 0)
        return snprintf(buf, buf_len, "%d", inst->octave_transpose);
    if (strcmp(key, "editor") == 0)
        return snprintf(buf, buf_len, "%d", inst->editor_page);

    const param_def_t *p = find_param(key);
    if (!p) return -1;
    engine_to_disp(p, inst->eng[p->engine_index], buf, buf_len);
    return (int)strlen(buf);
}

static int v2_get_error(void *instance, char *buf, int buf_len) {
    (void)instance;
    if (buf && buf_len > 0) buf[0] = '\0';
    return 0;
}

static void v2_render_block(void *instance, int16_t *out_interleaved_lr, int frames) {
    nm_instance_t *inst = (nm_instance_t *)instance;
    if (!inst || !inst->synth) {
        if (out_interleaved_lr) memset(out_interleaved_lr, 0, frames * 4);
        return;
    }
    /* Refresh tempo for host-synced LFOs + delay; re-apply only when BPM moves. */
    if (g_host && g_host->get_bpm) {
        float bpm = g_host->get_bpm();
        if (bpm > 0.0f && fabsf(bpm - inst->tempo_bpm) > 0.01f) {
            inst->tempo_bpm = bpm;
            inst->synth->setLfo1Rate(inst->eng[LFO1RATE], bpm);
            inst->synth->setLfo2Rate(inst->eng[LFO2RATE], bpm);
            inst->synth->setDelayBpm(bpm);
        }
    }
    for (int i = 0; i < frames; i++) {
        float l = 0.0f, r = 0.0f;
        inst->synth->process(&l, &r);
        int32_t li = (int32_t)(l * 32767.0f);
        int32_t ri = (int32_t)(r * 32767.0f);
        if (li >  32767) li =  32767; if (li < -32768) li = -32768;
        if (ri >  32767) ri =  32767; if (ri < -32768) ri = -32768;
        out_interleaved_lr[i * 2]     = (int16_t)li;
        out_interleaved_lr[i * 2 + 1] = (int16_t)ri;
    }
}

static plugin_api_v2_t g_plugin_api_v2 = {
    MOVE_PLUGIN_API_VERSION_2,
    v2_create_instance,
    v2_destroy_instance,
    v2_on_midi,
    v2_set_param,
    v2_get_param,
    v2_get_error,
    v2_render_block,
};

extern "C" plugin_api_v2_t *move_plugin_init_v2(const host_api_v1_t *host) {
    g_host = host;
    return &g_plugin_api_v2;
}
