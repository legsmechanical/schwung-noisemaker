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
# Preset-bank import root. Deliberately OUTSIDE $DEST: a catalog update
# extracts a tarball over the module dir and an uninstall removes it, either of
# which would take the user's imported banks with it. Created here (not by the
# module) so there is an obvious empty folder to drop bank folders into.
ssh "$MOVE_HOST" "mkdir -p /data/UserData/schwung/preset-banks/noisemaker && chmod a+rwx /data/UserData/schwung/preset-banks/noisemaker" || true
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

# md5-verify every file. A truncated canvas.js from an interrupted scp once
# caused a silent "failed to load canvas" with no other symptom.
echo "Verifying..."
fail=0
for f in "dist/$ID/"*; do
    fn="$(basename "$f")"
    want="$(md5 -q "$f" 2>/dev/null || md5sum "$f" | cut -d' ' -f1)"
    got="$(ssh "$MOVE_HOST" "md5sum '$DEST/$fn' | cut -d' ' -f1")"
    if [ "$want" != "$got" ]; then echo "  MISMATCH: $fn"; fail=1; else echo "  ok  $fn"; fi
done
[ "$fail" = 0 ] || { echo "Deploy verification FAILED - not restarting."; exit 1; }

# Force a re-dlopen. The host caches each slot module's dlopen handle BY PATH
# (shadow_chain_mgmt.c early-returns on a same-path reload), so scp alone leaves
# the OLD .so mapped -- and then NEW params simply do not exist: set_param
# silently no-ops and the new keys are absent from chain_params. On device that
# reads as "the new knobs do nothing" / "custom knob destinations are missing",
# NOT as a load failure, which makes it easy to misdiagnose as a code bug.
# You cannot infer load state from the host's process start time. Verify
# behaviour, or just restart. SKIP_RESTART=1 to copy only (then swap the synth
# out/in yourself, which also forces a re-dlopen).
if [ "${SKIP_RESTART:-0}" = "1" ]; then
    echo "SKIP_RESTART=1 - swap the synth out/in to load the new dsp.so."
else
    RESTART="$(dirname "$REPO_ROOT")/scripts/restart_move.sh"
    if [ -x "$RESTART" ]; then
        echo "Restarting Move host (no reboot) to force a re-dlopen..."
        MOVE_HOST="root@${MOVE_HOST#*@}" "$RESTART"
    else
        echo "WARNING: $RESTART not found - swap the synth out/in to load the new dsp.so."
    fi
fi
