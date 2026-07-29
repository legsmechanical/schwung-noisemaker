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
- **256 factory presets**, plus **import your own preset banks** — see below
- Four **macros** (oscillator Wave sweep, Osc 2 pitch, filter/amp envelope time)
  with on-screen value readouts
- On-device canvas **Editor** with TAL-style panel grouping, a live
  filter-response curve, and oscillator/LFO waveform displays

## Importing preset banks

Copy folders of loose `.noisemakerpreset` files (the format TAL NoiseMaker
itself saves) into the module's own `presets/` folder on the device — the same
place OB-Xd takes its `.fxb` banks:

```
/data/UserData/schwung/modules/sound_generators/noisemaker/presets/
```

Each folder becomes a bank under **Preset Bank** on the module's root page,
gathering presets from its own subfolders — so a pack laid out as
`MyPack/BASS`, `MyPack/LEAD`, `MyPack/PAD` arrives as one `MyPack` bank.
Presets sitting loose in the root form a `(loose)` bank.

There is no import step and nothing to refresh: the list is rebuilt each time
you open the selector, so a folder copied over (schwung-manager's file browser
at `http://move.local:7700` is the easy way) is simply there. Presets are read
straight from disk, one file at a time.

Updating the module leaves your banks alone. **Uninstalling it deletes them**,
since they live inside the module folder — keep a copy elsewhere if they matter.

Both preset formats TAL has shipped are handled, including the older 10-item
filter encoding used before NoiseMaker 1.7.

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
    nm_import.h             # .noisemakerpreset parser (imported banks)
    param_names.h           # XML attr -> engine slot (generated from Params.h)
tools/
  gen_factory_bank.mjs      # ProgramChunk XML -> factory_bank.h
  gen_factory_splines.mjs   # <splinePoints> -> factory_splines.h
  gen_param_names.mjs       # Params.h enum -> param_names.h
  decode_program_chunk.mjs  # hex ProgramChunk -> plain XML
  nm_render.cpp             # off-device render / analysis of one patch
  bench_render.cpp          # on-device CPU benchmark
tests/{macro_test,delay_fb_test,import_test,bank_test}.cpp
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

### Tests

`build.sh` does **not** build the tests — each carries its own `g++` line in its
header comment, and they all need `src/dsp/Engine/Lfo.cpp` (the engine's only
non-header file). Running a stale test binary reports a green suite that proves
nothing.

```bash
g++ -O1 -std=c++14 -fpermissive -Wno-write-strings -Isrc/dsp -Isrc/dsp/Engine \
    tests/macro_test.cpp src/dsp/Engine/Lfo.cpp -o build/macro_test && ./build/macro_test
```

`import_test` and `bank_test` take an optional directory of `.noisemakerpreset`
files to run against a real corpus. `bank_test` builds its own scratch module
directory; point it somewhere harmless with
`-DNM_TEST_MODULE_DIR='"/some/scratch/dir"'` so it never touches a real install.

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
