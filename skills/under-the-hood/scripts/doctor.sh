#!/usr/bin/env bash
# Fast readiness check. Installs nothing. Prints READY (plus the paths to use) or one MISSING line per gap.
# Usage: doctor.sh [--no-tts]
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTH_HOME="${UTH_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/under-the-hood}"
PY="$UTH_HOME/tts/.venv/bin/python"
missing=()

command -v ffmpeg >/dev/null 2>&1 || missing+=("ffmpeg")
command -v ffprobe >/dev/null 2>&1 || missing+=("ffprobe (comes with ffmpeg)")
command -v python3 >/dev/null 2>&1 || missing+=("python3")
if command -v node >/dev/null 2>&1; then
  [[ -d "$UTH_HOME/node/node_modules/playwright-core" ]] || missing+=("playwright-core (node module)")
  node "$HERE/lib.js" chrome >/dev/null 2>&1 || missing+=("chrome or chromium (headless browser)")
else
  missing+=("node")
fi
if [[ "$1" != "--no-tts" ]]; then
  [[ -x "$PY" && -f "$UTH_HOME/tts/.ok" ]] || missing+=("tts (Chatterbox venv)")
fi

if (( ${#missing[@]} )); then
  for m in "${missing[@]}"; do echo "MISSING: $m"; done
  echo "Run the under-the-hood-setup skill to fix this."
  exit 1
fi
echo "READY"
echo "UTH_HOME=$UTH_HOME"
[[ "$1" != "--no-tts" ]] && echo "PY=$PY"
voices=$(ls "$UTH_HOME/voices/"*.wav 2>/dev/null)
echo "VOICES=${voices:-none saved (built-in voice only)}"
