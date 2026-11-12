#!/usr/bin/env bash
# Create a new explainer project from the template.
# Usage: new_project.sh <project-dir> ["Page title"] [--example cookie]
# Refuses to touch an existing non-empty folder.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$HERE/../assets"
dir="${1:-}"; title="${2:-Explainer}"
[[ -n "$dir" ]] || { echo "usage: new_project.sh <project-dir> [title] [--example cookie]"; exit 1; }
if [[ -d "$dir" && -n "$(ls -A "$dir" 2>/dev/null)" ]]; then echo "refusing: $dir exists and is not empty"; exit 1; fi
mkdir -p "$dir/narration" "$dir/audio"
# escape characters that are special in a sed replacement
safe_title=$(printf '%s' "$title" | sed -e 's/[&#\\]/\\&/g')
sed "s#__TITLE__#$safe_title#" "$ASSETS/template/index.html" > "$dir/index.html"
cp "$ASSETS/template/engine.js" "$dir/engine.js"
if [[ " $* " == *" --example cookie "* ]]; then
  cp "$ASSETS/example-cookie/scenes.js" "$dir/scenes.js"
  cp "$ASSETS/example-cookie/script.json" "$dir/script.json"
else
  cp "$ASSETS/template/scenes.js" "$dir/scenes.js"
  cp "$ASSETS/template/script.json" "$dir/script.json"
fi
printf '.shots/\naudio/*-stem.wav\n*.partial.mp4\n' > "$dir/.gitignore"
echo "created $dir"
ls "$dir"
