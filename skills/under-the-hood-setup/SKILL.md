---
name: under-the-hood-setup
description: Installs and repairs everything the under-the-hood explainer video skill needs (ffmpeg, Node, a headless Chrome, uv and the local Chatterbox TTS venv) on macOS, Linux or WSL. Use when under-the-hood's doctor.sh prints MISSING lines, when the user asks to set up, install, update or fix under-the-hood, or when narration or rendering fails because a tool is missing.
---

# Under the hood: setup

Get the machine ready, then hand back to the `under-the-hood` skill. Keep it quick and ask before installing system packages.

Paths:
- `INSTALL` = `${CLAUDE_SKILL_DIR}/scripts/install.sh` (user-level installs, never uses sudo)
- `DOCTOR` = `${CLAUDE_SKILL_DIR}/../under-the-hood/scripts/doctor.sh`
- Everything goes in `UTH_HOME` (default `~/.local/share/under-the-hood`). Nothing is written into the project or the skill folder.

## 1. See what's missing
```bash
bash DOCTOR
uname -s; [ -f /etc/os-release ] && . /etc/os-release && echo "$ID $ID_LIKE"; grep -qi microsoft /proc/version 2>/dev/null && echo WSL
```

## 2. System tools (ask first)
Only for the tools the doctor listed. Show the user the exact command and get a yes before running it. Package managers change their machine, and `sudo` needs their password.

| OS | ffmpeg | node + npm | python3 | uv |
|---|---|---|---|---|
| macOS (Homebrew) | `brew install ffmpeg` | `brew install node` | `brew install python` | `brew install uv` |
| Debian, Ubuntu, WSL | `sudo apt-get install -y ffmpeg` | `sudo apt-get install -y nodejs npm` | `sudo apt-get install -y python3` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Fedora | `sudo dnf install -y ffmpeg-free` | `sudo dnf install -y nodejs npm` | `sudo dnf install -y python3` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Arch | `sudo pacman -S --needed ffmpeg` | `sudo pacman -S --needed nodejs npm` | `sudo pacman -S --needed python` | `sudo pacman -S --needed uv` |

Notes:
- macOS without Homebrew: point the user to https://brew.sh and stop until it's installed. Don't install Homebrew yourself.
- Node must be 18 or newer (`node -v`). If the distro's Node is older, suggest https://nodejs.org or `nvm`.
- uv brings its own Python 3.11 for the TTS venv, so the system `python3` version doesn't matter much.
- Native Windows isn't supported. Suggest WSL (Ubuntu) and follow the Debian row.
- Other systems: tell the user which tools are needed and let them install them.

If the user only wants silent or music-only videos, skip uv and pass `--no-tts` below.

## 3. User-level installs (no prompt needed)
```bash
bash INSTALL            # or: bash INSTALL --no-tts
```
This installs `playwright-core` (pinned), uses an installed Chrome or downloads Playwright Chromium, and creates the Chatterbox TTS venv. It's safe to re-run and skips finished parts. The TTS install pulls PyTorch and can take a few minutes on the first run. Run it in the background and tell the user it's working.

On Linux, if Chromium fails to launch because of missing shared libraries, run (with the user's okay) `cd UTH_HOME/node && sudo node node_modules/playwright-core/cli.js install-deps chromium`.

## 4. Confirm and hand back
Run `bash DOCTOR` again. When it prints `READY`, tell the user setup is done in one line and continue with the `under-the-hood` workflow where it left off.

Optional, only if the user wants their own voice: they record 15 to 20 seconds of relaxed explaining (any format), then:
```bash
bash ${CLAUDE_SKILL_DIR}/../under-the-hood/scripts/prep_voice.sh <recording> me
```
Only clone the user's own voice, or one they confirm they have consent to use.
