# Noisemaker — Schwung module

A virtual-analog synth for [Schwung](https://github.com/charlesvestal/schwung)
on Ableton Move, ported from **TAL NoiseMaker** by Patrick Kunz (TAL / Togu
Audio Line).

- 6-voice polyphony; dual oscillator + sub, ring mod, FM, oscillator sync,
  bitcrush, vintage noise
- 12 multimode filters — LP24/18/12/6, HP24, BP24, Notch, State-Variable
  LP/HP/BP, and two Moog models — with drive
- Filter and amp ADSR, a free AD envelope, and TAL's spline **Envelope Editor**
  as a tempo-synced modulation source
- Two tempo-syncable LFOs; velocity and pitch-wheel routing
- Chorus, reverb, and delay
- **256 factory presets**
- On-device canvas **Editor** with TAL-style panel grouping, a live
  filter-response curve, and oscillator/LFO waveform displays

## Install

Install from the [Schwung module catalog](https://github.com/charlesvestal/schwung)
via **schwung-manager** (`http://move.local:7700`), or grab the latest
[release](https://github.com/legsmechanical/schwung-noisemaker/releases) tarball.

## Layout

```
src/
  module.json               # id=noisemaker, sound_generator, api_version 2
  ui.js                     # root UI (preset browse + octave) via createSoundGeneratorUI
  canvas.config.js          # canvas Editor source (schwung-canvaskit config)
  canvas.js                 # generated 128x64 Editor overlay (committed)
  dsp/
    noisemaker_plugin.cpp   # plugin_api_v2 wrapper (host adapter)
    Engine/  Effects/       # TAL NoiseMaker engine, vendored verbatim (GPLv2)
    EnvelopeEditor/         # spline mod-envelope, ported JUCE-free (juce_shim.h)
    factory_bank.h          # 256 factory presets (generated)
    factory_splines.h       # per-preset envelope shapes (generated)
tools/
  gen_factory_bank.mjs      # ProgramChunk XML -> factory_bank.h
  gen_factory_splines.mjs   # <splinePoints> -> factory_splines.h
  decode_program_chunk.mjs  # hex ProgramChunk -> plain XML
  bench_render.cpp          # on-device CPU benchmark
scripts/{build.sh,Dockerfile,install.sh}
```

## Build & deploy

```bash
./scripts/build.sh                                  # cross-compile dsp.so in Docker -> dist/noisemaker/ + tarball
MOVE_HOST=ableton@move.local ./scripts/install.sh   # deploy to the Move (atomic temp+mv)
```

`install.sh` copies each file via a temp name + `mv -f` so it never overwrites a
live `dsp.so` in place. After deploying, reload the module (swap the slot synth
out and back in, or run the workspace `scripts/restart_move.sh`).

To regenerate the on-device Editor after editing `src/canvas.config.js`:

```bash
node ../schwung-canvaskit/build.mjs src/canvas.config.js src/canvas.js
```

## Port notes

The engine (`src/dsp/Engine`, `src/dsp/Effects`) is vendored **byte-verbatim**
from the [DISTRHO-Ports](https://github.com/DISTRHO/DISTRHO-Ports) TAL NoiseMaker
source (the current TAL codebase) so upstream diffs stay clean. Notes:

- **Normalized param model.** Every engine setter takes a normalized `0..1`
  value — continuous params *and* enums (which convert internally via
  `calcComboBoxValue`). The wrapper stores normalized values and converts only
  at the display boundary.
- **Envelope Editor ported JUCE-free.** The stock spline envelope depends on
  JUCE (`Array`, `juce::Point`); `src/dsp/EnvelopeEditor/juce_shim.h` provides
  minimal replacements so the DSP builds without JUCE. The drawable editor UI is
  not included — the shape is fixed per preset; Amount, Speed, and Destination
  are controllable.
- **Factory data is generated.** Presets are decoded from the engine's
  `ProgramChunk` (hex-encoded XML) into `factory_bank.h`, with per-preset
  envelope shapes in `factory_splines.h`. Filter-type indices are remapped from
  the presets' 10-slot scheme to the engine's 12 filters.
- **`-fpermissive -Wno-write-strings`** — the vendored sources use a few
  MSVC-isms GCC rejects (class-qualified names in in-class member definitions in
  `Decimator.h`; string-literal-to-`char*`), downgraded to warnings rather than
  patched.

## License

GPL-2.0 (see `LICENSE`). Engine © 2005–2010 Patrick Kunz, TAL / Togu Audio Line.
