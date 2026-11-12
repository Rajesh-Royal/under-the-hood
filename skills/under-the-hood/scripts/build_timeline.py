"""Write <project>/timeline.js so each scene stretches to fit its narration clip.

Usage:
  python3 build_timeline.py <project>                      # take 1 for every line
  python3 build_timeline.py <project> --pick dns=2,enter=2 # mix takes line by line

Reads <project>/script.json (list of {id, text, gap}) and <project>/narration/<id>.wav
(take 2 is <id>_take2.wav). Clip lengths come from ffprobe, so they always match the files.
"""
import argparse, json, subprocess
from pathlib import Path

LEAD = {"title": 0.6}   # seconds of picture before the voice starts in a scene (default 0.35)
TAIL = {"end": 1.6}     # hold after the last word (default is the line's "gap", else 0.3)


def dur(p):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]).decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--pick", default="", help="id=take pairs, e.g. dns=2,enter=3")
    a = ap.parse_args()
    proj = Path(a.project).resolve()
    script = json.loads((proj / "script.json").read_text())
    picks = dict(p.split("=") for p in a.pick.split(",") if p)
    scenes, total = {}, 0.0
    for line in script:
        i = line["id"]
        take = int(picks.get(i, 1))
        rel = f"narration/{i}.wav" if take == 1 else f"narration/{i}_take{take}.wav"
        if not (proj / rel).exists():
            raise SystemExit(f"missing {rel}. Run narrate.py first (with --takes {take} for take {take}).")
        lead = LEAD.get(i, 0.35)
        d = round(lead + dur(proj / rel) + TAIL.get(i, line.get("gap", 0.3)), 3)
        scenes[i] = {"lead": lead, "clip": rel, "dur": d, "take": take}
        total += d
    tl = {"scenes": scenes, "audio": "audio/mix.wav"}
    (proj / "timeline.js").write_text("window.TIMELINE = " + json.dumps(tl, indent=2) + ";\n")
    print(f"timeline.js written: {len(scenes)} scenes, voice needs {total:.1f}s "
          f"(scenes never get shorter than their design duration)")
    print("takes:", ", ".join(f"{k}={v['take']}" for k, v in scenes.items()))


if __name__ == "__main__":
    main()
