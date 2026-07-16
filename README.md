# Noisemaker — Schwung module

A virtual-analog synth for [Schwung](https://github.com/charlesvestal/schwung)
on Ableton Move, ported from **TAL Noisemaker** by Patrick Kunz (TAL / Togu
Audio Line). 6-voice polyphony, dual oscillator + sub, ring mod, multimode
24 dB filter, two LFOs, a free modulation envelope, and chorus + reverb.

## Status

**Milestone 1 (scaffold).** DSP cross-compiles to a valid ARM64 `dsp.so`,
exposes the full parameter surface + `ui_hierarchy`, and ships an on-device
canvas Editor. Not yet deployed/heard on hardware; factory presets and fidelity
calibration are still to come. See `_worklogs/noisemaker.md` in the workspace.

## Layout

```
src/
  module.json              # id=noisemaker, sound_generator, api_version 2
  ui.js                    # root UI (preset browse + octave) via createSoundGeneratorUI
  canvas.js                # 128x64 "Editor" overlay (9 pages x 8 knobs)
  dsp/
    noisemaker_plugin.cpp  # plugin_api_v2 wrapper (host adapter)
    Engine/  Effects/      # TAL Noisemaker engine, vendored verbatim (GPLv2)
    Engine/Math.h          # port shim (see below)
scripts/{build.sh,Dockerfile,install.sh}
```

## Build

```bash
./scripts/build.sh          # cross-compiles dsp.so in Docker, packages dist/noisemaker/
```

## Port notes

The engine (`src/dsp/Engine`, `src/dsp/Effects`) is vendored **byte-verbatim**
from [Nexbit/tal-noisemaker](https://github.com/Nexbit/tal-noisemaker) so future
upstream diffs stay clean. Three portability fixes live outside the engine
sources:

1. **`Engine/Math.h` shim** — 12 engine files `#include "Math.h"`, which never
   existed; on the case-insensitive filesystems TAL was built on it silently
   resolved to the system `<math.h>`. The shim forwards to `<math.h>`/`<cmath>`.
2. **`FilterHandler.h` include casing** — it referenced `InterpolatorLinear.h`;
   the actual file is `Interpolatorlinear.h` (breaks the case-sensitive build).
3. **`-fpermissive -Wno-write-strings`** — the vendored sources use a few MSVC-isms
   GCC rejects (class-qualified names in in-class member definitions in
   `Decimator.h`; string-literal-to-`char*`), downgraded to warnings rather than
   patching each site.

## License

GPL-2.0 (see `LICENSE`). Engine © 2005–2010 Patrick Kunz, TAL / Togu Audio Line.
