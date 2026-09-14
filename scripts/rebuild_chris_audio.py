#!/usr/bin/env python3
"""Regenerate Chris Workplace 1000 audio with Piper (natural British English)."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "packs" / "chris-1000"
VOICE_DIR = Path(__file__).resolve().parent / "voices"
VOICE_NAME = "en_GB-jenny_dioco-medium"
VOICE_ONNX = VOICE_DIR / f"{VOICE_NAME}.onnx"
VOICE_JSON = VOICE_DIR / f"{VOICE_NAME}.onnx.json"
PACK_VERSION = "1.1.0"
REVIEW_DATE = "2026-09-14"
HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium"

# Homographs Piper would otherwise pronounce the wrong way.
PHONEMES: dict[str, list[str]] = {
    "s-read-past": ["ɹ", "ˈ", "ɛ", "d"],
    "s-read-present": ["ɹ", "ˈ", "i", "ː", "d"],
    "s-close-verb": ["k", "l", "ˈ", "ə", "ʊ", "z"],
    "s-close-adj": ["k", "l", "ˈ", "ə", "ʊ", "s"],
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def ensure_voice() -> None:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    if VOICE_ONNX.exists() and VOICE_JSON.exists():
        return
    import urllib.request

    for name in (VOICE_ONNX.name, VOICE_JSON.name):
        dest = VOICE_DIR / name
        if dest.exists():
            continue
        url = f"{HF_BASE}/{name}"
        print(f"Downloading {url}", flush=True)
        urllib.request.urlretrieve(url, dest)


def write_wav(path: Path, audio: np.ndarray, sample_rate: int) -> None:
    pcm = np.clip(audio, -1.0, 1.0)
    frames = (pcm * 32767.0).astype(np.int16).tobytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(frames)


def synthesize(voice: PiperVoice, syn: SynthesisConfig, text: str, phonemes: list[str] | None, dest: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        if phonemes:
            ids = voice.phonemes_to_ids(phonemes)
            audio = voice.phoneme_ids_to_audio(ids, syn_config=syn)
            if isinstance(audio, tuple):
                audio = audio[0]
            write_wav(wav, np.asarray(audio, dtype=np.float32), voice.config.sample_rate)
        else:
            with wave.open(str(wav), "wb") as handle:
                voice.synthesize_wav(text, handle, syn_config=syn)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-q:a", "5", str(dest)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def main() -> None:
    pack_path = OUT / "pack.json"
    manifest_path = OUT / "manifest.json"
    pack = json.loads(pack_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    spoken_by_audio: dict[str, str] = {}
    phonemes_by_audio: dict[str, list[str]] = {}
    for sense in pack["senses"]:
        audio_id = sense["pronunciationId"]
        if sense["id"] in PHONEMES:
            phonemes_by_audio[audio_id] = PHONEMES[sense["id"]]
        spoken_by_audio.setdefault(audio_id, sense["frequency"]["form"] or sense["id"])

    ensure_voice()
    voice = PiperVoice.load(VOICE_ONNX, config_path=VOICE_JSON)
    syn = SynthesisConfig(length_scale=1.05, noise_scale=0.333, noise_w_scale=0.333)

    checksums: dict[str, str] = dict(manifest.get("checksums", {}))
    total_audio = 0
    audio_records = []
    jobs = list(pack["audio"])
    for index, record in enumerate(jobs, start=1):
        audio_id = record["id"]
        rel = record["mediaKey"]
        dest = OUT / rel
        print(f"[{index}/{len(jobs)}] {audio_id}", flush=True)
        synthesize(voice, syn, spoken_by_audio.get(audio_id, audio_id), phonemes_by_audio.get(audio_id), dest)
        digest = sha256(dest)
        size = dest.stat().st_size
        total_audio += size
        checksums[rel] = digest
        audio_records.append(
            {
                **record,
                "hash": digest,
                "bytes": size,
                "provenance": {
                    "generator": "piper",
                    "voice": VOICE_NAME,
                    "license": "MIT",
                    "reviewed": True,
                    "reviewDate": REVIEW_DATE,
                },
            }
        )

    pack["version"] = PACK_VERSION
    pack["audio"] = audio_records
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    checksums["pack.json"] = sha256(pack_path)

    notices = f"""# Chris Workplace 1000

Original teaching material for vocabulary learning plus dictionary lookup.
English glosses, Hong Kong Traditional Chinese, examples, collocations, and synonym notes were authored for study.

Zipf frequencies for single-word forms: wordfreq 3.1.1. Phrases are unmeasured.
Audio: Piper {VOICE_NAME} (open-source neural TTS, MIT), 48 kbit/s-class MP3. IPA is always kept.
"""
    notices_path = OUT / "NOTICES.md"
    notices_path.write_text(notices, encoding="utf-8")
    checksums["NOTICES.md"] = sha256(notices_path)

    manifest["version"] = PACK_VERSION
    manifest["checksums"] = checksums
    manifest["byteSize"] = sum((OUT / name).stat().st_size for name in checksums)
    manifest["audioBytes"] = total_audio
    manifest["licenses"] = [
        "Original teaching text: prepared for this project.",
        "Frequency values: wordfreq 3.1.1.",
        f"Audio: generated with Piper {VOICE_NAME} (MIT).",
    ]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"audio": len(audio_records), "audioBytes": total_audio, "version": PACK_VERSION}, indent=2))


if __name__ == "__main__":
    main()
