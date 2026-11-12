"""Word-level timestamps for every narration clip (faster-whisper), used to time captions
to the actual speech instead of estimating from sentence length.

    ~/brutalist.art/.venv/bin/python tools/align.py projects/<video-id>
Writes projects/<video-id>/words.json: {segment_id: [{"w": word, "s": start, "e": end}, ...]}
"""
import json, sys
from pathlib import Path
from faster_whisper import WhisperModel

P = Path(sys.argv[1])
model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=2)
out = {}
for seg in json.loads((P / "script.json").read_text()):
    audio = P / "audio" / f"{seg['id']}.mp3"
    segments, _ = model.transcribe(str(audio), word_timestamps=True, vad_filter=False)
    words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segments for w in (s.words or [])]
    out[seg["id"]] = words
    print(f"{seg['id']:5} {len(words):3} words  {words[0]['s'] if words else 0:.2f}–{words[-1]['e'] if words else 0:.2f}s")
(P / "words.json").write_text(json.dumps(out, indent=1))
