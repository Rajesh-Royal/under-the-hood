---
name: under-the-hood
description: Make animated, narrated tech explainer videos ("what actually happens when you type X into Google", "how does HTTPS work", "what happens when you git push", "explain this code") as 1080p MP4s with hand-drawn line-art animation, local TTS narration (a built-in voice or the user's own cloned voice), a ducked music bed and sound effects synced to the visuals. Use this whenever the user wants an explainer, walkthrough, animated diagram video, "make a video about how X works", a video from their code, a social clip for X/Twitter, YouTube, Reels or Shorts about a technical concept, or wants to change narration, voice takes, timing, music or SFX of an existing explainer project, even if they don't say "skill" or "template".
argument-hint: "<topic, e.g. what happens when you git push>"
---

# Under the hood

Turns a topic (or the user's code) into a narrated, animated explainer. The look is warm and hand-drawn:
- a cream dot-grid "paper" background with ink line art
- blue for requests, orange for responses, green for encrypted or success
- a step tracker at the top and big captions at the bottom
- packets that fly between boxes, and camera pans between "worlds"

The reference result is `${CLAUDE_SKILL_DIR}/assets/example-cookie/`, which shows what happens when you type "cookie" into Google. Open its `scenes.js` whenever you need a pattern for something complex.

Everything is code driven. A canvas page renders frames deterministically, narration clips set each scene's length, and the music and sound effects are synthesized from the same timeline. A script change re-syncs everything, and a 60-second video renders in about 30 seconds.

Topic requested: $ARGUMENTS

## Where things live

- **Scripts:** `${CLAUDE_SKILL_DIR}/scripts/` (call it `SCRIPTS`).
- **Runtime:** `UTH_HOME` (default `~/.local/share/under-the-hood`) holds the node module, the TTS venv and saved voices. `doctor.sh` prints the exact paths, including `PY` (the TTS Python).
- **Projects:** `./explainers/<slug>/` in the current working directory, unless the user names another place. If the working directory is the home folder, ask where to put it instead of cluttering `~`.

A project folder looks like this:
```
index.html  engine.js  scenes.js  script.json  timeline.js
narration/  (voice clips: <id>.wav, <id>_take2.wav, plus preview files)
audio/      (stems and mix.wav)
.shots/     (screenshots, one new folder per run)
<slug>.mp4
```

## Workflow

### 0. Check the setup (one line when ready)
```bash
bash ${CLAUDE_SKILL_DIR}/scripts/doctor.sh          # add --no-tts if the video has no narration
```
If it prints `READY`, note `PY` and `VOICES` and move on. If it prints `MISSING` lines, load the `under-the-hood-setup` skill and follow it, then run the doctor again.

### 1. Short intake
If `$ARGUMENTS` is empty, ask for the topic. Then ask only what you can't reasonably decide, in one message, with sensible defaults:
- **Angle**, only when the topic is broad. "How the internet works" needs a focus, "what happens when you git push" doesn't.
- **Voice:** always offer this, because users don't know their own voice is an option. Present it like:
  1. built-in voice (default, works right away)
  2. a saved voice, if `VOICES` lists one
  3. **your own voice**: record about 20 to 30 seconds on your phone and send the file. Your voice stays on your machine.
  4. no narration (music and sound effects only)

  If they pick their own voice, read `${CLAUDE_SKILL_DIR}/references/voice.md` and give them its recording tips and sample paragraph before anything else. They can record while you write the storyboard.
- **Length:** default 30 to 60 seconds, 16:9.

Don't turn this into a questionnaire. Two or three short questions at most.

### 2. Understand the topic and get the facts right
If the user gave code, read it and trace the real flow. Tech viewers will call out mistakes. So:
- Get the order of events right. Example: on a page already loaded, DNS and the TLS handshake already happened, so place them on first contact or label them "first visit".
- Prefer what modern systems actually do. Example: Chrome talks to Google over QUIC and TLS 1.3, not a textbook TCP three-way handshake.
- Say "simplified" in a subcaption when you simplify.
- Use illustrative values (example IPs, `.example` domains, made-up scores) and avoid fake precision like exact millisecond counts.
- Don't recreate logos or pixel-exact UIs of real products. Line-art stand-ins fit the style better anyway.

### 3. Storyboard and script, then get approval before building
Plan 4 to 8 numbered steps, roughly 30 to 60 seconds, plus a `title` scene first and an `end` scene last. For each scene write:
- **Narration** (`script.json`): `{"id", "text", "gap"}`. `gap` is the pause after the line, 0.25 to 0.45 seconds.
- **Caption** (`cap`): 8 words or fewer, readable when muted. **Subcaption** (`sub`): one short line.
- **Visual beat:** what appears and moves, and what each sound is.

Read `${CLAUDE_SKILL_DIR}/references/narration.md` before writing narration. Article-style narration sounds like AI reading an article. Write the way a person explains to a friend.

Show the user the script and storyboard as a short table and wait for a go-ahead. Changing words now is free. After voice generation it costs a re-run.

No em dashes and no semicolons in narration or on-screen text. The TTS reads them oddly, and short sentences sound more natural anyway.

### 4. Scaffold
```bash
bash SCRIPTS/new_project.sh ./explainers/<slug> "<Page title>"
```
This copies `engine.js`, a starter `scenes.js` (a small working "hit send" example) and `script.json`. It refuses to overwrite a non-empty folder. Replace the starter content with the real storyboard.

### 5. Build scenes.js
Read `${CLAUDE_SKILL_DIR}/references/engine-api.md` first. It covers the time model, every helper, the layout zones, the sound names and the boot config. Key ideas:
- `defineScenes([...])` with design durations. Animate in **design time** with `prog(t, S.id + a, S.id + b)`. The engine stretches each scene to fit its voice clip, so never hand-tune to clip lengths.
- Keep the world inside y 150 to 800. The tracker sits above that and the captions below.
- Things that should persist (a browser, a server) appear in one scene and stay drawn after it.
- For a second "place", like inside a data center, draw at x + 1920 and pan with `camera(t)`. Start revealing its contents during the pan so the screen is never empty mid-move.
- Every visible event gets a sound in `sfx(add)`. Keys get `key`, flying packets get `whoosh*`, arrivals get `thunk` or `pop`, success gets `chime` or `success`. This is a big part of why it feels finished.

### 6. Preview without voice, check frames
```bash
node SCRIPTS/shots.js <project>            # middle of every scene, saved to a fresh .shots/<time>/ folder
```
Look at every screenshot. Downscale before reading (`sips -Z 960` on macOS, `ffmpeg -i in.png -vf scale=960:-1 out.png` elsewhere). Check for:
- text that overlaps or runs off the edges
- empty frames during pans
- elements drawn on top of things they should sit behind

Fix and re-shoot. If the page fails to boot, the script prints the page errors.

### 7. Voice
Built-in voice (no `--voice`):
```bash
$PY SCRIPTS/narrate.py --script <project>/script.json --out <project>/narration --takes 2
```
A saved voice: add `--voice <UTH_HOME>/voices/<name>.wav`.

A new voice from a recording: follow `${CLAUDE_SKILL_DIR}/references/voice.md`. It covers `prep_voice.sh`, a quick test line, and consent. Only clone the user's own voice, or a voice they confirm they have consent to use.

Then have the user listen: `<project>/narration/narration-preview_take1.wav` (use `open` on macOS, `xdg-open` on Linux).
- The first run downloads about 1 GB of model weights. After that it runs around realtime on Apple Silicon or a GPU, slower on CPU.
- **You cannot hear audio.** Tell the user that, and ask them to judge the takes by ear. They can mix takes line by line. Redo a single line with `--only <id>`.
- Turbo supports tags like `[chuckle]`, `[laugh]`, `[sigh]`, `[gasp]` and `[surprised]`. Use at most one or two per video.

No narration: skip this step and `build_timeline.py`. Scenes keep their design durations, and the video gets music and sound effects only.

### 8. Timeline, render, verify
```bash
python3 SCRIPTS/build_timeline.py <project> [--pick dns=2,enter=2]
node SCRIPTS/render.js <project> [--music-db -12] [--sfx-db 1] [--silent] [--audio-only]
```
`render.js` builds the voice, music and sfx stems and mixes them, ducking the music under the voice and normalizing to -16 LUFS. It renders to `<slug>.partial.mp4` and only renames that to `<slug>.mp4` after ffprobe confirms the full length.

Before telling the user it's done, verify the actual file:
- ffprobe shows the expected duration plus video and audio streams
- `ffmpeg -ss <late time> -frames:v 1` shows the right scene
- the loudness is about -16 LUFS

Then open the MP4 and the `index.html` preview. The preview plays the mix in sync, with chapters and scrubbing.

Report plainly what was verified, what you couldn't check (how the audio sounds), and which parts are simplified.

## Working rules

- **No glob deletes.** Don't run `rm` with wildcards or `rm -rf` on project folders. New outputs go to fresh folders, and files get overwritten by name.
- **A stopped command may have partly run.** If the user stops a multi-step command, check what changed on disk before going on, and tell them about any partial effects. A half-swapped set of clips can leave a short partial video that looks finished.
- **Don't auto-switch on preference hints.** If the user says "I like take 2" while still deciding, confirm before re-rendering.
- **Offer, don't build:** a 9:16 vertical version, trimming to 30 seconds, or more polish. Mention them in one line each.

## Troubleshooting

- `'NoneType' object is not callable` at `PerthImplicitWatermarker`: run `uv pip install --python $PY "setuptools<81"`. Chatterbox's watermark library needs `pkg_resources`.
- The first TTS run is slow: that's warmup and the model download. Later runs are faster.
- Music too loud or quiet: `--music-db` (default -12). Effects: `--sfx-db` (default 1). Use `--audio-only` to iterate on the mix quickly.
- Chrome not found: set `CHROME_PATH`, or load the `under-the-hood-setup` skill.
- Chrome's offline audio is not bit-identical from run to run, so stems differ slightly between renders. Timing is exact and frames are pixel-identical.
