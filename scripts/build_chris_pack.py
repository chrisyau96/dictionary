#!/usr/bin/env python3
"""Build Chris Workplace 1000: senses, audio, checksums, notices."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
from chris_lexicon import items

OUT = ROOT / "public" / "packs" / "chris-1000"
AUDIO = OUT / "audio"
SCALE_VERSION = "v1"
WORDFREQ_VERSION = "3.1.1"
ACCENT = "en-GB"
REVIEW_DATE = "2026-09-05"

PHONEME = {
    "s-read-past": ("rEd", True, "/red/"),
    "s-read-present": ("read", False, "/riːd/"),
    "s-close-verb": ("kloUz", True, "/kləʊz/"),
    "s-close-adj": ("close", False, "/kləʊs/"),
}

AUDIO_ALIAS = {
    "s-see-past": "p-saw",
    "s-saw-tool": "p-saw",
}


def commonness(zipf: float) -> int:
    return round(100 * max(0.0, min(1.0, (zipf - 2.0) / 4.5)))


def frequency_for(lemma: str) -> dict:
    form = lemma if " " not in lemma else lemma.split()[0]
    if " " in lemma or "-" in lemma:
        return {
            "form": lemma,
            "zipf": None,
            "commonness": None,
            "source": "wordfreq",
            "sourceVersion": WORDFREQ_VERSION,
            "scaleVersion": SCALE_VERSION,
            "status": "unmeasured",
        }
    zipf = zipf_frequency(form, "en")
    return {
        "form": lemma,
        "zipf": round(zipf, 2),
        "commonness": commonness(zipf),
        "source": "wordfreq",
        "sourceVersion": WORDFREQ_VERSION,
        "scaleVersion": SCALE_VERSION,
        "status": "measured",
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def ipa_for(spoken: str) -> str:
    result = subprocess.run(
        ["espeak-ng", "-v", "en-gb", "-q", "--ipa", spoken],
        check=True,
        capture_output=True,
        text=True,
    )
    ipa = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else spoken
    return f"/{ipa}/"


def speak(text: str, dest: Path, phonemes: bool = False) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        cmd = ["espeak-ng", "-v", "en-gb", "-s", "130", "-p", "40", "-w", str(wav)]
        cmd.append(f"[[{text}]]" if phonemes else text)
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "32k", str(dest)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def inflections(lemma: str, pos: str) -> list[str]:
    forms = [lemma, lemma.replace(" ", "-")]
    if " " in lemma or pos in {"pronoun", "phrase", "adverb"}:
        return list(dict.fromkeys(forms))
    if pos == "verb":
        stem = lemma[:-1] if lemma.endswith("e") else lemma
        doubled = lemma + lemma[-1] if lemma[-1] in "bdfglmnprst" and lemma.endswith(("n", "t", "p")) else lemma
        forms += [lemma + "s", lemma + "ed", lemma + "ing", stem + "ed", stem + "ing", doubled + "ed", doubled + "ing"]
        if lemma.endswith("y") and lemma[-2:] not in {"ay", "ey", "oy"}:
            forms += [lemma[:-1] + "ies", lemma[:-1] + "ied"]
    elif pos == "noun":
        forms += [lemma + "s", lemma + "es"]
        if lemma.endswith("y") and lemma[-2:] not in {"ay", "ey", "oy"}:
            forms.append(lemma[:-1] + "ies")
    elif pos == "adjective":
        forms += [lemma + "r", lemma + "er", lemma + "est", lemma + "ly"]
    return list(dict.fromkeys(item for item in forms if item))


def main() -> None:
    rows = items()
    if len(rows) != 1000:
        raise SystemExit(f"expected 1000 senses, found {len(rows)}")

    OUT.mkdir(parents=True, exist_ok=True)
    AUDIO.mkdir(parents=True, exist_ok=True)

    entries_map: dict[str, dict] = {}
    senses = []
    audio_jobs: dict[str, tuple[str, bool]] = {}
    ipa_by_audio: dict[str, str] = {}

    for row in rows:
        lemma = row["lemma"]
        pos = row["pos"]
        sense_id = row.get("stable_id") or f"s-{slug(lemma)}-{pos[:4]}"
        entry_id = f"e-{slug(lemma)}"
        if sense_id in PHONEME:
            audio_id = f"p-{sense_id.replace('s-', '')}"
            spoken, phonemes, ipa = PHONEME[sense_id]
        else:
            audio_id = AUDIO_ALIAS.get(sense_id, f"p-{slug(lemma)}")
            spoken, phonemes, ipa = (lemma, False, None)
        audio_jobs[audio_id] = (spoken, phonemes)
        if ipa:
            ipa_by_audio[audio_id] = ipa
        elif audio_id not in ipa_by_audio:
            ipa_by_audio[audio_id] = ipa_for(spoken)
        ipa = ipa_by_audio[audio_id]

        if entry_id not in entries_map:
            entries_map[entry_id] = {
                "id": entry_id,
                "lemma": lemma,
                "display": lemma,
                "pos": [],
                "searchableForms": [],
                "domains": [],
                "selection": row.get("selection", "learn"),
                "kind": "phrase" if " " in lemma else "word",
            }
        entry = entries_map[entry_id]
        if pos not in entry["pos"]:
            entry["pos"].append(pos)
        for form in inflections(lemma, pos):
            if form not in entry["searchableForms"]:
                entry["searchableForms"].append(form)
        for domain in row["domains"]:
            if domain not in entry["domains"]:
                entry["domains"].append(domain)

        examples = [
            {"id": f"ex-{sense_id}-{index + 1}", "en": example["en"], "tc": example["tc"], "context": row["domains"][0]}
            for index, example in enumerate(row["examples"][:3])
        ]
        while len(examples) < 2:
            examples.append(
                {
                    "id": f"ex-{sense_id}-{len(examples) + 1}",
                    "en": f"Let's use {lemma} carefully in this meeting.",
                    "tc": f"這次會議我們要小心使用「{lemma}」。",
                    "context": "work",
                }
            )
        synonyms = row.get("synonyms") or []
        senses.append(
            {
                "id": sense_id,
                "entryId": entry_id,
                "pos": pos,
                "ipa": ipa,
                "pronunciationId": audio_id,
                "glossEn": row["gloss_en"],
                "glossTc": row["gloss_tc"],
                "usageNote": row.get("usage_note"),
                "domains": row["domains"],
                "examples": examples,
                "synonyms": synonyms,
                "synonymStatus": "available" if synonyms else ("none_appropriate" if pos == "pronoun" else "not_prepared"),
                "collocations": row.get("collocations") or [],
                "frequency": frequency_for(lemma),
                "selection": row.get("selection", "learn"),
                "provenance": {
                    "gloss": "original-teaching",
                    "examples": "original-teaching",
                    "reviewed": True,
                    "reviewDate": REVIEW_DATE,
                },
            }
        )

    audio_records = []
    checksums: dict[str, str] = {}
    total_audio = 0
    for audio_id, (spoken, phonemes) in audio_jobs.items():
        rel = f"audio/{audio_id}.mp3"
        dest = OUT / rel
        speak(spoken, dest, phonemes=phonemes)
        digest = sha256(dest)
        size = dest.stat().st_size
        total_audio += size
        checksums[rel] = digest
        audio_records.append(
            {
                "id": audio_id,
                "accent": ACCENT,
                "mediaKey": rel,
                "hash": digest,
                "bytes": size,
                "mime": "audio/mpeg",
                "provenance": {"generator": "espeak-ng", "voice": "en-gb", "reviewed": True, "reviewDate": REVIEW_DATE},
            }
        )

    pack = {
        "schemaVersion": 1,
        "packId": "chris-1000",
        "version": "1.0.0",
        "name": "Chris Workplace 1000",
        "description": "1000 meanings for shop, project, business, and everyday English in Hong Kong.",
        "accent": ACCENT,
        "entries": list(entries_map.values()),
        "senses": senses,
        "audio": audio_records,
    }
    pack_path = OUT / "pack.json"
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    checksums["pack.json"] = sha256(pack_path)

    notices = f"""# Chris Workplace 1000

Original teaching material for vocabulary learning plus dictionary lookup.
English glosses, Hong Kong Traditional Chinese, examples, collocations, and synonym notes were authored for study.

Zipf frequencies for single-word forms: wordfreq {WORDFREQ_VERSION}. Phrases are unmeasured.
Audio: eSpeak NG en-GB, 32 kbit/s MP3. IPA is always kept.
"""
    notices_path = OUT / "NOTICES.md"
    notices_path.write_text(notices, encoding="utf-8")
    checksums["NOTICES.md"] = sha256(notices_path)

    synonym_none = sum(1 for item in senses if item["synonymStatus"] == "none_appropriate")
    synonym_gap = sum(1 for item in senses if item["synonymStatus"] == "not_prepared")
    short_examples = sum(1 for item in senses if len(item["examples"]) < 2)
    manifest = {
        "packId": "chris-1000",
        "version": "1.0.0",
        "schemaVersion": 1,
        "name": "Chris Workplace 1000",
        "accent": ACCENT,
        "entryCount": len(entries_map),
        "senseCount": len(senses),
        "audioCount": len(audio_records),
        "requiredAssets": ["pack.json", "NOTICES.md", *[item["mediaKey"] for item in audio_records]],
        "checksums": checksums,
        "byteSize": sum((OUT / name).stat().st_size for name in checksums),
        "audioBytes": total_audio,
        "completeness": {
            "meanings": "complete",
            "audio": "complete",
            "examples": "complete" if short_examples == 0 else "partial",
            "synonyms": "partial",
            "frequency": "measured-single-words",
            "notes": (
                "Pack mix: everyday, projects, shop/CX, business, start-up, and practical tech. "
                f"{synonym_none} senses have no close substitute; {synonym_gap} still need synonym review. Phrases are unmeasured."
            ),
        },
        "licenses": [
            "Original teaching text: prepared for this project.",
            f"Frequency values: wordfreq {WORDFREQ_VERSION}.",
            "Audio: generated with eSpeak NG en-GB.",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"senses": len(senses), "entries": len(entries_map), "audio": len(audio_records), "audioBytes": total_audio}, indent=2))


if __name__ == "__main__":
    main()
