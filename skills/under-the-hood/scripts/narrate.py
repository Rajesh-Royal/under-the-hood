"""Generate narration clips, one WAV per scene, in the built-in voice or a cloned one.

Usage (run with the TTS venv python, PY from doctor.sh):
  $PY narrate.py --script <project>/script.json --voice <UTH_HOME>/voices/me.wav --out <project>/narration --takes 2
  $PY narrate.py --text "Quick test line." --out /tmp/tts-test                # built-in voice
Options:
  --model turbo|standard   turbo is faster, standard supports --exaggeration and --cfg
  --device cuda|mps|cpu   (default: the best available)
  --only dns,tls           regenerate just these scene ids
  --takes 3                generate N takes per line (pick the best by ear)

Writes <out>/<id>.wav (or <id>_take2.wav ...) and <out>/durations.json for the video timeline.
"""
import argparse, json, time, warnings
from pathlib import Path

warnings.filterwarnings("ignore")
import torch
import torchaudio as ta


def trim(wav, sr, head=0.04, tail=0.12, thresh=0.02):
    """Cut the model's leading and trailing silence so lines flow like speech."""
    x = wav.abs().squeeze(0)
    win = int(sr * 0.02)
    env = torch.nn.functional.max_pool1d(x[None, None], win, win).squeeze()
    loud = (env > thresh * env.max()).nonzero().squeeze(-1)
    if len(loud) == 0:
        return wav
    a = max(0, loud[0].item() * win - int(head * sr))
    b = min(x.shape[0], (loud[-1].item() + 1) * win + int(tail * sr))
    return wav[..., a:b]


def build_preview(out, lines, suffix=""):
    """Join clips with each line's own pause into one file for listening."""
    parts, sr = [], None
    for l in lines:
        f = out / f"{l['id']}{suffix}.wav"
        if not f.exists():
            continue
        w, sr = ta.load(str(f))
        parts += [w, torch.zeros(1, int(sr * l.get("gap", 0.3)))]
    if parts:
        name = out / f"narration-preview{suffix or '_take1'}.wav"
        ta.save(str(name), torch.cat(parts, dim=1), sr)
        print("preview:", name)


def default_device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model(kind, device):
    if kind == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS as M
    else:
        from chatterbox.tts import ChatterboxTTS as M
    t = time.time()
    m = M.from_pretrained(device=device)
    print(f"loaded {kind} on {device} in {time.time() - t:.1f}s")
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", help="JSON list of {id, text}")
    ap.add_argument("--text", help="single line instead of a script")
    ap.add_argument("--voice", help="reference WAV of your voice (over 5s, ideally 10 to 20s)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="turbo", choices=["turbo", "standard"])
    ap.add_argument("--device", default=default_device())
    ap.add_argument("--only", default="")
    ap.add_argument("--takes", type=int, default=1)
    ap.add_argument("--exaggeration", type=float, default=0.5, help="standard model only")
    ap.add_argument("--cfg", type=float, default=0.5, help="standard model only, lower = slower pacing")
    ap.add_argument("--temperature", type=float, default=0.9)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()

    lines = json.loads(Path(a.script).read_text()) if a.script else [{"id": "line", "text": a.text}]
    if a.only:
        keep = set(a.only.split(","))
        lines = [l for l in lines if l["id"] in keep]
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    model = load_model(a.model, a.device)
    if a.voice:
        import hashlib
        from chatterbox.tts import Conditionals
        t = time.time()
        key = hashlib.sha1(Path(a.voice).read_bytes()).hexdigest()[:12]
        cache = Path(a.voice).resolve().parent / ".cache" / f"{a.model}-{key}.pt"
        if cache.exists() and a.model == "turbo":
            model.conds = Conditionals.load(cache, map_location="cpu").to(a.device)
            print(f"voice loaded from cache in {time.time() - t:.1f}s")
        else:
            if a.model == "turbo":
                model.prepare_conditionals(a.voice)
                cache.parent.mkdir(parents=True, exist_ok=True)
                model.conds.save(cache)
            else:
                model.prepare_conditionals(a.voice, exaggeration=a.exaggeration)
            print(f"voice prepared from {a.voice} in {time.time() - t:.1f}s")

    kw = {"temperature": a.temperature}
    if a.model == "standard":
        kw.update(exaggeration=a.exaggeration, cfg_weight=a.cfg)

    dur_file = out / "durations.json"
    durations = json.loads(dur_file.read_text()) if dur_file.exists() else {}
    total_audio = total_wall = 0.0
    for line in lines:
        for k in range(a.takes):
            torch.manual_seed(a.seed + k)
            t = time.time()
            wav = trim(model.generate(line["text"], **kw), model.sr)
            wall = time.time() - t
            sec = wav.shape[-1] / model.sr
            name = line["id"] if k == 0 else f"{line['id']}_take{k + 1}"
            ta.save(str(out / f"{name}.wav"), wav.cpu(), model.sr)
            if k == 0:
                durations[line["id"]] = round(sec, 3)
            total_audio += sec; total_wall += wall
            print(f"{name:>14}: {sec:5.2f}s audio in {wall:5.2f}s  ({sec / wall:.2f}x realtime)")
    dur_file.write_text(json.dumps(durations, indent=2))
    if a.script and not a.only:
        for k in range(a.takes):
            build_preview(out, lines, "" if k == 0 else f"_take{k + 1}")
    if total_wall:
        print(f"total {total_audio:.1f}s audio in {total_wall:.1f}s  ({total_audio / total_wall:.2f}x realtime) -> {out}")


if __name__ == "__main__":
    main()
