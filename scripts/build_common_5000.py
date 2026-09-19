#!/usr/bin/env python3
"""Build the common-5000 lookup pack from wordfreq + WordNet + CC-CEDICT.

This is a dictionary layer, not a second workplace teaching pack:
no audio, no invented examples or synonyms. Today still picks from
Chris Workplace 1000 because these senses have no examples.
"""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import urllib.request
from pathlib import Path

from nltk.corpus import wordnet as wn
from wordfreq import top_n_list, zipf_frequency

try:
    wn.synsets("deadline")
except LookupError:
    import nltk

    nltk.download("wordnet", quiet=True)
    nltk.download("omw-1.4", quiet=True)
    from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parents[1]
CHRIS = ROOT / "public" / "packs" / "chris-1000" / "pack.json"
OUT = ROOT / "public" / "packs" / "common-5000"
CACHE = ROOT / "scripts" / ".cache"
CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"
WORDFREQ_VERSION = "3.1.1"
SCALE_VERSION = "v1"
PACK_ID = "common-5000"
PACK_VERSION = "1.0.0"

POS_MAP = {"n": "noun", "v": "verb", "a": "adjective", "s": "adjective", "r": "adverb"}

CLOSED_GLOSS = {
    "a": ("article", "Used before a noun when it is one of a type, not a specific one already named.", "用於名詞前，表示同類中的一個。"),
    "an": ("article", "The form of “a” used before a vowel sound.", "a 在母音前的形式。"),
    "the": ("article", "Used before a noun when both people know which one is meant.", "用於雙方都知道的那個事物前。"),
    "to": ("preposition", "Marks a direction, a receiver, or the base form of a verb.", "表示方向、對象，或動詞原形。"),
    "and": ("conjunction", "Joins words or ideas that belong together.", "連接同屬一組的詞或意思。"),
    "of": ("preposition", "Shows belonging, amount, or what something is about.", "表示所屬、數量或關於什麼。"),
    "in": ("preposition", "Inside a place, time, or situation.", "在某處、某時或某種情況之中。"),
    "on": ("preposition", "Touching a surface, or about a date, device, or topic.", "在表面上，或指日期、裝置、題目。"),
    "for": ("preposition", "Shows purpose, a receiver, or a length of time.", "表示目的、對象或一段時間。"),
    "that": ("pronoun", "Points to a person, thing, or idea already in view, or starts a clause.", "指眼前的人或事，或帶出子句。"),
    "you": ("pronoun", "The person or people being spoken to.", "對方；你或你們。"),
    "it": ("pronoun", "A thing, situation, or idea already named.", "已提到的事物或情況。"),
    "i": ("pronoun", "The person who is speaking.", "說話的人；我。"),
    "is": ("verb", "Present form of be for one person or thing.", "be 的現在式，用於單數。"),
    "with": ("preposition", "Together, using something, or having a feature.", "一起、用某物，或帶有某特徵。"),
    "this": ("pronoun", "The thing near you, or the idea just mentioned.", "近處的事物，或剛提到的意思。"),
    "was": ("verb", "Past form of be for one person or thing.", "be 的過去式，用於單數。"),
    "be": ("verb", "To exist, happen, or have a quality.", "存在、發生，或具有某種性質。"),
    "as": ("preposition", "In the role of, or in the same way.", "作為，或同樣地。"),
    "are": ("verb", "Present form of be for you, we, or they.", "be 的現在式，用於 you／we／they。"),
    "have": ("verb", "To own, experience, or form a perfect tense.", "擁有、經歷，或構成完成時態。"),
    "at": ("preposition", "A point in space or time.", "在某個地點或時間點。"),
    "he": ("pronoun", "A male person already named.", "已提到的男性。"),
    "not": ("adverb", "Makes a verb or adjective negative.", "表示否定。"),
    "by": ("preposition", "Who did it, or how close in space or time.", "表示出自誰，或時間／距離接近。"),
    "but": ("conjunction", "Shows a contrast.", "表示轉折。"),
    "from": ("preposition", "The starting point of a move, time, or source.", "起點、來源。"),
    "my": ("pronoun", "Belonging to me.", "我的。"),
    "we": ("pronoun", "The speaker and at least one other person.", "我們。"),
    "your": ("pronoun", "Belonging to the person spoken to.", "你的；你們的。"),
    "his": ("pronoun", "Belonging to him.", "他的。"),
    "they": ("pronoun", "People or things already named, not the speaker or listener.", "他們；它們。"),
    "if": ("conjunction", "Introduces a condition.", "表示如果。"),
    "what": ("pronoun", "Asks for information, or refers to a thing.", "詢問資訊，或指某事物。"),
    "when": ("adverb", "Asks or tells the time of something.", "詢問或說明時間。"),
    "their": ("pronoun", "Belonging to them.", "他們的。"),
    "her": ("pronoun", "A female person, or belonging to her.", "她；她的。"),
    "which": ("pronoun", "Asks for a choice, or adds information about a thing.", "詢問選擇，或補充說明。"),
    "would": ("auxiliary", "Marks a polite, imagined, or future-in-the-past action.", "表示客氣、假設，或過去看來的將來。"),
    "she": ("pronoun", "A female person already named.", "已提到的女性。"),
    "how": ("adverb", "Asks or tells the way or amount.", "詢問或說明方法、程度。"),
    "them": ("pronoun", "The object form of they.", "they 的賓語形式。"),
    "our": ("pronoun", "Belonging to us.", "我們的。"),
    "than": ("conjunction", "Used in a comparison.", "用於比較。"),
    "him": ("pronoun", "The object form of he.", "he 的賓語形式。"),
    "into": ("preposition", "To the inside of something, or a change of state.", "進入，或變成。"),
    "could": ("auxiliary", "Past or polite form of can.", "can 的過去或客氣形式。"),
    "these": ("pronoun", "The plural of this.", "this 的複數。"),
    "because": ("conjunction", "Gives a reason.", "表示因為。"),
    "where": ("adverb", "Asks or tells the place.", "詢問或說明地點。"),
    "should": ("auxiliary", "Marks advice or what is right to do.", "表示應該。"),
    "those": ("pronoun", "The plural of that.", "that 的複數。"),
    "or": ("conjunction", "Shows a choice.", "表示或者。"),
    "also": ("adverb", "In addition.", "也；另外。"),
    "just": ("adverb", "Only, recently, or exactly.", "只是、剛剛，或正好。"),
    "only": ("adverb", "No more than this.", "只；僅僅。"),
    "very": ("adverb", "To a high degree.", "非常。"),
    "can": ("auxiliary", "Marks ability or permission.", "表示能夠或可以。"),
    "will": ("auxiliary", "Marks a future or willing action.", "表示將會或願意。"),
    "may": ("auxiliary", "Marks possibility or permission.", "表示可能或允許。"),
    "might": ("auxiliary", "Marks a weaker possibility.", "表示較弱的可能。"),
    "must": ("auxiliary", "Marks something necessary.", "表示必須。"),
    "do": ("verb", "To perform an action, or to form a question or negative.", "做；也用來構成疑問或否定。"),
    "does": ("verb", "Present form of do for he, she, or it.", "do 的現在式，用於 he／she／it。"),
    "did": ("verb", "Past form of do.", "do 的過去式。"),
    "has": ("verb", "Present form of have for he, she, or it.", "have 的現在式，用於 he／she／it。"),
    "had": ("verb", "Past form of have.", "have 的過去式。"),
    "were": ("verb", "Past form of be for you, we, or they.", "be 的過去式，用於 you／we／they。"),
    "been": ("verb", "The form of be used after have.", "have 後面的 be 形式。"),
    "being": ("verb", "The -ing form of be.", "be 的 -ing 形式。"),
    "am": ("verb", "Present form of be for I.", "be 的現在式，用於 I。"),
    "me": ("pronoun", "The object form of I.", "I 的賓語形式。"),
    "us": ("pronoun", "The object form of we.", "we 的賓語形式。"),
    "who": ("pronoun", "Asks or tells which person.", "詢問或說明是哪一個人。"),
    "whom": ("pronoun", "The object form of who, in careful English.", "who 的賓語形式。"),
    "whose": ("pronoun", "Asks or tells who something belongs to.", "詢問或說明屬於誰。"),
    "why": ("adverb", "Asks or tells the reason.", "詢問或說明原因。"),
    "so": ("adverb", "To that degree, or therefore.", "如此；所以。"),
    "then": ("adverb", "Next, or in that case.", "然後；那麼。"),
    "there": ("adverb", "In or to that place, or used to start a sentence about existence.", "在那裡；或用來表示存在。"),
    "here": ("adverb", "In or to this place.", "在這裡。"),
    "up": ("adverb", "To a higher place or a finished state.", "向上，或完成。"),
    "out": ("adverb", "Away from the inside, or not at home.", "向外；不在。"),
    "about": ("preposition", "On the subject of, or approximately.", "關於；大約。"),
    "over": ("preposition", "Above, across, or finished.", "在上方、越過，或結束。"),
    "after": ("preposition", "Later than.", "在……之後。"),
    "before": ("preposition", "Earlier than.", "在……之前。"),
    "between": ("preposition", "In the space or time separating two things.", "在兩者之間。"),
    "through": ("preposition", "From one side to the other, or by means of.", "穿過；透過。"),
    "during": ("preposition", "All through a period of time.", "在……期間。"),
    "without": ("preposition", "Not having, or not doing.", "沒有；不做。"),
    "against": ("preposition", "Opposed to, or touching for support.", "反對；靠着。"),
    "until": ("preposition", "Up to a point in time.", "直到。"),
    "since": ("preposition", "From a time in the past until now.", "自從。"),
    "among": ("preposition", "In the middle of a group.", "在一群之中。"),
    "upon": ("preposition", "A more formal word for on.", "較正式的 on。"),
    "towards": ("preposition", "In the direction of.", "朝向。"),
    "toward": ("preposition", "In the direction of.", "朝向。"),
    "via": ("preposition", "By way of.", "經由。"),
    "per": ("preposition", "For each.", "每。"),
    "versus": ("preposition", "Against, in a contest or comparison.", "對；相比。"),
    "amongst": ("preposition", "In the middle of a group.", "在一群之中。"),
    "onto": ("preposition", "To a position on a surface.", "到……上面。"),
    "whether": ("conjunction", "If … or …, when there is a choice.", "是否。"),
    "although": ("conjunction", "In spite of the fact that.", "雖然。"),
    "unless": ("conjunction", "Except if.", "除非。"),
    "whereas": ("conjunction", "While on the other hand.", "然而；反之。"),
    "whilst": ("conjunction", "While; during the time that.", "當……時。"),
    "nor": ("conjunction", "And not; used after neither or a negative.", "也不。"),
    "else": ("adverb", "Different or extra.", "其他；另外。"),
    "myself": ("pronoun", "I, used for emphasis or when I am also the object.", "我自己。"),
    "yourself": ("pronoun", "You, used for emphasis or when you are also the object.", "你自己。"),
    "himself": ("pronoun", "He, used for emphasis or as the object.", "他自己。"),
    "herself": ("pronoun", "She, used for emphasis or as the object.", "她自己。"),
    "itself": ("pronoun", "It, used for emphasis or as the object.", "它自己。"),
    "themselves": ("pronoun", "They, used for emphasis or as the object.", "他們自己。"),
    "ourselves": ("pronoun", "We, used for emphasis or as the object.", "我們自己。"),
    "everyone": ("pronoun", "Every person.", "每個人。"),
    "everybody": ("pronoun", "Every person.", "每個人。"),
    "someone": ("pronoun", "A person, not named.", "某人。"),
    "somebody": ("pronoun", "A person, not named.", "某人。"),
    "anyone": ("pronoun", "Any person.", "任何人。"),
    "anybody": ("pronoun", "Any person.", "任何人。"),
    "anything": ("pronoun", "Any thing; used especially in questions and negatives.", "任何事物。"),
    "something": ("pronoun", "A thing, not named.", "某事物。"),
    "everything": ("pronoun", "All things.", "一切。"),
    "nothing": ("pronoun", "Not any thing.", "沒有東西。"),
    "others": ("pronoun", "Other people or things.", "其他人或其他事物。"),
    "whoever": ("pronoun", "Any person who.", "無論是誰。"),
    "yours": ("pronoun", "The thing or things that belong to you.", "你的東西。"),
    "shall": ("auxiliary", "A formal or old-fashioned future marker, especially with I or we.", "較正式的將來助動詞。"),
    "ought": ("auxiliary", "Should; it is right or expected.", "應該。"),
    "cannot": ("auxiliary", "Can not.", "不能。"),
    "gonna": ("phrase", "Informal spoken form of going to.", "口語，等於 going to。"),
    "wanna": ("phrase", "Informal spoken form of want to.", "口語，等於 want to。"),
    "gotta": ("phrase", "Informal spoken form of got to / have to.", "口語，等於 have to。"),
    "lol": ("phrase", "Laughing out loud; used in messages.", "訊息裡表示大笑。"),
    "haha": ("phrase", "A written laugh.", "寫出來的笑聲。"),
    "lmao": ("phrase", "A strong written laugh.", "很強的笑聲用語。"),
    "wtf": ("phrase", "A shocked or angry reaction in messages.", "訊息裡表示驚訝或不滿。"),
    "yep": ("phrase", "Informal yes.", "口語的「是」。"),
    "nope": ("phrase", "Informal no.", "口語的「不」。"),
    "nah": ("phrase", "Informal no.", "口語的「不」。"),
    "hey": ("phrase", "An informal greeting or call for attention.", "打招呼或叫人注意。"),
    "yeah": ("phrase", "Informal yes.", "口語的「是」。"),
    "ok": ("phrase", "All right; I agree or it is acceptable.", "好；可以。"),
    "oh": ("phrase", "A sound of surprise, pain, or thinking.", "表示驚訝、痛或在想。"),
    "ah": ("phrase", "A sound of understanding or feeling.", "表示明白或有感覺。"),
    "uh": ("phrase", "A pause sound while thinking.", "邊想邊發出的聲音。"),
    "ugh": ("phrase", "A sound of disgust.", "表示討厭。"),
    "huh": ("phrase", "A sound of not hearing or not agreeing.", "表示沒聽清或不同意。"),
    "eh": ("phrase", "A tag that invites agreement, especially in speech.", "口語裡徵求同意。"),
    "yo": ("phrase", "An informal hello.", "很隨便的打招呼。"),
    "etc": ("phrase", "And other similar things.", "等等。"),
    "vs": ("preposition", "Versus; against.", "對；對決。"),
}

CONCRETE_NOUN_LEX = {
    "noun.artifact",
    "noun.person",
    "noun.location",
    "noun.object",
    "noun.body",
    "noun.food",
    "noun.plant",
    "noun.animal",
    "noun.substance",
    "noun.group",
}

EXPLICIT_GLOSS = {
    "said": ("verb", "Past form of say.", "say 的過去式。"),
    "went": ("verb", "Past form of go.", "go 的過去式。"),
    "gone": ("verb", "The form of go used after have.", "go 的過去分詞。"),
    "done": ("verb", "The form of do used after have; finished.", "do 的過去分詞；完成。"),
    "made": ("verb", "Past form of make.", "make 的過去式。"),
    "going": ("verb", "The -ing form of go; also used for a future plan.", "go 的 -ing 形式；也表示打算。"),
}


def commonness(zipf: float) -> int:
    return round(100 * max(0.0, min(1.0, (zipf - 2.0) / 4.5)))


def sha256(path: Path) -> str:
    data = path.read_bytes()
    if path.suffix.lower() in {".json", ".md", ".txt"}:
        text = data.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
        data = text.encode("utf-8")
    digest = hashlib.sha256()
    digest.update(data)
    return digest.hexdigest()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "word"


def finish(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return text
    text = text[0].upper() + text[1:]
    if text[-1] not in ".!?。":
        text += "."
    return text[:180]


def chris_lemmas() -> set[str]:
    pack = json.loads(CHRIS.read_text(encoding="utf-8"))
    return {str(entry["lemma"]).lower() for entry in pack["entries"]}


def keep_word(word: str) -> bool:
    if word in {"1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "1st", "2nd", "3rd", "4th", "°", "3d"}:
        return False
    compact = word.replace("'", "").replace("-", "").replace(".", "")
    return bool(compact) and compact.isalpha()


LOW_QUALITY_TAGS = (
    "archaic",
    "literary",
    "obsolete",
    "variant of",
    "old variant",
    "given name",
    "surname",
    "feminine name",
    "used in female",
    "bound form",
    "internet slang",
    "slang",
    "dialect",
    "appellation",
    "honorific",
)


def clean_cedict_chunk(chunk: str) -> str:
    chunk = re.sub(r"\s+", " ", chunk.strip().lower())
    chunk = re.sub(r"\s*[\(\[][^)\]]*[\)\]]", "", chunk)
    chunk = re.sub(r"\bcl:.*$", "", chunk)
    return chunk.strip(" .;,")


def cedict_keys(chunk: str) -> list[str]:
    keys: list[str] = []
    for piece in re.split(r"[;,/]", chunk):
        raw = piece.strip()
        if re.fullmatch(r"[A-Z0-9]{2,8}", raw or ""):
            continue
        piece = clean_cedict_chunk(raw)
        if piece.startswith("to ") and len(piece) > 3:
            piece = piece[3:].strip()
        if piece.startswith("the ") and len(piece.split()) <= 2:
            continue
        if re.fullmatch(r"[a-z][a-z'\-]{0,32}", piece or ""):
            keys.append(piece)
        elif re.fullmatch(r"[a-z][a-z'\-]+(?: [a-z][a-z'\-]+){0,2}", piece or ""):
            keys.append(piece)
    return list(dict.fromkeys(keys))


def chunk_quality(chunk: str, key: str, line_defs: str) -> int:
    chunk_low = chunk.lower()
    line_low = line_defs.lower()
    if any(tag in chunk_low for tag in LOW_QUALITY_TAGS):
        return -10
    if any(tag in line_low for tag in ("internet slang", "slang", "archaic", "obsolete", "old variant")):
        return -10
    if key not in cedict_keys(chunk):
        return -99
    leading_stripped = re.sub(r"^(?:\s*[\(\[][^)\]]*[\)\]]\s*)+", "", chunk.strip())
    has_extra_qualifier = bool(re.search(r"[\(\[]", leading_stripped))
    cleaned = clean_cedict_chunk(chunk)
    exact = cleaned == key or cleaned == f"to {key}"
    if exact and not has_extra_qualifier:
        if re.match(r"^[\(\[]", chunk.strip()):
            return 4
        return 6
    if exact:
        return 4
    return 2


def add_cedict_hit(index: dict[str, dict[str, int]], key: str, trad: str, quality: int) -> None:
    bucket = index.setdefault(key, {})
    previous = bucket.get(trad, -99)
    if quality > previous:
        bucket[trad] = quality


def pick_chinese(
    index: dict[str, dict[str, int]],
    keys: list[str],
    char_freq: dict[str, int],
    trad_lines: dict[str, int],
) -> str:
    hits: dict[str, int] = {}
    for key in keys:
        for trad, quality in index.get(key, {}).items():
            if trad_lines.get(trad, 1) > 1:
                quality -= 1
            if quality < 2:
                continue
            hits[trad] = max(hits.get(trad, -99), quality)
    if not hits:
        return "常用英文詞。"
    ranked = sorted(
        hits.items(),
        key=lambda item: (
            -item[1],
            {2: 0, 3: 1, 4: 2, 1: 3}.get(len(item[0]), 4 + len(item[0])),
            -sum(char_freq.get(ch, 0) for ch in item[0]),
            len(item[0]),
        ),
    )
    best = ranked[0][1]
    chosen = [trad for trad, quality in ranked if quality >= best][:2]
    return "；".join(chosen)


def load_cedict() -> tuple[dict[str, dict[str, int]], dict[str, dict[str, int]], dict[str, int], dict[str, int]]:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / "cedict.txt"
    if not dest.exists() or dest.stat().st_size < 1000:
        with urllib.request.urlopen(CEDICT_URL, timeout=60) as response:
            dest.write_bytes(gzip.decompress(response.read()))
    nouns: dict[str, dict[str, int]] = {}
    verbs: dict[str, dict[str, int]] = {}
    char_freq: dict[str, int] = {}
    trad_lines: dict[str, int] = {}
    line_re = re.compile(r"^(\S+)\s+\S+\s+\[[^\]]+\]\s+(.+)$")
    for raw in dest.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        match = line_re.match(raw)
        if not match:
            continue
        trad, defs = match.group(1), match.group(2)
        if not re.fullmatch(r"[\u4e00-\u9fff]{1,8}", trad):
            continue
        trad_lines[trad] = trad_lines.get(trad, 0) + 1
        for ch in trad:
            char_freq[ch] = char_freq.get(ch, 0) + 1
        for chunk in defs.strip("/").split("/"):
            original = chunk.strip()
            is_verb = bool(re.match(r"(?i)^(?:\([^)]*\)\s*)*to ", original))
            for key in cedict_keys(original):
                quality = chunk_quality(original, key, defs)
                target = verbs if is_verb else nouns
                add_cedict_hit(target, key, trad, quality)
    return nouns, verbs, char_freq, trad_lines


def contraction_gloss(word: str) -> tuple[str, str, str] | None:
    mapping = {
        "n't": (" not", "不"),
        "'re": (" are", "是"),
        "'ve": (" have", "已經／有"),
        "'ll": (" will", "會"),
        "'d": (" would", "會／已經"),
        "'m": (" am", "是"),
        "'s": (" is", "是"),
    }
    lower = word.lower()
    for tail, (en, tc) in mapping.items():
        if lower.endswith(tail) and len(lower) > len(tail):
            head = lower[: -len(tail)]
            if head in {"it", "that", "there", "what", "who", "he", "she", "here", "let"} or head.isalpha():
                return ("phrase", finish(f"Short form of {head}{en}"), f"{head}{en.strip()} 的縮寫（{tc}）。")
    return None


def lemma_names(synset) -> set[str]:
    return {item.name().replace("_", " ").lower() for item in synset.lemmas()}


def surface_synsets(word: str):
    lower = word.lower()
    return [synset for synset in wn.synsets(lower) if lower in lemma_names(synset)]


def morphological_bases(word: str) -> list[str]:
    bases: list[str] = []
    for pos in (wn.VERB, wn.NOUN, wn.ADJ, wn.ADV):
        morph = wn.morphy(word, pos)
        if morph and len(morph) >= 3 and morph != word.lower() and morph not in bases:
            bases.append(morph)
    return bases


def inflection_gloss(word: str) -> tuple[str, str, str] | None:
    lower = word.lower()
    if lower in EXPLICIT_GLOSS:
        return EXPLICIT_GLOSS[lower]
    verb_base = wn.morphy(lower, wn.VERB)
    if not verb_base or verb_base == lower or len(verb_base) < 2:
        return None
    surface = surface_synsets(lower)
    if any(synset.pos() == "n" and synset.lexname() in CONCRETE_NOUN_LEX for synset in surface):
        return None
    if lower.endswith("ing"):
        return ("verb", finish(f"The -ing form of {verb_base}"), f"{verb_base} 的 -ing 形式。")
    if lower.endswith("s") and not lower.endswith("ss") and (
        verb_base + "s" == lower or verb_base + "es" == lower or verb_base[:-1] + "ies" == lower
    ):
        return ("verb", finish(f"Present form of {verb_base} for he, she, or it"), f"{verb_base} 的現在式，用於 he／she／it。")
    return ("verb", finish(f"Past form of {verb_base}"), f"{verb_base} 的過去式。")


def pick_synset(word: str):
    if len(word) <= 2:
        return None
    pool = surface_synsets(word)
    if not pool:
        for base in morphological_bases(word):
            pool.extend(wn.synsets(base))
    if not pool:
        return None

    def score(synset) -> tuple[int, int]:
        definition = synset.definition().lower()
        penalty = 0
        if any(
            bit in definition
            for bit in (
                "chemical element",
                "metric unit",
                "unit of length",
                "unit of surface",
                "letter of the alphabet",
                "isotope",
            )
        ):
            penalty -= 5
        if synset.lexname() in {"noun.location", "noun.person"} and len(word) <= 3:
            penalty -= 1
        pos_rank = {"n": 4, "v": 3, "a": 3, "r": 2, "s": 0}.get(synset.pos(), 1)
        exact = 1 if word.lower() in lemma_names(synset) else 0
        return (exact + penalty, pos_rank)

    pool.sort(key=score, reverse=True)
    best = pool[0]
    if score(best)[0] < 0 and len(word) <= 3:
        return None
    return best


def english_gloss(word: str, synset) -> tuple[str, str]:
    if synset is None:
        if word.endswith("'s") and len(word) > 2:
            return "phrase", finish(f"Belonging to {word[:-2]}, or a short form of {word[:-2]} is")
        return "noun", finish("A wording that appears often in English")
    pos = POS_MAP.get(synset.pos(), "noun")
    return pos, finish(synset.definition())


def lookup_keys(word: str, pos: str) -> list[str]:
    lower = word.lower()
    keys = [lower]
    pos_code = {"verb": wn.VERB, "noun": wn.NOUN, "adjective": wn.ADJ, "adverb": wn.ADV}.get(pos)
    if pos_code:
        morph = wn.morphy(lower, pos_code)
        if morph and len(morph) >= 3 and morph != lower:
            keys.append(morph)
    return keys


def chinese_gloss(
    word: str,
    nouns: dict[str, dict[str, int]],
    verbs: dict[str, dict[str, int]],
    pos: str,
    char_freq: dict[str, int],
    trad_lines: dict[str, int],
) -> str:
    keys = lookup_keys(word, pos)
    if pos == "verb":
        merged: dict[str, dict[str, int]] = {}
        for key in keys:
            combined = {**nouns.get(key, {}), **verbs.get(key, {})}
            for trad, quality in verbs.get(key, {}).items():
                combined[trad] = max(combined.get(trad, -99), quality + 1)
            if combined:
                merged[key] = combined
        return pick_chinese(merged, keys, char_freq, trad_lines)
    return pick_chinese(nouns, keys, char_freq, trad_lines)


def inflections(lemma: str, pos: str) -> list[str]:
    forms = [lemma]
    if pos in {"pronoun", "phrase", "adverb", "preposition", "conjunction", "article", "auxiliary"}:
        return forms
    if pos == "verb":
        stem = lemma[:-1] if lemma.endswith("e") else lemma
        forms += [lemma + "s", lemma + "ed", lemma + "ing", stem + "ed", stem + "ing"]
        if lemma.endswith("y") and lemma[-2:] not in {"ay", "ey", "oy"}:
            forms += [lemma[:-1] + "ies", lemma[:-1] + "ied"]
    elif pos == "noun":
        forms += [lemma + "s", lemma + "es"]
        if lemma.endswith("y") and lemma[-2:] not in {"ay", "ey", "oy"}:
            forms.append(lemma[:-1] + "ies")
    elif pos == "adjective":
        forms += [lemma + "er", lemma + "est", lemma + "ly"]
    return list(dict.fromkeys(item for item in forms if item))


def is_closed(word: str, pos: str) -> bool:
    if word in CLOSED_GLOSS:
        return True
    return pos in {"pronoun", "article", "preposition", "conjunction", "auxiliary"}


def main() -> None:
    existing = chris_lemmas()
    nouns, verbs, char_freq, trad_lines = load_cedict()
    entries: list[dict] = []
    senses: list[dict] = []
    skipped_existing = 0
    for word in top_n_list("en", 5000):
        if not keep_word(word):
            continue
        if word.lower() in existing:
            skipped_existing += 1
            continue
        closed = CLOSED_GLOSS.get(word)
        contraction = contraction_gloss(word) if closed is None else None
        inflected = inflection_gloss(word) if closed is None and contraction is None else None
        if closed:
            pos, gloss_en, gloss_tc = closed
        elif contraction:
            pos, gloss_en, gloss_tc = contraction
        elif inflected:
            pos, gloss_en, gloss_tc = inflected
        else:
            synset = pick_synset(word)
            pos, gloss_en = english_gloss(word, synset)
            gloss_tc = chinese_gloss(word, nouns, verbs, pos, char_freq, trad_lines)
            if synset is None and gloss_tc != "常用英文詞。":
                gloss_en = finish("A name or brand that appears often in English")
        zipf = zipf_frequency(word.replace(".", ""), "en") if word.replace(".", "").isalpha() or "'" in word else zipf_frequency(word.split(".")[0], "en")
        measured = zipf > 0
        entry_id = f"e-c5-{slug(word)}"
        sense_id = f"s-c5-{slug(word)}"
        audio_id = f"p-c5-{slug(word)}"
        closed_flag = is_closed(word, pos)
        entries.append(
            {
                "id": entry_id,
                "lemma": word,
                "display": word,
                "pos": [pos],
                "searchableForms": inflections(word, pos),
                "domains": ["everyday"],
                "selection": "calibration" if closed_flag else "learn",
                "kind": "word",
            }
        )
        senses.append(
            {
                "id": sense_id,
                "entryId": entry_id,
                "pos": pos,
                "ipa": "",
                "pronunciationId": audio_id,
                "glossEn": gloss_en,
                "glossTc": gloss_tc,
                "usageNote": "Common-English lookup. Short open-data gloss; not a workplace teaching note.",
                "domains": ["everyday"],
                "examples": [],
                "synonyms": [],
                "synonymStatus": "none_appropriate" if closed_flag else "not_prepared",
                "collocations": [],
                "frequency": {
                    "form": word,
                    "zipf": round(zipf, 2) if measured else None,
                    "commonness": commonness(zipf) if measured else None,
                    "source": "wordfreq",
                    "sourceVersion": WORDFREQ_VERSION,
                    "scaleVersion": SCALE_VERSION,
                    "status": "measured" if measured else "unmeasured",
                },
                "selection": "calibration" if closed_flag else "learn",
            }
        )

    OUT.mkdir(parents=True, exist_ok=True)
    pack = {
        "schemaVersion": 1,
        "packId": PACK_ID,
        "version": PACK_VERSION,
        "name": "Common English 5000",
        "description": "The most common English wordings, for offline lookup. Workplace teaching notes stay in Chris Workplace 1000.",
        "accent": "en-GB",
        "entries": entries,
        "senses": senses,
        "audio": [],
    }
    pack_path = OUT / "pack.json"
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    checksums = {"pack.json": sha256(pack_path)}
    notices = f"""# Common English 5000

Lookup pack of high-frequency English wordings for the Vocab AI dictionary.

This is not a second copy of Chris Workplace 1000. Overlap lemmas stay in that teaching pack. These entries have short glosses and no recorded audio; the device voice can still say the word.

Sources:
- Headword ranking: wordfreq {WORDFREQ_VERSION} (top 5,000 English tokens, with digits dropped).
- English glosses: Princeton WordNet 3.0, plus a small closed-class table.
- Traditional Chinese head-glosses: CC-CEDICT (CC-BY-SA 4.0), https://www.mdbg.net/chinese/dictionary?page=cc-cedict

No synonyms or example sentences were invented for this pack.
"""
    notices_path = OUT / "NOTICES.md"
    notices_path.write_text(notices, encoding="utf-8")
    checksums["NOTICES.md"] = sha256(notices_path)
    manifest = {
        "packId": PACK_ID,
        "version": PACK_VERSION,
        "schemaVersion": 1,
        "name": pack["name"],
        "accent": "en-GB",
        "entryCount": len(entries),
        "senseCount": len(senses),
        "audioCount": 0,
        "requiredAssets": ["pack.json", "NOTICES.md"],
        "checksums": checksums,
        "byteSize": sum((OUT / name).stat().st_size for name in checksums),
        "audioBytes": 0,
        "completeness": {
            "meanings": "complete",
            "audio": "none",
            "examples": "none",
            "synonyms": "not_prepared",
            "frequency": "measured-single-words",
            "notes": (
                f"{len(entries)} lookup headwords from the wordfreq top 5,000. "
                f"{skipped_existing} already live in Chris Workplace 1000 so they were not duplicated. "
                "No audio clips. Today does not auto-queue these."
            ),
        },
        "licenses": [
            f"Frequency values: wordfreq {WORDFREQ_VERSION}.",
            "English glosses: WordNet 3.0.",
            "Chinese glosses: CC-CEDICT, CC-BY-SA 4.0.",
            "No pack audio; device text-to-speech may be used.",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "entries": len(entries),
                "senses": len(senses),
                "skippedExisting": skipped_existing,
                "bytes": manifest["byteSize"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
