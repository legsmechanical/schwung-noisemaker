# Noisemaker (Schwung module) — CLAUDE.md

Port of **TAL Noisemaker** (Patrick Kunz, GPLv2) to a Schwung `sound_generator`.
This file governs work inside this repo and takes precedence over workspace
defaults for this module.

## Architecture

- **Engine** (`src/dsp/Engine`, `src/dsp/Effects`): vendored **byte-verbatim** from
  [Nexbit/tal-noisemaker](https://github.com/Nexbit/tal-noisemaker). Header-only
  except `Engine/Lfo.cpp`. `SynthEngine::process(&L, &R)` renders one stereo
  sample; per-param `set*()` methods take **0..1 normalized** values (a few are
  small ints — see below). Do **not** edit engine files for style; keep them
  verbatim so upstream diffs stay clean. Fixes go in the wrapper or build flags.
- **Wrapper** (`src/dsp/noisemaker_plugin.cpp`): `plugin_api_v2`. Owns a
  `SynthEngine` per instance, converts float→int16, dispatches MIDI, and serves
  the string param surface + `ui_hierarchy` + `chain_params` (incl. the canvas
  entry). Param model mirrors OB-Xd: `PARAMS[]` table maps each key to a
  `SYNTHPARAMETERS` enum index + a `ParamKind` (PCT/BIPOLAR/TOGGLE/INT/ENUM) that
  defines the display↔engine conversion. `apply_engine()` is the per-param
  setter switch (copied from TAL `TalCore::setParameter`).
- **UI**: `src/ui.js` (root: preset + octave via `createSoundGeneratorUI`) and
  `src/canvas.js` (the on-device **Editor** overlay, `globalThis.noisemaker_editor`,
  9 pages × 8 knobs). Canvas registration is DSP-side: a `chain_params` entry of
  `type:"canvas"`, `canvas_script:"canvas.js#noisemaker_editor"`.

## Engine param quirks (baked into the wrapper)

- Waveforms are **zone-mapped 0..1** floats: osc1 = Saw/Pulse/Noise (thresholds
  at ½), osc2 = Saw/Pulse/Tri/Sine (thirds+). The wrapper's `enum_vals` land
  safely inside each zone.
- **FILTERTYPE** is an int 0..7 passed straight through: 0=Off, 1=LP24, 2=LP18,
  3=LP12, 4=LP6, 5=HP24, 6=BP24, 7=Notch.
- **LFO destinations** are ints **1..7** (the setter switch cases start at 1).
- `OSC2FM` maps to `setOsc1Fm()` (TAL naming); the free/mod envelope is `FREEAD*`.
- LFO rate/sync setters need BPM; the wrapper stores `tempo_bpm` and re-applies
  LFO rates in `render_block` when the host BPM changes.

## Build / Deploy

```bash
./scripts/build.sh                       # Docker cross-build -> dist/noisemaker/ + tarball
MOVE_HOST=root@172.16.254.1 ./scripts/install.sh   # tether (or default move.local)
```

- Build flags carry `-fpermissive -Wno-write-strings` for the vendored MSVC-isms
  (`Decimator.h` class-qualified ctors, `AudioUtils.h` string literals). Do not
  "fix" these in the engine sources.
- `Engine/Math.h` is a **port shim** (system `<math.h>` forwarder) — see README.
- dsp.so-only change loads fresh on next instantiation; no reboot/`install.sh`
  reboot needed. If Noisemaker is loaded, swap it out/in or `restart_move.sh`.

## Open fidelity / feature items (verify on-device)

- **Voice count**: TAL's voice loops iterate `MAX_VOICES-1` (`MAX_VOICES==6`), so
  the *audible* ceiling may be 5, not 6. `NM_NUM_VOICES` requests 6 — confirm the
  real polyphony on hardware and reconcile the `voices` param max.
- **Default patch** is a hand-authored audible saw/LP init — **not** a TAL factory
  patch. Factory-preset import (TAL `.talnm`/`ProgramChunk` base64 banks →
  wrapped Schwung presets) is unbuilt; `preset`/`preset_count` are stubs.
- **LFO waveform** + **free-env destination** option *labels* are best-effort;
  the engine *mapping* is safe. Verify against the TAL manual on-device.
- **Bipolar params** (tunes/detune) display as -100..100 %; refine to semitones/
  cents once heard.
- **CPU**: bench 6-voice worst case before shipping (Echidna reference ~21%/core
  for a mono synth; poly will be higher).
- No aftertouch/modwheel routing yet (engine has no direct hook); revisit.

## Provenance

Engine © 2005–2010 Patrick Kunz, TAL / Togu Audio Line. GPL-2.0. Keep the
`LICENSE` and per-file headers intact; never strip GPL headers.
