#!/usr/bin/env bash
# Clean up a voice recording for cloning: any format in (m4a, mp3, wav, mov), clean mono WAV out.
# Usage: prep_voice.sh <recording.m4a|mp3|wav> [name]
# Writes $UTH_HOME/voices/<name>.wav (name defaults to "me").
# Chatterbox mainly listens to the first ~10 seconds, so those should be the cleanest speech.
set -euo pipefail
UTH_HOME="${UTH_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/under-the-hood}"
in="${1:-}"; name="${2:-me}"
[[ -f "$in" ]] || { echo "usage: prep_voice.sh <recording> [name]"; exit 1; }
out="$UTH_HOME/voices/$name.wav"
mkdir -p "$(dirname "$out")"
ffmpeg -v error -y -i "$in" -ac 1 -ar 24000 \
  -af "highpass=f=70,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2,areverse,loudnorm=I=-20:TP=-2:LRA=11" \
  -t 25 "$out"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
echo "wrote $out (${dur}s)"
(( ${dur%.*} >= 6 )) || echo "WARNING: under 6 seconds. Record at least 10 to 20 seconds."
ffmpeg -hide_banner -i "$out" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume" || true
