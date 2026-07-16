#!/usr/bin/env bash
# Build Noisemaker module for Schwung (Move, ARM64)
#
# Auto-uses Docker for cross-compilation. Set CROSS_PREFIX to skip Docker.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="move-anything-builder"
ID="noisemaker"

if [ -z "$CROSS_PREFIX" ] && [ ! -f "/.dockerenv" ]; then
    echo "=== Noisemaker Module Build (via Docker) ==="
    if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
        echo "Building Docker image (first time only)..."
        docker build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile" "$REPO_ROOT"
    fi
    echo "Running build..."
    docker run --rm \
        -v "$REPO_ROOT:/build" \
        -u "$(id -u):$(id -g)" \
        -w /build \
        "$IMAGE_NAME" \
        ./scripts/build.sh
    echo "=== Done ==="
    exit 0
fi

CROSS_PREFIX="${CROSS_PREFIX:-aarch64-linux-gnu-}"
cd "$REPO_ROOT"

echo "=== Building Noisemaker Module ==="
echo "Cross prefix: $CROSS_PREFIX"

mkdir -p build "dist/$ID"

# The TAL engine is header-only except Lfo.cpp, so both sources go on one line.
# -fpermissive: the vendored TAL sources use MSVC-isms GCC rejects by default
#   (class-qualified names in in-class member definitions, e.g. Decimator.h).
#   We keep the engine byte-verbatim for clean upstream diffs and downgrade
#   these to warnings rather than patch each site.
# -Wno-write-strings: TAL assigns string literals to char* (AudioUtils rate text).
echo "Compiling DSP plugin..."
${CROSS_PREFIX}g++ -g -O3 -shared -fPIC -std=c++14 -fpermissive -Wno-write-strings \
    src/dsp/noisemaker_plugin.cpp \
    src/dsp/Engine/Lfo.cpp \
    -o build/dsp.so \
    -Isrc/dsp \
    -Isrc/dsp/Engine \
    -lm

echo "Packaging..."
cat src/module.json > "dist/$ID/module.json"
[ -f src/help.json ] && cat src/help.json > "dist/$ID/help.json"
[ -f src/web_ui.html ] && cat src/web_ui.html > "dist/$ID/web_ui.html"
cat src/ui.js > "dist/$ID/ui.js"
cat src/canvas.js > "dist/$ID/canvas.js"
cat build/dsp.so > "dist/$ID/dsp.so"
chmod +x "dist/$ID/dsp.so"

if [ -d "src/presets" ] && ls src/presets/* &>/dev/null; then
    mkdir -p "dist/$ID/presets"
    for f in src/presets/*; do cat "$f" > "dist/$ID/presets/$(basename "$f")"; done
fi

cd dist
tar -czf "$ID-module.tar.gz" "$ID/"
cd ..

echo ""
echo "=== Build Complete ==="
echo "Output: dist/$ID/  |  Tarball: dist/$ID-module.tar.gz"
