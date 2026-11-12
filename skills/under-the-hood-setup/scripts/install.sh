#!/usr/bin/env bash
# Installs the user-level parts of under-the-hood. Safe to re-run, skips what is already done.
# It never uses sudo. System tools (ffmpeg, node, python3, uv) must already be installed,
# and the setup skill handles those per OS with the user's okay.
#
#   install.sh             everything (node module, headless Chromium, Chatterbox TTS venv)
#   install.sh --no-tts    skip the TTS venv (silent videos or music only)
#
# Env: UTH_HOME (default ~/.local/share/under-the-hood)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN="$HERE/../../under-the-hood/scripts"
UTH_HOME="${UTH_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/under-the-hood}"
PW_VERSION="1.56.1"

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1. Install it first (see the setup skill)."; exit 1; }; }
need ffmpeg; need ffprobe; need node; need npm; need python3

mkdir -p "$UTH_HOME/node" "$UTH_HOME/voices"

# 1) playwright-core, pinned, in its own folder so npm never walks up into a parent package
if [[ ! -d "$UTH_HOME/node/node_modules/playwright-core" ]]; then
  echo "installing playwright-core $PW_VERSION into $UTH_HOME/node ..."
  printf '{\n  "name": "under-the-hood-runtime",\n  "private": true,\n  "dependencies": { "playwright-core": "%s" }\n}\n' "$PW_VERSION" > "$UTH_HOME/node/package.json"
  npm install --prefix "$UTH_HOME/node" --silent --no-audit --no-fund
fi

# 2) a headless Chrome. Uses an installed Chrome if there is one, else downloads Chromium.
if chrome=$(node "$MAIN/lib.js" chrome 2>/dev/null); then
  echo "chrome: $chrome"
else
  echo "no Chrome found, downloading Playwright Chromium ..."
  (cd "$UTH_HOME/node" && node node_modules/playwright-core/cli.js install chromium)
  node "$MAIN/lib.js" chrome
fi

# 3) Chatterbox TTS in a Python 3.11 venv
if [[ "${1:-}" != "--no-tts" ]]; then
  PY="$UTH_HOME/tts/.venv/bin/python"
  if [[ ! -f "$UTH_HOME/tts/.ok" ]]; then
    need uv
    [[ -x "$PY" ]] || uv venv --python 3.11 "$UTH_HOME/tts/.venv"
    # setuptools<81 keeps pkg_resources, which Chatterbox's watermark library imports
    uv pip install --python "$PY" chatterbox-tts "setuptools<81"
    "$PY" -c "import chatterbox, perth; assert perth.PerthImplicitWatermarker; print('tts: ok')"
    date > "$UTH_HOME/tts/.ok"
  fi
  echo "PY=$PY  (the first narration run downloads about 1 GB of model weights)"
fi

echo "setup complete. UTH_HOME=$UTH_HOME"
