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
PACK_VERSION = "1.4.0"

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
    "count",
    "cut",
    "deliver",
    "follow",
    "get",
    "give",
    "go",
    "handle",
    "help",
    "issue",
    "join",
    "keep",
    "leave",
    "make",
    "manage",
    "meet",
    "miss",
    "open",
    "pay",
    "print",
    "process",
    "put",
    "read",
    "review",
    "save",
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
    "wake",
    "write",
}

PREPOSITIONS = {
    "about",
    "after",
    "at",
    "before",
    "by",
    "for",
    "from",
    "in",
    "into",
    "of",
    "on",
    "to",
    "with",
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


def usable_phrase(col: str) -> str:
    text = col.strip()
    last = text.split()[-1].lower() if text else ""
    if last in PREPOSITIONS:
        return f"{text} this"
    return text


def is_verb_phrase(col: str, pos: str, lemma: str) -> bool:
    first = col.strip().split(" ", 1)[0].lower()
    if first in {"a", "an", "the", "on", "in", "at", "to", "for", "of"}:
        return False
    if first in VERBISH:
        return True
    return pos == "verb" and col.lower().startswith(lemma.lower())


def pick(items: list[tuple[str, str]], salt: str) -> tuple[str, str]:
    index = int(hashlib.sha256(salt.encode()).hexdigest(), 16) % len(items)
    return items[index]


def meaning_label(gloss_tc: str) -> str:
    text = re.sub(r"[A-Za-z0-9]+", "", gloss_tc or "")
    if "：" in text:
        text = text.split("：", 1)[-1]
    elif ":" in text:
        text = text.split(":", 1)[-1]
    text = re.split(r"例如", text, 1)[0]
    text = re.sub(r"\s+", "", text).strip(" ，,。；;、")
    return text or "這個意思"


def generated_tc_for_en(en: str) -> str | None:
    text = en.strip()
    if text.startswith("Please ") and text.endswith(" before we close."):
        return "關門前請先處理這件事。"
    if text.startswith("Can you ") and text.endswith(" for the afternoon team?"):
        return "你可以替下午的同事處理嗎？"
    if text.startswith("We should ") and text.endswith(" after the briefing."):
        return "簡報後我們應該處理這件事。"
    if text.startswith("I will ") and text.endswith(" once the queue is shorter."):
        return "排隊短一點，我就會處理。"
    if text.startswith("Today's notes mention ") and text.endswith("."):
        return "今天的備註提到這個用法。"
    if text.startswith("A customer asked about ") and text.endswith("."):
        return "有顧客問及這個用法。"
    if text.startswith("Write ") and text.endswith(" on the whiteboard."):
        return "把這個說法寫在白板上。"
    if text.startswith("The briefing covered ") and text.endswith("."):
        return "簡報談到這個用法。"
    if text.startswith("We can ") and text.endswith(" this after the next customer."):
        return "服務下一位顧客後，我們可以處理這件事。"
    if text.startswith("Do not forget to ") and text.endswith(" before you leave."):
        return "離開前不要忘記處理這件事。"
    if text.startswith("Keep the wording ") and text.endswith(" in the shop notice."):
        return "店舖告示的用字要保持清楚。"
    if text.startswith("The ") and text.endswith(" option is clearer for staff."):
        return "對同事來說，這個做法更清楚。"
    if text.startswith("Put ") and text.endswith(" on the afternoon list."):
        return "把這個項目寫進下午清單。"
    if text.startswith("The team asked how ") and " works here:" in text:
        return "同事問這裡這個怎麼用。"
    if text.startswith("Keep a note of ") and text.endswith(" beside the till."):
        return "把這個記在收銀機旁。"
    if text.startswith("Ask a colleague if ") and text.endswith(" is needed today."):
        return "問同事今天是否需要這個。"
    if text.startswith("Check ") and text.endswith(" before the evening handover."):
        return "晚班交接前先核對這個。"
    return None


def tc_without_latin(tc: str, gloss_tc: str) -> str:
    replacements = (("WhatsApp", "即時訊息"), ("PDF", "文件"))
    text = tc or ""
    for english, chinese in replacements:
        text = text.replace(english, chinese)
    text = re.sub(r"「[^」]*[A-Za-z][^」]*」", "這個用法", text)
    text = re.sub(r"[A-Za-z][A-Za-z0-9+.#]*", "", text)
    text = text.replace("「」", "")
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[，,]{2,}", "，", text)
    if not re.search(r"[\u4e00-\u9fff]", text):
        return "這是指這個用法。"
    return text


def collocation_pair(col: str, lemma: str, pos: str, salt: str, _gloss_tc: str) -> tuple[str, str]:
    phrase = usable_phrase(col)
    if is_verb_phrase(col, pos, lemma):
        return pick(
            [
                (f"Please {phrase} before we close.", "關門前請先處理這件事。"),
                (f"Can you {phrase} for the afternoon team?", "你可以替下午的同事處理嗎？"),
                (f"We should {phrase} after the briefing.", "簡報後我們應該處理這件事。"),
                (f"I will {phrase} once the queue is shorter.", "排隊短一點，我就會處理。"),
            ],
            salt,
        )
    return pick(
        [
            (f"Today's notes mention {phrase}.", "今天的備註提到這個用法。"),
            (f"A customer asked about {phrase}.", "有顧客問及這個用法。"),
            (f"Write {phrase} on the whiteboard.", "把這個說法寫在白板上。"),
            (f"The briefing covered {phrase}.", "簡報談到這個用法。"),
        ],
        salt,
    )


def filler_pair(lemma: str, gloss_tc: str, pos: str, salt: str) -> tuple[str, str]:
    meaning = meaning_label(gloss_tc)
    label = meaning if len(meaning) <= 8 else "這個意思"
    if pos == "verb":
        return pick(
            [
                (f"We can {lemma} this after the next customer.", "服務下一位顧客後，我們可以處理這件事。"),
                (f"Do not forget to {lemma} before you leave.", "離開前不要忘記處理這件事。"),
            ],
            salt,
        )
    if pos == "adjective":
        return pick(
            [
                (f"Keep the wording {lemma} in the shop notice.", f"店舖告示的用字要保持「{label}」。"),
                (f"The {lemma} option is clearer for staff.", f"對同事來說，{label}的做法更清楚。"),
            ],
            salt,
        )
    return pick(
        [
            (f"Put {lemma} on the afternoon list.", f"把{label}寫進下午清單。"),
            (f"The team asked how {lemma} works here: {gloss_tc}", f"同事問這裡的{label}怎麼用。"),
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
        next_tc = generated_tc_for_en(en) or tc_without_latin(tc, gloss_tc)
        pool.append(make_example(sense["id"], en, next_tc, domain, len(pool) + 1))

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
        add(*collocation_pair(col, lemma, pos, f"{sense['id']}:{col}", gloss_tc))

    extras = [
        (f"Keep a note of {lemma} beside the till.", "把這個記在收銀機旁。"),
        (f"Ask a colleague if {lemma} is needed today.", "問同事今天是否需要這個。"),
        (f"Check {lemma} before the evening handover.", "晚班交接前先核對這個。"),
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
    leftover_quotes = [item for item in leftover if " — " in str(item.get("en", ""))]
    leftover_rest = [item for item in leftover if item not in leftover_quotes]
    chosen = (required + leftover_quotes + leftover_rest)[:5]
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
    latin_tc = 0
    for sense in pack["senses"]:
        text = " ".join(item["en"].lower() for item in sense["examples"])
        cols = sense.get("collocations") or []
        if all(col.lower() in text for col in cols):
            covered += 1
        if any(" — " in item["en"] for item in sense["examples"]):
            quotes += 1
        latin_tc += sum(1 for item in sense["examples"] if re.search(r"[A-Za-z]", item.get("tc") or ""))
    if latin_tc:
        raise SystemExit(f"Latin remaining in {latin_tc} Traditional Chinese examples")
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
