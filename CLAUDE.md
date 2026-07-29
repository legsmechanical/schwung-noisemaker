# Noisemaker (Schwung module) — CLAUDE.md

Port of **TAL Noisemaker** (Patrick Kunz, GPLv2) to a Schwung `sound_generator`.
This file governs work inside this repo and takes precedence over workspace
defaults for this module.

## Architecture

- **Engine** (`src/dsp/Engine`, `src/dsp/Effects`): vendored **byte-verbatim**
  from [DISTRHO-Ports](https://github.com/DISTRHO/DISTRHO-Ports)
  `ports-juce5/tal-noisemaker` — the *current* TAL codebase, not the older
  Nexbit 2010 snapshot. Header-only except `Engine/Lfo.cpp`.
  `SynthEngine::process(&L, &R)` renders one stereo sample. Do **not** edit
  engine files for style; keep them verbatim so upstream diffs stay clean
  (they still diff clean today — that is how the delay was cleared of the
  "long tail" complaint in one pass). Fixes go in the wrapper or build flags.
- **Envelope Editor** (`src/dsp/EnvelopeEditor/`): TAL's spline mod-envelope,
  ported JUCE-free behind `juce_shim.h`.
- **Wrapper** (`src/dsp/noisemaker_plugin.cpp`): `plugin_api_v2`. Owns a
  `SynthEngine` per instance, converts float→int16, dispatches MIDI, and serves
  the string param surface + `ui_hierarchy` + `chain_params` (incl. the canvas
  entry). Param model mirrors OB-Xd: `PARAMS[]` maps each key to a
  `SYNTHPARAMETERS` index + a `ParamKind` that defines the display↔engine
  conversion. `apply_engine()` is the per-param setter switch, copied from TAL
  `TalCore::setParameter`.
- **UI**: `src/ui.js` (root: preset + octave via `createSoundGeneratorUI`) and
  `src/canvas.js` — the on-device **Editor** overlay,
  `globalThis.noisemaker_editor`, **14 banks** (Macros, Osc 1, Osc 2, Master,
  Filter, Filter Env, Amp Env, Env 3, LFO 1, LFO 2, Voice/Vel, Chorus/Reverb,
  Delay, Env Draw) × 8 knobs. Canvas registration is DSP-side: a `chain_params`
  entry of `type:"canvas"`, `canvas_script:"canvas.js#noisemaker_editor"`.
  `canvas.js` is **generated** from `src/canvas.config.js` by the canvaskit
  build — edit the config, never `canvas.js`.

Slot contract: the wrapper implements `state`/`name` (required for
module-preset save, knob destinations, persistence).

## The parameter wire (this is where the bugs are)

Engine setters take **normalized 0..1 for everything**. The wrapper stores
normalized and converts only at the display boundary.

**Enums do not divide 0..1 evenly, and they are 1-based.**
`AudioUtils::calcComboBoxValue` is

    idx = floor(v * (n - 1) + 1.5)      // returns 1..n, NEVER 0

so with `n` items the first and last zones are *half* width: for `n=3` the
boundaries are at v=0.25 and v=0.75, not 1/3 and 2/3. `combo_idx_to_norm` in
the wrapper inverts this exactly; do not hand-compute enum norms.

**Enum labels have exactly one home: the `opts` field in `PARAMS[]`.** That is
what `build_chain_params_json()` emits, so it feeds both the host menus and
`tools/gen_module_json.mjs`. A second, parallel set of `*_OPTS[]` arrays used
to sit above the table, referenced by nothing — on 2026-07-29 the LFO2
destination fix was applied to the dead copy and the wrong labels shipped
anyway. The dead arrays are gone; keep it that way.

Item counts, from `AudioUtils::getNumComboBoxItems` — the wrapper's `n_opts`
must match:

| param | n | items (engine order, index 1 first) |
|---|---|---|
| `OSC1WAVEFORM` | 3 | Saw, Pulse, Noise |
| `OSC2WAVEFORM` | **5** | Saw, Pulse, Tri, Sine, **Noise** |
| `FILTERTYPE` | **12** | LP24, LP18, LP12, LP6, HP24, BP24, Notch, SV-LP, SV-HP, SV-BP, Moog, Moog2 |
| `LFO1DESTINATION` | **8** | None, Filter, Osc1, Osc2, PW, FM, LFO2, Osc1+2 |
| `LFO2DESTINATION` | **8** | None, Filter, Osc1, Osc2, **Pan, Volume**, LFO1, Osc1+2 |
| `FREEADDESTINATION` | 6 | Off, Filter, Osc1, Osc2, PW, FM |
| `ENVELOPEEDITORDEST1` | 8 | Off, Filter, Osc1, Osc2, Osc1+2, FM, RingMod, Volume |
| `ENVELOPEEDITORSPEED` | 6 | x1, x2, x4, x8, x16, x32 |
| `PORTAMENTOMODE` | 3 | Off, Auto, On |
| `VOICES` | 6 | 1..6 |

**⚠ LFO1 and LFO2 have different destination lists.** `LfoHandler1` slots 5/6
are PW/FM; `LfoHandler2` slots 5/6 are PAN/VOLUME. Copying one list to the
other is the mistake that has already been made twice.

**FILTERTYPE has no "Off".** The combo emits 1..12, so index 0 is unreachable;
"no filter" is not a setting. Two further traps in `FilterHandler::process`:
type **12 ("Moog2") is a commented-out no-op** — the sample passes through
unfiltered and 3x louder — and the whole `>10` Moog branch carries that same
`*3.0f` makeup gain that the 1..10 oversampled branch does not.

**Modulation depths that are not what they look like:**
- **LFO→pitch is ±48 SEMITONES × amount** (`LfoHandler{1,2}::getOsc1Pitch`
  returns `value * 48.0f * amount`, added straight to the note number in
  `Vco.h`). The smallest step the 0..100 integer wire can express is amount=1
  = ±0.5 semitone; musical vibrato (±10–25 cents) is **unreachable**. The SW
  preset bank bans the destination outright and `gen_presets.mjs` enforces it.
- **LFO2→Pan ignores amount entirely** — `getPan()` returns `value`, so it hard
  pans L/R at any depth you dial.
- **`ENVELOPEEDITORAMOUNT` is squared** by the engine (`setAmount`), so it is
  unipolar and heavily bottom-weighted.

**Bitcrusher is INVERTED and its "off" is 100, not 0.**
`getBitDepthDynamic(v) = 1 + v^8 * 65535`, and `Vco::setOscBitcrusher` treats
`v == 1.0` as the only disable condition. So display **0 = 1-bit destruction**,
100 = bypass, and the `^8` curve means nothing audible happens below ~70.
`tools/presets/base.mjs` carries `bitcrush: 100` for exactly this reason —
never omit it from a generated preset.

**LFO waveform is NOT the combo formula.** `LfoHandler::setWaveform` does
`(int)(v * 5.000001f)` → 0..5. That is `K_LFOWAVE` in the wrapper; using
`K_ENUM` for it would silently shift every waveform.

**`OSC2FM` maps to `setOsc1Fm()`** (TAL's naming, not a typo); the free/mod
envelope params are `FREEAD*`.

**LFO rate/sync setters need BPM.** The wrapper stores `tempo_bpm` and
re-applies LFO rates in `render_block` when the host BPM changes.

### Envelope-time macros (`fenv_time` / `aenv_time`)

These are **not** Echidna's macros, deliberately. Echidna multiplies the resulting
*seconds* by an HW-measured LUT; that can't work here, because TAL's many gate
envelopes (`A=0 D=0 S=1 R=0` — the corpus median for BS and LD) have nothing to
multiply. Noisemaker instead **shifts the A/D/R knob positions** proportional to the
travel remaining (`nm_env_time_shift`), so turning the knob up *creates* a release.
It does not preserve A:D:R proportions; that's the accepted trade.

**Attack is the exception and must stay one.** It goes through
`nm_env_time_shift_attack()`, which applies Echidna's rule — only the time above a
floor scales — using `rate(0)` (the engine's fastest attack) as the floor, so `v=0`
is an exact fixed point. Two reasons:
- Without it a pluck stops being a pluck: measured 21 ms → 1001 ms at `aenv_time=75`.
- `Adsr::getValueFasterAttack()` returns 1.0 immediately when `attackReal == 0.0f`
  **exactly** — an instant-snap path used by the filter EG (`SynthVoice.h:164`) and
  the free AD (`AdsrHandler.h:111`). Shifting attack off zero *leaves that mode*, so
  pinning `v=0` is required, not merely nicer.

**`DEFAULT_PATCH` is deliberately partial and is not a neutral init.**
`v2_create_instance` always calls `load_preset(inst, 0)` straight after it, so
anything it omits sits at the calloc'd 0.0 — including `OSCBITCRUSHER`, i.e.
full 1-bit crush. Never reuse it as a "reset to sane" path.

### Delay feedback: `delay_fb` is LOOP GAIN ×100, not a percentage

TAL warps the raw knob as `g(k) = 1 + (2k-1)^3`, which puts everything musical
in the bottom fifth of the travel. `K_FBGAIN` inverts that at the **display
boundary only** (`k(g) = (1 + cbrt(g-1)) / 2`, an exact bijection over
k=0..1 / g=0..2) and exposes `g × 100` in 0..200. The engine is untouched.
`g >= 1` is **not** automatically a runaway — TalEq sits inside the loop and
costs ~-1.8 dB/pass, so true sustain starts near g=1.03 and moves up with the
high cut. `load_preset` raw-applies factory data, so the 256 TAL presets keep
their exact original feedback and merely read out in gain space.
⚠ Patches saved on-device **before 2026-07-28** reload with a shorter tail:
`new = 100 * (1 + (2*old/100 - 1)^3)`.

## Build / deploy / tools

```bash
./scripts/build.sh                      # regenerates module.json + wave anchors + canvas.js, then the ARM cross-build
./scripts/install.sh                    # scp + md5-verify + restart_move.sh   (SKIP_RESTART=1 to copy only)
MOVE_HOST=root@172.16.254.1 ./scripts/install.sh    # tether
./tools/build_presets.sh                # gen -> autogain -> verify   (never run gen alone)
BANK=sw ./tools/build_presets.sh        # the synthwave bank
./build/macro_test                      # off-device macro tests  (see NOTE below)
build/nm_render --state P.json --analyze --set k=v   # render/measure one patch
node tools/render_canvas.mjs out.png    # every bank + the macro HUD states
```

- ⚠ **`build.sh` does NOT build `tests/` or `tools/`** — only `dist/`. `build/macro_test`,
  `build/delay_fb_test`, `build/nm_render` and `build/bench_render` are stale until you
  rebuild them by hand with the `g++` line in each file's header comment (each needs
  `src/dsp/Engine/Lfo.cpp`, the engine's only non-header file). Running a stale binary
  after an engine or wrapper change reports a green suite that proves nothing — this
  bit us on 2026-07-29.
- Build flags carry `-fpermissive -Wno-write-strings` for the vendored MSVC-isms
  (`Decimator.h` class-qualified ctors, `AudioUtils.h` string literals). Do not
  "fix" these in the engine sources. `Engine/Math.h` is a **port shim** (system
  `<math.h>` forwarder) — see README.
- A dsp.so-only change loads fresh on next instantiation. If Noisemaker is
  currently loaded, swap it out/in or `restart_move.sh`; `install.sh` restarts
  for you unless `SKIP_RESTART=1`.
- **Factory data is generated, not hand-edited**: `src/dsp/factory_bank.h`
  (**256** TAL programs, from `tools/factory/tal_factory_bank.xml` via
  `gen_factory_bank.mjs`; FILTERTYPE remapped from the bank's 10-item scheme to
  the engine's 12) and `src/dsp/factory_splines.h` (per-preset envelope shapes).
  Values are engine-space and `load_preset()` raw-applies them **in enum order**,
  which is what satisfies the cross-dependent setters. Regenerate after any
  `Params.h`/XML change. Preset 0 loads at create. Many factory patches are
  genuinely mono (`voices=1` — TAL basses/leads); not a bug.
- **Authored presets** live in `tools/presets/*.mjs` in two banks — **JG** (146,
  the original) and **SW** (64, synthwave). `base.mjs` holds the shared defaults
  and `catOf()`. ⚠ `autogain_presets.mjs` and `verify_presets.mjs` pick their
  audition plan (notes/hold/tail) from the category token in the name; any new
  bank prefix must be added to `BANK_TAGS` in `base.mjs` or a bass gets levelled
  with the lead plan and still looks fine. The SW generator **rejects** a preset
  with no live mod route (dest set but depth zero was how the JG bank shipped
  146 static patches).

## Open items

- **Ear-check owed** on the SW bank, then cull; decide whether it replaces JG.
  If JG survives, its 18 numbered variants still need picking. Neither bank uses
  the Envelope Editor — the obvious next bank.
- **Bipolar params** (tunes/detune) display as -100..100 %; refine to
  semitones/cents once heard.
- No aftertouch/modwheel routing yet (engine has no direct hook); revisit.
- Voice count is **resolved**: a full 6 voices on hardware (Josh, 2026-07-21).
  The old `MAX_VOICES-1` concern was unfounded.
- **CPU** has not been re-benched since the DISTRHO rebuild
  (`tools/bench_render.cpp`; Echidna reference ~21 %/core for a mono synth).

## Provenance

Engine © 2005–2010 Patrick Kunz, TAL / Togu Audio Line. GPL-2.0. Keep the
`LICENSE` and per-file headers intact; never strip GPL headers.
