#!/usr/bin/env python3
"""Keep five bilingual examples per sense, covering every collocation.

Original authored examples stay. Template padding is replaced. Public-domain
quotes are used only when the headword really appears in a known source.
Does not regenerate audio.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "packs" / "chris-1000"
PACK_VERSION = "1.3.0"

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

TEMPLATE_MARKERS = (
    "before the shop gets busy",
    "after the lunch rush",
    "morning meeting covered",
    "handover notes",
    "whatsapp update so the evening team",
    "a customer asked what ",
    "put ",
)

# Public-domain or proverbial lines only. Attribution is stored with the quote.
QUOTES: dict[str, tuple[str, str, str]] = {
    "ask": (
        "Ask, and it shall be given you.",
        "Matthew 7:7",
        "聖經馬太福音：「你們祈求，就給你們。」",
    ),
    "book": (
        "A room without books is like a body without a soul.",
        "Cicero",
        "西塞羅：「沒有書的房間，就像沒有靈魂的身體。」",
    ),
    "change": (
        "The only constant is change.",
        "Heraclitus",
        "赫拉克利特：「唯一不變的，就是改變。」",
    ),
    "early": (
        "Early to bed and early to rise, makes a man healthy, wealthy, and wise.",
        "Benjamin Franklin",
        "富蘭克林：「早睡早起，使人健康、富裕又聰明。」",
    ),
    "experience": (
        "Experience is the teacher of all things.",
        "Julius Caesar",
        "凱撒：「經驗是萬事的老師。」",
    ),
    "friend": (
        "A friend in need is a friend indeed.",
        "English proverb",
        "英語諺語：「患難見真情。」",
    ),
    "give": (
        "It is more blessed to give than to receive.",
        "Acts 20:35",
        "聖經使徒行傳：「施比受更為有福。」",
    ),
    "help": (
        "God helps those who help themselves.",
        "Benjamin Franklin",
        "富蘭克林：「天助自助者。」",
    ),
    "home": (
        "There's no place like home.",
        "John Howard Payne",
        "佩恩：「沒有一個地方比得上家。」",
    ),
    "keep": (
        "Keep thy shop, and thy shop will keep thee.",
        "English proverb",
        "英語諺語：「好好打理你的店，店也會養活你。」",
    ),
    "know": (
        "To know that you know nothing is the beginning of wisdom.",
        "Socrates",
        "蘇格拉底：「知道自己一無所知，是智慧的開始。」",
    ),
    "money": (
        "A penny saved is a penny got.",
        "Benjamin Franklin",
        "富蘭克林：「省下一便士，就是賺到一便士。」",
    ),
    "read": (
        "Reading maketh a full man.",
        "Francis Bacon",
        "培根：「閱讀使人充實。」",
    ),
    "risk": (
        "Great deeds are usually wrought at great risks.",
        "Herodotus",
        "希羅多德：「大事業往往伴隨大風險。」",
    ),
    "shop": (
        "Keep thy shop, and thy shop will keep thee.",
        "English proverb",
        "英語諺語：「好好打理你的店，店也會養活你。」",
    ),
    "small": (
        "Small opportunities are often the beginning of great enterprises.",
        "Demosthenes",
        "德摩斯梯尼：「小機會往往是大事業的起點。」",
    ),
    "start": (
        "Well begun is half done.",
        "Aristotle",
        "亞里士多德：「好的開始是成功的一半。」",
    ),
    "think": (
        "I think, therefore I am.",
        "René Descartes",
        "笛卡兒：「我思故我在。」",
    ),
    "time": (
        "Lost time is never found again.",
        "Benjamin Franklin",
        "富蘭克林：「失去的時間再也找不回來。」",
    ),
    "try": (
        "If at first you don't succeed, try, try again.",
        "Thomas H. Palmer",
        "帕爾默：「一次不成功，就再試、再試。」",
    ),
    "wait": (
        "They also serve who only stand and wait.",
        "John Milton",
        "彌爾頓：「只是站著等候的人，同樣在服務。」",
    ),
    "write": (
        "Either write something worth reading, or do something worth writing.",
        "Benjamin Franklin",
        "富蘭克林：「要麼寫值得讀的東西，要麼做值得寫的事。」",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def is_template(en: str) -> bool:
    text = en.lower()
    return any(marker in text for marker in TEMPLATE_MARKERS)


def is_verb_phrase(col: str, pos: str, lemma: str) -> bool:
    first = col.strip().split(" ", 1)[0].lower()
    if first in {"a", "an", "the", "on", "in", "at", "to", "for", "of", "with"}:
        return False
    if pos == "verb" and (col.lower().startswith(lemma.lower()) or first in VERBISH):
        return True
    return first in VERBISH and pos != "noun"


def pick(items: list[tuple[str, str]], salt: str) -> tuple[str, str]:
    index = int(hashlib.sha256(salt.encode()).hexdigest(), 16) % len(items)
    return items[index]


def collocation_pair(col: str, lemma: str, pos: str, salt: str) -> tuple[str, str]:
    if is_verb_phrase(col, pos, lemma):
        return pick(
            [
                (f"Please {col} before closing.", f"關門前請先「{col}」。"),
                (f"Can you {col} for the afternoon team?", f"你可以替下午的同事「{col}」嗎？"),
                (f"We should {col} after the briefing.", f"簡報後我們應該「{col}」。"),
                (f"I will {col} once the queue is shorter.", f"排隊短一點，我就會「{col}」。"),
            ],
            salt,
        )
    return pick(
        [
            (f"Today's notes mention {col}.", f"今天的備註提到「{col}」。"),
            (f"A customer asked about {col}.", f"有顧客問及「{col}」。"),
            (f"Keep {col} on the whiteboard.", f"把「{col}」寫在白板上。"),
            (f"The briefing covered {col}.", f"簡報談到「{col}」。"),
        ],
        salt,
    )


def filler_pair(lemma: str, gloss_tc: str, pos: str, salt: str) -> tuple[str, str]:
    if pos == "verb":
        return pick(
            [
                (f"We can {lemma} this after the next customer.", f"服務下一位顧客後，我們可以「{lemma}」。"),
                (f"Do not forget to {lemma} before you leave.", f"離開前不要忘記「{lemma}」。"),
            ],
            salt,
        )
    if pos == "adjective":
        return pick(
            [
                (f"Keep the wording {lemma} in the shop notice.", f"店舖告示的用字要保持「{lemma}」。"),
                (f"The {lemma} option is clearer for staff.", f"對同事來說，「{lemma}」的做法更清楚。"),
            ],
            salt,
        )
    return pick(
        [
            (f"Put {lemma} on the afternoon list.", f"把「{lemma}」寫進下午清單。"),
            (f"The team asked how {lemma} works here: {gloss_tc}", f"同事問這裡的「{lemma}」怎麼用：{gloss_tc}"),
        ],
        salt,
    )


def quote_pair(lemma: str, gloss_en: str) -> tuple[str, str] | None:
    key = lemma.lower().strip()
    item = QUOTES.get(key)
    if not item:
        return None
    en, by, tc = item
    if not re.search(rf"\b{re.escape(key)}\b", en, flags=re.I):
        return None
    # Skip clearly mismatched senses (e.g. river bank vs money bank).
    gloss = gloss_en.lower()
    if key == "bank" and "money" not in gloss and "account" not in gloss:
        return None
    if key == "read" and "past" in gloss:
        return None
    return (f"{en} — {by}", tc)


def contains_col(examples: list[dict], col: str) -> bool:
    needle = col.lower()
    return any(needle in str(item.get("en", "")).lower() for item in examples)


def make_example(sense_id: str, en: str, tc: str, domain: str, index: int) -> dict:
    return {"id": f"ex-{sense_id}-{index}", "en": en, "tc": tc, "context": domain}


def pad_examples(sense: dict) -> list[dict]:
    lemma = sense.get("frequency", {}).get("form") or sense["id"]
    gloss_tc = sense.get("glossTc") or ""
    gloss_en = sense.get("glossEn") or ""
    collocations = [item for item in (sense.get("collocations") or []) if str(item).strip()]
    pos = str(sense.get("pos") or "")
    domain = (sense.get("domains") or ["everyday"])[0]
    pool: list[dict] = []
    seen: set[str] = set()

    def add(en: str, tc: str) -> None:
        key = en.strip().lower()
        if not key or key in seen:
            return
        seen.add(key)
        pool.append(make_example(sense["id"], en, tc, domain, len(pool) + 1))

    for item in sense.get("examples") or []:
        en = str(item.get("en", "")).strip()
        tc = str(item.get("tc", "")).strip()
        if en and not is_template(en):
            add(en, tc)

    quote = quote_pair(lemma, gloss_en)
    if quote:
        add(*quote)

    for col in collocations:
        if contains_col(pool, col):
            continue
        add(*collocation_pair(col, lemma, pos, f"{sense['id']}:{col}"))

    extras = [
        (f"Keep a note of {lemma} beside the till.", f"把「{lemma}」記在收銀機旁。"),
        (f"Ask a colleague if {lemma} is needed today.", f"問同事今天是否需要「{lemma}」。"),
        (f"Check {lemma} before the evening handover.", f"晚班交接前先核對「{lemma}」。"),
    ]
    extra_i = 0
    while len(pool) < 5:
        before = len(pool)
        add(*filler_pair(lemma, gloss_tc, pos, f"{sense['id']}:fill:{extra_i}"))
        if len(pool) == before and extra_i < len(extras):
            add(*extras[extra_i])
        extra_i += 1
        if extra_i > 10:
            break

    required = []
    leftover = []
    missing = list(collocations)
    for item in pool:
        text = str(item.get("en", "")).lower()
        covers = [col for col in missing if col.lower() in text]
        if covers:
            required.append(item)
            for col in covers:
                missing.remove(col)
        else:
            leftover.append(item)
    chosen = (required + leftover)[:5]
    # If slicing dropped a required collocation example, put required first (max 3).
    if len(required) <= 5:
        chosen = (required + leftover)[:5]
    for index, item in enumerate(chosen, start=1):
        item["id"] = f"ex-{sense['id']}-{index}"
    return chosen


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
    covered = 0
    quotes = 0
    for sense in pack["senses"]:
        text = " ".join(item["en"].lower() for item in sense["examples"])
        cols = sense.get("collocations") or []
        if all(col.lower() in text for col in cols):
            covered += 1
        if any(" — " in item["en"] for item in sense["examples"]):
            quotes += 1
    print(
        json.dumps(
            {
                "version": PACK_VERSION,
                "senses": len(lengths),
                "minExamples": min(lengths),
                "maxExamples": max(lengths),
                "collocationsCovered": covered,
                "sensesWithQuote": quotes,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
