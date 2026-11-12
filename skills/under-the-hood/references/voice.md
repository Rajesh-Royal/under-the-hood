# Recording a voice sample

Show the user this guide, trimmed to what they need, when they pick "my own voice". The model copies the delivery of the sample, not only the sound of it. A stiff, read-aloud sample gives stiff narration. A relaxed sample gives relaxed narration.

## What to tell the user

**Length:** 20 to 30 seconds. The model listens mostly to the first 10 seconds, so start talking right away and make the opening the cleanest part. `prep_voice.sh` keeps up to 25 seconds.

**Where and how:**
- A quiet room, with no music, TV, fan or echo. A small room with soft furnishings beats a big empty one.
- A phone voice memo app is fine. Hold it about a hand's width from the mouth, slightly to the side so breaths don't pop.
- Any format works: m4a, mp3, wav, even a video file.

**How to talk:** like explaining something to a curious friend, not reading a script. Normal speed, natural pauses, and a few "so"s and "okay"s are good. The narration will sound however the sample sounds.

**What to say:** either talk freely about something they know well, or read this out loud in a relaxed way:

> Okay, so here's the thing about the internet. Every time you open a page, your browser quietly sends out dozens of tiny requests. Most of them come back in a fraction of a second, and you never notice. It's kind of wild, right? There's a whole conversation happening that you never see. So today, let's slow it down and actually watch what happens.

**Avoid:** whispering, shouting, a "radio voice", long silences, laughing over words, and background voices.

## After they send the file

```bash
bash SCRIPTS/prep_voice.sh <their-recording> <name>      # name defaults to "me"
```
It trims silence, removes rumble, evens out the loudness and saves `UTH_HOME/voices/<name>.wav`. Later videos can reuse it, and `doctor.sh` lists it under `VOICES`.

Then generate one test line before the full script, so they can judge quickly:
```bash
$PY SCRIPTS/narrate.py --text "Okay, so what actually happens when you hit send?" --voice UTH_HOME/voices/<name>.wav --out <project>/narration/voice-test
```
Ask them to listen. If it sounds off, the fix is almost always a better sample, not different settings.

## Consent

Only clone the user's own voice, or a voice they confirm they have permission to use. Never clone a public figure or someone who hasn't agreed. Chatterbox adds an inaudible watermark to all generated audio.
