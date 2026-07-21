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
# Copy each file to a temp name then atomic mv -f. Scp'ing DIRECTLY over a live
# dlopen'd dsp.so overwrites the mapped inode in place and wedges the host; the
# temp+mv keeps the running module on its old inode and lands the new file
# cleanly (next instantiation picks it up). Same reason the manager deploy does
# this. After deploy, restart via the workspace scripts/restart_move.sh.
for f in "dist/$ID/"*; do
    fn="$(basename "$f")"
    scp -q "$f" "$MOVE_HOST:$DEST/$fn.new"
    ssh "$MOVE_HOST" "mv -f '$DEST/$fn.new' '$DEST/$fn' && chmod a+rw '$DEST/$fn'"
done

echo ""
echo "=== Install Complete ==="
echo "Installed to: $DEST"
echo "Restart / reload the module to pick it up (swap synth out/in, or restart_move.sh)."
