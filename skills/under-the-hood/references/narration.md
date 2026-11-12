# Writing narration that sounds human

The TTS model reads exactly what you write, with the same rhythm. Article-style sentences come out sounding like an AI reading an article. Write how a person explains something to a friend who's curious.

## What worked (from a real session)

Before, it sounded like AI:
> The moment you type the first letter, your browser needs Google's address. So it asks DNS, the phone book of the internet.

After, it sounded human:
> So the second you type that first letter, your browser's like, wait, where's Google? And it asks DNS, which is basically the internet's phone book.

Before:
> You press Enter. Your query flies to Google, and your browser cookies ride along with it.

After:
> You hit Enter, and your search flies off to Google. Oh, and your cookies? Yeah, they tag along too. [chuckle]

## Rules of thumb

- **Use contractions:** it's, you're, that's, browser's.
- **Use spoken connectors:** okay so, and now, then, oh and, basically. One per line at most, or it turns into a parody.
- **Ask questions and answer them:** "And every letter you type? That's a tiny request."
- **Mix short and long sentences.** A two-word sentence after a long one sounds natural.
- **Be concrete:** "thousands of machines search their own little piece of the index", not "distributed retrieval occurs".
- **Open and close like a person:** open with "Okay, so what actually happens when...", and close with "Pretty wild, right?" or similar.
- **Use expression tags sparingly:** `[chuckle]` after a joke. One or two per video.
- **No em dashes or semicolons.** The TTS treats them oddly. Use commas and periods for pauses.
- **Keep each line to 1 or 2 sentences,** about 3 to 8 seconds spoken. Each line belongs to one scene, so long lines make slow scenes.
- **Say numbers the way people say them:** "a fraction of a second", not "0.41 seconds".

## Takes and selection

- Generate `--takes 2`. Take 2 uses a different seed, so you get real variety.
- The user listens and picks, line by line if they want (`build_timeline.py --pick id=2`). Never claim a take sounds better. You can't hear it.
- The biggest lever on naturalness is the **voice sample**, because the model copies the delivery in it. If everything sounds stiff, suggest the user re-record 20 to 30 seconds of casual explaining (see `voice.md`), with natural pauses and "so"s, then run `prep_voice.sh` and use the new voice.
