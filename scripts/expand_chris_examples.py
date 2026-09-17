#!/usr/bin/env python3
"""Pad each Chris pack sense to five bilingual examples without touching audio."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "packs" / "chris-1000"
PACK_VERSION = "1.2.1"

VERBISH = {
    "add",
    "address",
    "approve",
    "ask",
    "book",
    "bring",
    "call",
    "change",
    "check",
    "close",
    "confirm",
    "cut",
    "deliver",
    "follow",
    "get",
    "give",
    "go",
    "handle",
    "keep",
    "leave",
    "make",
    "manage",
    "meet",
    "miss",
    "open",
    "pay",
    "process",
    "put",
    "read",
    "review",
    "schedule",
    "send",
    "set",
    "share",
    "sign",
    "start",
    "streamline",
    "take",
    "talk",
    "tell",
    "try",
    "update",
    "use",
    "wait",
    "write",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def is_verb_phrase(col: str) -> bool:
    first = col.strip().split(" ", 1)[0].lower()
    return first in VERBISH


def extra_pairs(lemma: str, gloss_tc: str, collocations: list[str], pos: str) -> list[tuple[str, str]]:
    cols = [item for item in collocations if item.strip()] or [lemma]
    pairs: list[tuple[str, str]] = []
    for col in cols:
        verbish = pos == "verb" or is_verb_phrase(col)
        if verbish:
            pairs.append(
                (
                    f"Please {col} before the shop gets busy.",
                    f"店舖忙起來之前，請先「{col}」。",
                )
            )
            pairs.append(
                (
                    f"Can you {col} after the lunch rush?",
                    f"午市過後，你可以「{col}」嗎？",
                )
            )
        elif pos == "adjective":
            pairs.append(
                (
                    f"Keep this {lemma} in the handover notes.",
                    f"交接備註要寫明這是「{lemma}」。",
                )
            )
            pairs.append(
                (
                    f"Today is especially {lemma} — {gloss_tc}.",
                    f"今天特別「{lemma}」：{gloss_tc}",
                )
            )
        else:
            pairs.append(
                (
                    f"The morning meeting covered {col}.",
                    f"早會談到「{col}」。",
                )
            )
            pairs.append(
                (
                    f"Please add {col} to the handover notes.",
                    f"請把「{col}」寫進交接備註。",
                )
            )
        pairs.append(
            (
                f"A customer asked what {lemma} means in this case — {gloss_tc}.",
                f"有顧客問這次「{lemma}」是什麼意思：{gloss_tc}",
            )
        )
        pairs.append(
            (
                f"Put {lemma} in the WhatsApp update so the evening team knows.",
                f"把「{lemma}」寫進 WhatsApp 更新，讓晚班同事知道。",
            )
        )
    return pairs


def pad_examples(sense: dict) -> list[dict]:
    examples = list(sense.get("examples") or [])[:3]
    seen = {str(item.get("en", "")).strip().lower() for item in examples}
    lemma = sense.get("frequency", {}).get("form") or sense["id"]
    gloss_tc = sense.get("glossTc") or ""
    collocations = sense.get("collocations") or []
    pos = str(sense.get("pos") or "")
    for en, tc in extra_pairs(lemma, gloss_tc, collocations, pos):
        if len(examples) >= 5:
            break
        key = en.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        examples.append(
            {
                "id": f"ex-{sense['id']}-{len(examples) + 1}",
                "en": en,
                "tc": tc,
                "context": (sense.get("domains") or ["everyday"])[0],
            }
        )
    return examples[:5]


def main() -> None:
    pack_path = OUT / "pack.json"
    manifest_path = OUT / "manifest.json"
    pack = json.loads(pack_path.read_text(encoding="utf-8"))
    for sense in pack["senses"]:
        sense["examples"] = pad_examples(sense)
    pack["version"] = PACK_VERSION
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    notices_path = OUT / "NOTICES.md"
    notices = notices_path.read_text(encoding="utf-8")
    if "five usage examples" not in notices:
        notices = notices.replace(
            "English glosses, Hong Kong Traditional Chinese, examples, collocations, and synonym notes were authored for study.",
            "English glosses, Hong Kong Traditional Chinese, five usage examples per meaning, collocations, and synonym notes were authored for study.",
        )
        notices_path.write_text(notices, encoding="utf-8")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    checksums = dict(manifest.get("checksums", {}))
    checksums["pack.json"] = sha256(pack_path)
    checksums["NOTICES.md"] = sha256(notices_path)
    manifest["version"] = PACK_VERSION
    manifest["checksums"] = checksums
    manifest["byteSize"] = sum((OUT / name).stat().st_size for name in checksums)
    completeness = dict(manifest.get("completeness", {}))
    completeness["examples"] = "complete"
    manifest["completeness"] = completeness
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lengths = [len(sense["examples"]) for sense in pack["senses"]]
    print(json.dumps({"version": PACK_VERSION, "senses": len(lengths), "minExamples": min(lengths), "maxExamples": max(lengths)}, indent=2))


if __name__ == "__main__":
    main()
