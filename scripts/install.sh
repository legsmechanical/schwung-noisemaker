#!/bin/bash
# Install Noisemaker module to Move.
# Deploy over the USB-ethernet tether (preferred) or WiFi. Set MOVE_HOST to
# override (default move.local). A dsp.so swap loads fresh on next
# instantiation; if Noisemaker is currently loaded, swap it out/in or run the
# workspace scripts/restart_move.sh.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
ID="noisemaker"
MOVE_HOST="${MOVE_HOST:-ableton@move.local}"
DEST="/data/UserData/schwung/modules/sound_generators/$ID"

cd "$REPO_ROOT"

if [ ! -d "dist/$ID" ]; then
    echo "Error: dist/$ID not found. Run ./scripts/build.sh first."
    exit 1
fi

echo "=== Installing Noisemaker Module -> $MOVE_HOST ==="
ssh "$MOVE_HOST" "mkdir -p $DEST"
scp -r "dist/$ID/"* "$MOVE_HOST:$DEST/"
ssh "$MOVE_HOST" "chmod -R a+rw $DEST"

echo ""
echo "=== Install Complete ==="
echo "Installed to: $DEST"
echo "Restart / reload the module to pick it up (swap synth out/in, or restart_move.sh)."
