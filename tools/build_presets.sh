#!/usr/bin/env bash
# Build the authored preset bank, in the order that matters.
#
#   tools/build_presets.sh [outdir]      default: dist/presets/noisemaker
#
# The three stages are NOT independent. gen_presets.mjs writes patches at their
# authored volume, which is meaningless on its own: the bank is FX-heavy by
# design and every wet stage adds gain with no limiter downstream, so levels
# land anywhere from -48 dBFS to clipping. autogain_presets.mjs is what makes
# them consistent, by measurement. Running gen alone silently produces an
# unlevelled bank that still looks fine on disk -- hence this script.
#
# Needs build/nm_render (built here if missing).
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$REPO/dist/presets/noisemaker}"
cd "$REPO"

if [ ! -x build/nm_render ]; then
    echo "=== Building nm_render ==="
    mkdir -p build
    CXX="${CXX:-c++}"
    "$CXX" -O2 -std=c++14 -fpermissive -Wno-write-strings \
        -Isrc/dsp -Isrc/dsp/Engine tools/nm_render.cpp src/dsp/Engine/Lfo.cpp \
        -o build/nm_render
fi

echo "=== Generating ==="   ; node tools/gen_presets.mjs     "$OUT"
echo "=== Levelling ==="    ; node tools/autogain_presets.mjs "$OUT" | tail -3
echo "=== Verifying ==="    ; node tools/verify_presets.mjs   "$OUT" | head -2

echo
echo "Deploy with:"
echo "  tar czf /tmp/nm_presets.tgz -C '$OUT' ."
echo "  scp /tmp/nm_presets.tgz ableton@move.local:/tmp/"
echo "  ssh ableton@move.local 'mkdir -p /data/UserData/schwung/presets/noisemaker && \\"
echo "    cd /data/UserData/schwung/presets/noisemaker && tar xzf /tmp/nm_presets.tgz'"
echo "(the host re-opendirs the preset store, so no restart is needed)"
