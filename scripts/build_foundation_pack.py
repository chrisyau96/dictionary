#!/usr/bin/env python3
"""Build the audited 50-sense foundation pack, audio, checksums, and notices."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "packs" / "foundation-50"
AUDIO = OUT / "audio"
SCALE_VERSION = "v1"
WORDFREQ_VERSION = "3.1.1"
ACCENT = "en-GB"
REVIEW_DATE = "2026-09-05"


def commonness(zipf: float) -> int:
    return round(100 * max(0.0, min(1.0, (zipf - 2.0) / 4.5)))


def measured(form: str) -> dict:
    zipf = zipf_frequency(form, "en")
    return {
        "form": form,
        "zipf": round(zipf, 2),
        "commonness": commonness(zipf),
        "source": "wordfreq",
        "sourceVersion": WORDFREQ_VERSION,
        "scaleVersion": SCALE_VERSION,
        "status": "measured",
    }


def unmeasured(form: str) -> dict:
    return {
        "form": form,
        "zipf": None,
        "commonness": None,
        "source": "wordfreq",
        "sourceVersion": WORDFREQ_VERSION,
        "scaleVersion": SCALE_VERSION,
        "status": "unmeasured",
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def speak(text: str, dest: Path, phonemes: bool = False) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        cmd = ["espeak-ng", "-v", "en-gb", "-s", "130", "-p", "40", "-w", str(wav)]
        if phonemes:
            cmd.append(f"[[{text}]]")
        else:
            cmd.append(text)
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(wav),
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "32k",
                str(dest),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


ENTRIES = [
    {
        "id": "e-saw",
        "lemma": "saw",
        "display": "saw",
        "pos": ["noun", "verb"],
        "searchableForms": ["saw", "saws"],
        "domains": ["everyday"],
    },
    {
        "id": "e-see",
        "lemma": "see",
        "display": "see",
        "pos": ["verb"],
        "searchableForms": ["see", "sees", "saw", "seen", "seeing"],
        "domains": ["everyday"],
    },
    {
        "id": "e-read",
        "lemma": "read",
        "display": "read",
        "pos": ["verb"],
        "searchableForms": ["read", "reads", "reading"],
        "domains": ["everyday"],
    },
    {
        "id": "e-bank",
        "lemma": "bank",
        "display": "bank",
        "pos": ["noun"],
        "searchableForms": ["bank", "banks"],
        "domains": ["business", "everyday"],
    },
    {
        "id": "e-close",
        "lemma": "close",
        "display": "close",
        "pos": ["verb", "adjective"],
        "searchableForms": ["close", "closes", "closed", "closing", "closer", "closest"],
        "domains": ["everyday", "business"],
    },
    {
        "id": "e-book",
        "lemma": "book",
        "display": "book",
        "pos": ["verb"],
        "searchableForms": ["book", "books", "booked", "booking"],
        "domains": ["everyday", "business"],
    },
    {
        "id": "e-check",
        "lemma": "check",
        "display": "check",
        "pos": ["verb"],
        "searchableForms": ["check", "checks", "checked", "checking"],
        "domains": ["everyday", "project-management"],
    },
    {
        "id": "e-address",
        "lemma": "address",
        "display": "address",
        "pos": ["verb"],
        "searchableForms": ["address", "addresses", "addressed", "addressing"],
        "domains": ["business", "project-management"],
    },
    {
        "id": "e-current",
        "lemma": "current",
        "display": "current",
        "pos": ["adjective"],
        "searchableForms": ["current", "currently"],
        "domains": ["everyday", "business"],
    },
    {
        "id": "e-i",
        "lemma": "I",
        "display": "I",
        "pos": ["pronoun"],
        "searchableForms": ["i", "I"],
        "domains": ["everyday"],
        "selection": "calibration",
    },
    {
        "id": "e-you",
        "lemma": "you",
        "display": "you",
        "pos": ["pronoun"],
        "searchableForms": ["you"],
        "domains": ["everyday"],
        "selection": "calibration",
    },
    {
        "id": "e-we",
        "lemma": "we",
        "display": "we",
        "pos": ["pronoun"],
        "searchableForms": ["we", "us"],
        "domains": ["everyday"],
        "selection": "calibration",
    },
    {
        "id": "e-they",
        "lemma": "they",
        "display": "they",
        "pos": ["pronoun"],
        "searchableForms": ["they", "them"],
        "domains": ["everyday"],
        "selection": "calibration",
    },
    {
        "id": "e-streamline",
        "lemma": "streamline",
        "display": "streamline",
        "pos": ["verb"],
        "searchableForms": ["streamline", "streamlines", "streamlined", "streamlining"],
        "domains": ["project-management", "business"],
    },
    {
        "id": "e-process",
        "lemma": "process",
        "display": "process",
        "pos": ["noun"],
        "searchableForms": ["process", "processes"],
        "domains": ["project-management", "business"],
    },
    {
        "id": "e-approve",
        "lemma": "approve",
        "display": "approve",
        "pos": ["verb"],
        "searchableForms": ["approve", "approves", "approved", "approving"],
        "domains": ["project-management", "business"],
    },
    {
        "id": "e-deadline",
        "lemma": "deadline",
        "display": "deadline",
        "pos": ["noun"],
        "searchableForms": ["deadline", "deadlines"],
        "domains": ["project-management"],
    },
    {
        "id": "e-stakeholder",
        "lemma": "stakeholder",
        "display": "stakeholder",
        "pos": ["noun"],
        "searchableForms": ["stakeholder", "stakeholders"],
        "domains": ["project-management", "business"],
    },
    {
        "id": "e-scope",
        "lemma": "scope",
        "display": "scope",
        "pos": ["noun"],
        "searchableForms": ["scope", "scopes"],
        "domains": ["project-management"],
    },
    {
        "id": "e-risk",
        "lemma": "risk",
        "display": "risk",
        "pos": ["noun"],
        "searchableForms": ["risk", "risks"],
        "domains": ["project-management", "business"],
    },
    {
        "id": "e-update",
        "lemma": "update",
        "display": "update",
        "pos": ["verb"],
        "searchableForms": ["update", "updates", "updated", "updating"],
        "domains": ["project-management", "technology"],
    },
    {
        "id": "e-meeting",
        "lemma": "meeting",
        "display": "meeting",
        "pos": ["noun"],
        "searchableForms": ["meeting", "meetings"],
        "domains": ["business", "everyday"],
    },
    {
        "id": "e-deliverable",
        "lemma": "deliverable",
        "display": "deliverable",
        "pos": ["noun"],
        "searchableForms": ["deliverable", "deliverables"],
        "domains": ["project-management"],
    },
    {
        "id": "e-customer",
        "lemma": "customer",
        "display": "customer",
        "pos": ["noun"],
        "searchableForms": ["customer", "customers"],
        "domains": ["retail", "business"],
    },
    {
        "id": "e-invoice",
        "lemma": "invoice",
        "display": "invoice",
        "pos": ["noun"],
        "searchableForms": ["invoice", "invoices"],
        "domains": ["business"],
    },
    {
        "id": "e-revenue",
        "lemma": "revenue",
        "display": "revenue",
        "pos": ["noun"],
        "searchableForms": ["revenue", "revenues"],
        "domains": ["business", "entrepreneurship"],
    },
    {
        "id": "e-proposal",
        "lemma": "proposal",
        "display": "proposal",
        "pos": ["noun"],
        "searchableForms": ["proposal", "proposals"],
        "domains": ["business"],
    },
    {
        "id": "e-feedback",
        "lemma": "feedback",
        "display": "feedback",
        "pos": ["noun"],
        "searchableForms": ["feedback"],
        "domains": ["business", "retail"],
    },
    {
        "id": "e-refund",
        "lemma": "refund",
        "display": "refund",
        "pos": ["noun"],
        "searchableForms": ["refund", "refunds"],
        "domains": ["retail"],
    },
    {
        "id": "e-queue",
        "lemma": "queue",
        "display": "queue",
        "pos": ["noun"],
        "searchableForms": ["queue", "queues"],
        "domains": ["retail", "everyday"],
    },
    {
        "id": "e-experience",
        "lemma": "experience",
        "display": "experience",
        "pos": ["noun"],
        "searchableForms": ["experience", "experiences"],
        "domains": ["retail", "everyday"],
    },
    {
        "id": "e-complaint",
        "lemma": "complaint",
        "display": "complaint",
        "pos": ["noun"],
        "searchableForms": ["complaint", "complaints"],
        "domains": ["retail"],
    },
    {
        "id": "e-launch",
        "lemma": "launch",
        "display": "launch",
        "pos": ["verb"],
        "searchableForms": ["launch", "launches", "launched", "launching"],
        "domains": ["entrepreneurship", "technology"],
    },
    {
        "id": "e-pivot",
        "lemma": "pivot",
        "display": "pivot",
        "pos": ["verb"],
        "searchableForms": ["pivot", "pivots", "pivoted", "pivoting"],
        "domains": ["entrepreneurship"],
    },
    {
        "id": "e-cash-flow",
        "lemma": "cash flow",
        "display": "cash flow",
        "pos": ["noun"],
        "searchableForms": ["cash flow", "cashflow"],
        "domains": ["entrepreneurship", "business"],
        "kind": "phrase",
    },
    {
        "id": "e-automate",
        "lemma": "automate",
        "display": "automate",
        "pos": ["verb"],
        "searchableForms": ["automate", "automates", "automated", "automating"],
        "domains": ["technology", "project-management"],
    },
    {
        "id": "e-deploy",
        "lemma": "deploy",
        "display": "deploy",
        "pos": ["verb"],
        "searchableForms": ["deploy", "deploys", "deployed", "deploying"],
        "domains": ["technology"],
    },
    {
        "id": "e-backup",
        "lemma": "backup",
        "display": "backup",
        "pos": ["noun"],
        "searchableForms": ["backup", "backups", "back-up", "back up"],
        "domains": ["technology"],
    },
    {
        "id": "e-offline",
        "lemma": "offline",
        "display": "offline",
        "pos": ["adjective"],
        "searchableForms": ["offline"],
        "domains": ["technology"],
    },
    {
        "id": "e-schedule",
        "lemma": "schedule",
        "display": "schedule",
        "pos": ["verb"],
        "searchableForms": ["schedule", "schedules", "scheduled", "scheduling"],
        "domains": ["project-management", "everyday"],
    },
    {
        "id": "e-confirm",
        "lemma": "confirm",
        "display": "confirm",
        "pos": ["verb"],
        "searchableForms": ["confirm", "confirms", "confirmed", "confirming"],
        "domains": ["business", "everyday"],
    },
    {
        "id": "e-negotiate",
        "lemma": "negotiate",
        "display": "negotiate",
        "pos": ["verb"],
        "searchableForms": ["negotiate", "negotiates", "negotiated", "negotiating"],
        "domains": ["business"],
    },
    {
        "id": "e-follow-up",
        "lemma": "follow up",
        "display": "follow up",
        "pos": ["verb"],
        "searchableForms": ["follow up", "followed up", "following up", "follow-up"],
        "domains": ["business", "project-management"],
        "kind": "phrase",
    },
    {
        "id": "e-please",
        "lemma": "please",
        "display": "please",
        "pos": ["adverb"],
        "searchableForms": ["please"],
        "domains": ["everyday"],
    },
    {
        "id": "e-thank",
        "lemma": "thank",
        "display": "thank",
        "pos": ["verb"],
        "searchableForms": ["thank", "thanks", "thanked", "thanking"],
        "domains": ["everyday"],
    },
    {
        "id": "e-help",
        "lemma": "help",
        "display": "help",
        "pos": ["verb"],
        "searchableForms": ["help", "helps", "helped", "helping"],
        "domains": ["everyday"],
    },
    {
        "id": "e-sorry",
        "lemma": "sorry",
        "display": "sorry",
        "pos": ["adjective"],
        "searchableForms": ["sorry"],
        "domains": ["everyday"],
    },
]


def sense(
    *,
    sid: str,
    entry_id: str,
    pos: str,
    ipa: str,
    pronunciation_id: str,
    gloss_en: str,
    gloss_tc: str,
    freq_form: str | None,
    examples: list[dict],
    synonyms: list[dict] | None,
    collocations: list[str],
    domains: list[str],
    usage_note: str | None = None,
    selection: str = "learn",
) -> dict:
    frequency = unmeasured(freq_form or "") if freq_form is None else measured(freq_form)
    return {
        "id": sid,
        "entryId": entry_id,
        "pos": pos,
        "ipa": ipa,
        "pronunciationId": pronunciation_id,
        "glossEn": gloss_en,
        "glossTc": gloss_tc,
        "usageNote": usage_note,
        "domains": domains,
        "examples": examples,
        "synonyms": synonyms or [],
        "synonymStatus": "authored" if synonyms else "none-appropriate",
        "collocations": collocations,
        "frequency": frequency,
        "selection": selection,
        "provenance": {
            "gloss": "original-teaching",
            "examples": "original-teaching",
            "reviewed": True,
            "reviewDate": REVIEW_DATE,
        },
    }


SENSES = [
    sense(
        sid="s-saw-tool",
        entry_id="e-saw",
        pos="noun",
        ipa="/sɔː/",
        pronunciation_id="p-saw",
        gloss_en="A hand tool with a toothed blade, used for cutting wood or other hard material.",
        gloss_tc="有鋸齒的手工具，用來鋸開木材或其他硬物。",
        freq_form="saw",
        examples=[
            {
                "id": "ex-saw-tool-1",
                "en": "He used a saw to cut the shelf to size.",
                "tc": "他用鋸子把層板鋸成所需長度。",
                "context": "everyday",
            }
        ],
        synonyms=[{"term": "handsaw", "relation": "narrower", "difference": "A handsaw is one common type of saw, not every cutting tool."}],
        collocations=["use a saw", "a circular saw"],
        domains=["everyday"],
        usage_note="This is a tool. It is not the past of see.",
    ),
    sense(
        sid="s-see-past",
        entry_id="e-see",
        pos="verb",
        ipa="/sɔː/",
        pronunciation_id="p-saw",
        gloss_en="Past tense of see: noticed or looked at someone or something.",
        gloss_tc="see 的過去式：看見或注意到某人或某物。",
        freq_form="saw",
        examples=[
            {
                "id": "ex-see-past-1",
                "en": "I saw the email this morning but have not replied yet.",
                "tc": "我今早看到那封電郵，但還未回覆。",
                "context": "work",
            }
        ],
        synonyms=[],
        collocations=["saw him", "saw the problem"],
        domains=["everyday"],
        usage_note="Same spelling as the tool. The headword is see.",
    ),
    sense(
        sid="s-read-present",
        entry_id="e-read",
        pos="verb",
        ipa="/riːd/",
        pronunciation_id="p-read-present",
        gloss_en="To look at written words and understand their meaning.",
        gloss_tc="看文字並理解其意思。",
        freq_form="read",
        examples=[
            {
                "id": "ex-read-present-1",
                "en": "Please read the contract before you sign it.",
                "tc": "請先閱讀合約，再簽署。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "go through", "relation": "near", "difference": "Go through often means examine in detail, not only decode the words."}],
        collocations=["read the report", "read carefully"],
        domains=["everyday", "business"],
    ),
    sense(
        sid="s-read-past",
        entry_id="e-read",
        pos="verb",
        ipa="/red/",
        pronunciation_id="p-read-past",
        gloss_en="Past tense of read: finished looking at and understanding a text.",
        gloss_tc="read 的過去式：已經看過並理解某段文字。",
        freq_form="read",
        examples=[
            {
                "id": "ex-read-past-1",
                "en": "I read your proposal last night and marked two questions.",
                "tc": "我昨晚已讀過你的建議書，並標了兩個問題。",
                "context": "work",
            }
        ],
        synonyms=[],
        collocations=["read it yesterday"],
        domains=["everyday"],
        usage_note="Spelling matches the present verb; the vowel sound changes.",
    ),
    sense(
        sid="s-bank-finance",
        entry_id="e-bank",
        pos="noun",
        ipa="/bæŋk/",
        pronunciation_id="p-bank",
        gloss_en="A business that keeps money, makes payments, and lends money.",
        gloss_tc="保管金錢、處理付款及借貸的機構。",
        freq_form="bank",
        examples=[
            {
                "id": "ex-bank-finance-1",
                "en": "The shop pays takings into the bank every evening.",
                "tc": "店舖每晚都會把營業額存入銀行。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "lender", "relation": "related", "difference": "A lender may be a bank, but a bank also holds deposits and runs accounts."}],
        collocations=["open a bank account", "go to the bank"],
        domains=["business", "everyday"],
    ),
    sense(
        sid="s-bank-river",
        entry_id="e-bank",
        pos="noun",
        ipa="/bæŋk/",
        pronunciation_id="p-bank",
        gloss_en="The land along the side of a river or canal.",
        gloss_tc="河或運河兩旁的岸邊土地。",
        freq_form="bank",
        examples=[
            {
                "id": "ex-bank-river-1",
                "en": "We walked along the river bank after lunch.",
                "tc": "午飯後我們沿河岸散步。",
                "context": "everyday",
            }
        ],
        synonyms=[{"term": "shore", "relation": "near", "difference": "Shore is more often used for a sea or lake than a river."}],
        collocations=["river bank"],
        domains=["everyday"],
        usage_note="Do not treat this as the financial institution.",
    ),
    sense(
        sid="s-close-verb",
        entry_id="e-close",
        pos="verb",
        ipa="/kləʊz/",
        pronunciation_id="p-close-verb",
        gloss_en="To shut something, or to bring a matter to an end.",
        gloss_tc="關上某物，或把一件事結束。",
        freq_form="close",
        examples=[
            {
                "id": "ex-close-verb-1",
                "en": "Please close the till before you leave the shop.",
                "tc": "離開店舖前請關好收銀機。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "shut", "relation": "near", "difference": "Shut is usually physical. Close can also end a deal or a file."}],
        collocations=["close the door", "close the case"],
        domains=["everyday", "business"],
    ),
    sense(
        sid="s-close-adj",
        entry_id="e-close",
        pos="adjective",
        ipa="/kləʊs/",
        pronunciation_id="p-close-adj",
        gloss_en="Near in space, time, or relationship.",
        gloss_tc="在距離、時間或關係上接近。",
        freq_form="close",
        examples=[
            {
                "id": "ex-close-adj-1",
                "en": "The warehouse is close to the MTR station.",
                "tc": "貨倉鄰近港鐵站。",
                "context": "everyday",
            }
        ],
        synonyms=[{"term": "near", "relation": "near", "difference": "Near is mainly about distance. Close can also describe a relationship."}],
        collocations=["close to", "a close friend"],
        domains=["everyday"],
        usage_note="The vowel ending is /s/, not /z/.",
    ),
    sense(
        sid="s-book-reserve",
        entry_id="e-book",
        pos="verb",
        ipa="/bʊk/",
        pronunciation_id="p-book",
        gloss_en="To arrange in advance to have a place, time, or service.",
        gloss_tc="預先安排位置、時間或服務。",
        freq_form="book",
        examples=[
            {
                "id": "ex-book-reserve-1",
                "en": "Can you book a meeting room for Thursday morning?",
                "tc": "你能否預訂星期四上午的會議室？",
                "context": "work",
            }
        ],
        synonyms=[{"term": "reserve", "relation": "near", "difference": "Reserve is slightly more formal; both can mean hold a place."}],
        collocations=["book a room", "book a slot"],
        domains=["everyday", "business"],
    ),
    sense(
        sid="s-check-verify",
        entry_id="e-check",
        pos="verb",
        ipa="/tʃek/",
        pronunciation_id="p-check",
        gloss_en="To examine something so you know it is correct or complete.",
        gloss_tc="檢查某事物，確認它正確或齊全。",
        freq_form="check",
        examples=[
            {
                "id": "ex-check-verify-1",
                "en": "Check the stock count before we open tomorrow.",
                "tc": "明天開店前先核對存貨數目。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "verify", "relation": "near", "difference": "Verify stresses proving that something is true, not only looking at it."}],
        collocations=["check the figures", "double-check"],
        domains=["everyday", "project-management"],
    ),
    sense(
        sid="s-address-deal",
        entry_id="e-address",
        pos="verb",
        ipa="/əˈdres/",
        pronunciation_id="p-address",
        gloss_en="To give attention to a problem and start dealing with it.",
        gloss_tc="正視問題並着手處理。",
        freq_form="address",
        examples=[
            {
                "id": "ex-address-deal-1",
                "en": "We need to address the delay before it affects the launch.",
                "tc": "我們要先處理延誤，以免影響推出時間。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "deal with", "relation": "near", "difference": "Deal with is more general. Address often names the issue first."}],
        collocations=["address the issue", "address a concern"],
        domains=["business", "project-management"],
    ),
    sense(
        sid="s-current-present",
        entry_id="e-current",
        pos="adjective",
        ipa="/ˈkʌrənt/",
        pronunciation_id="p-current",
        gloss_en="Happening or being used now.",
        gloss_tc="現正發生或現正使用的。",
        freq_form="current",
        examples=[
            {
                "id": "ex-current-present-1",
                "en": "The current price list replaces last month's version.",
                "tc": "現行價目表已取代上個月的版本。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "present", "relation": "near", "difference": "Present can also mean in the room. Current usually means latest."}],
        collocations=["current version", "current customer"],
        domains=["everyday", "business"],
    ),
    sense(
        sid="s-i",
        entry_id="e-i",
        pos="pronoun",
        ipa="/aɪ/",
        pronunciation_id="p-i",
        gloss_en="The speaker or writer; used to talk about yourself.",
        gloss_tc="說話或書寫的人用來指自己。",
        freq_form="I",
        examples=[{"id": "ex-i-1", "en": "I will send the file after lunch.", "tc": "我午飯後會把檔案寄出。", "context": "work"}],
        synonyms=[],
        collocations=["I think", "I will"],
        domains=["everyday"],
        selection="calibration",
    ),
    sense(
        sid="s-you",
        entry_id="e-you",
        pos="pronoun",
        ipa="/juː/",
        pronunciation_id="p-you",
        gloss_en="The person or people being spoken or written to.",
        gloss_tc="指正在對話或收信的對方。",
        freq_form="you",
        examples=[{"id": "ex-you-1", "en": "Can you confirm the delivery time?", "tc": "你能否確認送貨時間？", "context": "work"}],
        synonyms=[],
        collocations=["thank you", "you can"],
        domains=["everyday"],
        selection="calibration",
    ),
    sense(
        sid="s-we",
        entry_id="e-we",
        pos="pronoun",
        ipa="/wiː/",
        pronunciation_id="p-we",
        gloss_en="The speaker and at least one other person.",
        gloss_tc="指自己連同至少另一人。",
        freq_form="we",
        examples=[{"id": "ex-we-1", "en": "We should test the till before Saturday.", "tc": "我們應在星期六前先測試收銀機。", "context": "retail"}],
        synonyms=[],
        collocations=["we should", "we need"],
        domains=["everyday"],
        selection="calibration",
    ),
    sense(
        sid="s-they",
        entry_id="e-they",
        pos="pronoun",
        ipa="/ðeɪ/",
        pronunciation_id="p-they",
        gloss_en="People or things already known in the conversation, not you or me.",
        gloss_tc="指對話中已知、但不是你或我的人或事物。",
        freq_form="they",
        examples=[{"id": "ex-they-1", "en": "They asked for a refund this afternoon.", "tc": "他們今天下午要求退款。", "context": "retail"}],
        synonyms=[],
        collocations=["they said", "they asked"],
        domains=["everyday"],
        selection="calibration",
    ),
    sense(
        sid="s-streamline",
        entry_id="e-streamline",
        pos="verb",
        ipa="/ˈstriːmlaɪn/",
        pronunciation_id="p-streamline",
        gloss_en="To make a process simpler and faster by removing extra steps.",
        gloss_tc="精簡流程，去掉多餘步驟，使其更快捷。",
        freq_form="streamline",
        examples=[
            {
                "id": "ex-streamline-1",
                "en": "We should streamline the approval process before automating it.",
                "tc": "我們應先簡化審批流程，再將其自動化。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "simplify", "relation": "near", "difference": "Simplify can mean make easier to understand. Streamline usually means remove delay from a process."}],
        collocations=["streamline the process", "streamline approval"],
        domains=["project-management", "business"],
    ),
    sense(
        sid="s-process",
        entry_id="e-process",
        pos="noun",
        ipa="/ˈprəʊses/",
        pronunciation_id="p-process",
        gloss_en="A series of steps used to get a result at work.",
        gloss_tc="為達成結果而設的一連串步驟。",
        freq_form="process",
        examples=[
            {
                "id": "ex-process-1",
                "en": "The refund process takes two working days.",
                "tc": "退款流程需時兩個工作天。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "procedure", "relation": "near", "difference": "A procedure is often a written rule. A process is the work as it actually happens."}],
        collocations=["approval process", "work process"],
        domains=["project-management", "business"],
    ),
    sense(
        sid="s-approve",
        entry_id="e-approve",
        pos="verb",
        ipa="/əˈpruːv/",
        pronunciation_id="p-approve",
        gloss_en="To officially agree that something may go ahead.",
        gloss_tc="正式同意某事可以進行。",
        freq_form="approve",
        examples=[
            {
                "id": "ex-approve-1",
                "en": "The manager will approve the discount if it stays under ten percent.",
                "tc": "只要折扣不超過一成，經理便會批准。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "authorise", "relation": "near", "difference": "Authorise stresses giving permission. Approve can also mean judge something as acceptable."}],
        collocations=["approve a request", "approve the budget"],
        domains=["project-management", "business"],
    ),
    sense(
        sid="s-deadline",
        entry_id="e-deadline",
        pos="noun",
        ipa="/ˈdedlaɪn/",
        pronunciation_id="p-deadline",
        gloss_en="The latest time by which work must be finished.",
        gloss_tc="工作必須完成的最後期限。",
        freq_form="deadline",
        examples=[
            {
                "id": "ex-deadline-1",
                "en": "The report deadline is Friday at 5 p.m.",
                "tc": "報告截止日期是星期五下午五時。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "due date", "relation": "near", "difference": "Due date is common for bills and homework. Deadline is common for work tasks."}],
        collocations=["meet the deadline", "miss a deadline"],
        domains=["project-management"],
    ),
    sense(
        sid="s-stakeholder",
        entry_id="e-stakeholder",
        pos="noun",
        ipa="/ˈsteɪkhəʊldə/",
        pronunciation_id="p-stakeholder",
        gloss_en="A person or group affected by a project and able to influence it.",
        gloss_tc="受項目影響、亦能影響項目的人或團體。",
        freq_form="stakeholder",
        examples=[
            {
                "id": "ex-stakeholder-1",
                "en": "Shop staff are stakeholders in the new till system.",
                "tc": "店舖同事也是新收銀系統的持份者。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "interested party", "relation": "near", "difference": "Interested party is legal wording. Stakeholder is everyday project language."}],
        collocations=["key stakeholder", "stakeholder meeting"],
        domains=["project-management", "business"],
    ),
    sense(
        sid="s-scope",
        entry_id="e-scope",
        pos="noun",
        ipa="/skəʊp/",
        pronunciation_id="p-scope",
        gloss_en="What a project will and will not include.",
        gloss_tc="項目包括和不包括的範圍。",
        freq_form="scope",
        examples=[
            {
                "id": "ex-scope-1",
                "en": "Training videos are outside the scope of this week's work.",
                "tc": "培訓影片不在本週工作範圍內。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "range", "relation": "related", "difference": "Range is general size. Scope names agreed project boundaries."}],
        collocations=["project scope", "out of scope"],
        domains=["project-management"],
    ),
    sense(
        sid="s-risk",
        entry_id="e-risk",
        pos="noun",
        ipa="/rɪsk/",
        pronunciation_id="p-risk",
        gloss_en="A possible problem that could harm a plan if it happens.",
        gloss_tc="一旦發生便可能損害計劃的潛在問題。",
        freq_form="risk",
        examples=[
            {
                "id": "ex-risk-1",
                "en": "Late stock delivery is the main risk this month.",
                "tc": "貨物遲送是本月的主要風險。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "threat", "relation": "related", "difference": "A threat is often more hostile. A risk can be an ordinary delay or cost."}],
        collocations=["manage risk", "high risk"],
        domains=["project-management", "business"],
    ),
    sense(
        sid="s-update",
        entry_id="e-update",
        pos="verb",
        ipa="/ʌpˈdeɪt/",
        pronunciation_id="p-update",
        gloss_en="To give the latest information, or to change something so it is current.",
        gloss_tc="提供最新資料，或把事物改成最新狀態。",
        freq_form="update",
        examples=[
            {
                "id": "ex-update-1",
                "en": "Please update the team after you speak to the supplier.",
                "tc": "與供應商談完後，請向團隊匯報最新情況。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "inform", "relation": "related", "difference": "Inform can be any news. Update means the news is newer than before."}],
        collocations=["update the team", "update the file"],
        domains=["project-management", "technology"],
    ),
    sense(
        sid="s-meeting",
        entry_id="e-meeting",
        pos="noun",
        ipa="/ˈmiːtɪŋ/",
        pronunciation_id="p-meeting",
        gloss_en="A planned time when people talk about work together.",
        gloss_tc="預先安排、一起討論工作的時間。",
        freq_form="meeting",
        examples=[
            {
                "id": "ex-meeting-1",
                "en": "The supplier meeting starts at ten.",
                "tc": "供應商會議十時開始。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "discussion", "relation": "related", "difference": "A discussion can be informal. A meeting is usually scheduled."}],
        collocations=["hold a meeting", "meeting agenda"],
        domains=["business", "everyday"],
    ),
    sense(
        sid="s-deliverable",
        entry_id="e-deliverable",
        pos="noun",
        ipa="/dɪˈlɪvərəbl/",
        pronunciation_id="p-deliverable",
        gloss_en="A finished piece of work that you have promised to hand over.",
        gloss_tc="已承諾要交出的完成工作成果。",
        freq_form="deliverable",
        examples=[
            {
                "id": "ex-deliverable-1",
                "en": "The first deliverable is a one-page process map.",
                "tc": "第一項交付成果是一頁流程圖。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "output", "relation": "near", "difference": "Output is any result. A deliverable is an agreed hand-over."}],
        collocations=["project deliverable", "key deliverable"],
        domains=["project-management"],
    ),
    sense(
        sid="s-customer",
        entry_id="e-customer",
        pos="noun",
        ipa="/ˈkʌstəmə/",
        pronunciation_id="p-customer",
        gloss_en="A person who buys goods or services from a shop or business.",
        gloss_tc="向店舖或公司購買貨品或服務的人。",
        freq_form="customer",
        examples=[
            {
                "id": "ex-customer-1",
                "en": "A regular customer asked about the new opening hours.",
                "tc": "一位熟客詢問新的營業時間。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "client", "relation": "near", "difference": "Client is more common for professional services. Customer is more common in shops."}],
        collocations=["customer service", "regular customer"],
        domains=["retail", "business"],
    ),
    sense(
        sid="s-invoice",
        entry_id="e-invoice",
        pos="noun",
        ipa="/ˈɪnvɔɪs/",
        pronunciation_id="p-invoice",
        gloss_en="A bill that lists what was sold and how much must be paid.",
        gloss_tc="列出已售項目及應付款額的帳單。",
        freq_form="invoice",
        examples=[
            {
                "id": "ex-invoice-1",
                "en": "Please send the invoice to the accounts email.",
                "tc": "請把發票寄到會計電郵。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "bill", "relation": "near", "difference": "Bill is everyday. Invoice is the formal document used between businesses."}],
        collocations=["send an invoice", "pay the invoice"],
        domains=["business"],
    ),
    sense(
        sid="s-revenue",
        entry_id="e-revenue",
        pos="noun",
        ipa="/ˈrevənjuː/",
        pronunciation_id="p-revenue",
        gloss_en="Money a business receives from sales before costs are taken off.",
        gloss_tc="扣除成本前，生意從銷售收到的金錢。",
        freq_form="revenue",
        examples=[
            {
                "id": "ex-revenue-1",
                "en": "Weekend revenue rose after we extended opening hours.",
                "tc": "延長營業時間後，週末收入上升。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "income", "relation": "near", "difference": "Income can include wages or rent. Revenue usually means sales money."}],
        collocations=["monthly revenue", "revenue target"],
        domains=["business", "entrepreneurship"],
    ),
    sense(
        sid="s-proposal",
        entry_id="e-proposal",
        pos="noun",
        ipa="/prəˈpəʊzl/",
        pronunciation_id="p-proposal",
        gloss_en="A written plan offered for other people to accept or reject.",
        gloss_tc="供對方接受或拒絕的書面計劃。",
        freq_form="proposal",
        examples=[
            {
                "id": "ex-proposal-1",
                "en": "Her proposal explains how the shop can cut waiting time.",
                "tc": "她的建議書說明店舖如何縮短等候時間。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "plan", "relation": "related", "difference": "A plan can stay internal. A proposal is offered to someone else."}],
        collocations=["write a proposal", "accept a proposal"],
        domains=["business"],
    ),
    sense(
        sid="s-feedback",
        entry_id="e-feedback",
        pos="noun",
        ipa="/ˈfiːdbæk/",
        pronunciation_id="p-feedback",
        gloss_en="Comments on how well something worked, used to improve it.",
        gloss_tc="關於效果好壞的意見，用來改進。",
        freq_form="feedback",
        examples=[
            {
                "id": "ex-feedback-1",
                "en": "Customer feedback said the queue felt too long.",
                "tc": "顧客意見指排隊時間令人覺得太長。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "comments", "relation": "near", "difference": "Comments can be any remarks. Feedback is given so work can improve."}],
        collocations=["give feedback", "customer feedback"],
        domains=["business", "retail"],
    ),
    sense(
        sid="s-refund",
        entry_id="e-refund",
        pos="noun",
        ipa="/ˈriːfʌnd/",
        pronunciation_id="p-refund",
        gloss_en="Money paid back to a customer.",
        gloss_tc="退回給顧客的金錢。",
        freq_form="refund",
        examples=[
            {
                "id": "ex-refund-1",
                "en": "We issued a refund after the item arrived damaged.",
                "tc": "貨品送達時已損壞，我們已辦理退款。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "reimbursement", "relation": "related", "difference": "Reimbursement often pays back a cost someone already spent. A refund returns a purchase price."}],
        collocations=["issue a refund", "ask for a refund"],
        domains=["retail"],
    ),
    sense(
        sid="s-queue",
        entry_id="e-queue",
        pos="noun",
        ipa="/kjuː/",
        pronunciation_id="p-queue",
        gloss_en="A line of people waiting for their turn.",
        gloss_tc="輪候的一排人。",
        freq_form="queue",
        examples=[
            {
                "id": "ex-queue-1",
                "en": "The lunch queue reached the door by twelve.",
                "tc": "中午十二時，午膳排隊已排到門口。",
                "context": "everyday",
            }
        ],
        synonyms=[{"term": "line", "relation": "near", "difference": "Line is more common in American English. Queue is the usual British and Hong Kong word."}],
        collocations=["join the queue", "a long queue"],
        domains=["retail", "everyday"],
    ),
    sense(
        sid="s-experience",
        entry_id="e-experience",
        pos="noun",
        ipa="/ɪkˈspɪəriəns/",
        pronunciation_id="p-experience",
        gloss_en="How something feels to a person while they use a shop or service.",
        gloss_tc="顧客使用店舖或服務時的感受。",
        freq_form="experience",
        examples=[
            {
                "id": "ex-experience-1",
                "en": "A slow queue can spoil an otherwise good shopping experience.",
                "tc": "排隊太慢，即使其他環節不錯，購物體驗也會變差。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "impression", "relation": "related", "difference": "An impression is a first judgment. Experience covers the whole visit."}],
        collocations=["customer experience", "shopping experience"],
        domains=["retail", "everyday"],
    ),
    sense(
        sid="s-complaint",
        entry_id="e-complaint",
        pos="noun",
        ipa="/kəmˈpleɪnt/",
        pronunciation_id="p-complaint",
        gloss_en="A statement that something is wrong or not good enough.",
        gloss_tc="指某事有問題或未達標準的陳述。",
        freq_form="complaint",
        examples=[
            {
                "id": "ex-complaint-1",
                "en": "We logged the complaint and offered a replacement the same day.",
                "tc": "我們已記錄投訴，並在當日提供更換。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "objection", "relation": "related", "difference": "An objection is often raised in a meeting. A complaint is usually about service or a product."}],
        collocations=["make a complaint", "handle a complaint"],
        domains=["retail"],
    ),
    sense(
        sid="s-launch",
        entry_id="e-launch",
        pos="verb",
        ipa="/lɔːntʃ/",
        pronunciation_id="p-launch",
        gloss_en="To start selling or offering something new in public.",
        gloss_tc="公開推出新產品或新服務。",
        freq_form="launch",
        examples=[
            {
                "id": "ex-launch-1",
                "en": "We will launch the new loyalty card in October.",
                "tc": "我們將於十月推出新的會員卡。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "release", "relation": "near", "difference": "Release is common for software. Launch often includes the public start."}],
        collocations=["launch a product", "launch date"],
        domains=["entrepreneurship", "technology"],
    ),
    sense(
        sid="s-pivot",
        entry_id="e-pivot",
        pos="verb",
        ipa="/ˈpɪvət/",
        pronunciation_id="p-pivot",
        gloss_en="To change the main direction of a business when the first plan is not working.",
        gloss_tc="原計劃行不通時，改變生意的主要方向。",
        freq_form="pivot",
        examples=[
            {
                "id": "ex-pivot-1",
                "en": "They pivoted from a food stall to weekend catering.",
                "tc": "他們由小吃攤轉向週末到會。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "change course", "relation": "near", "difference": "Change course is ordinary English. Pivot is business slang for a planned turn."}],
        collocations=["pivot the business", "pivot to"],
        domains=["entrepreneurship"],
    ),
    sense(
        sid="s-cash-flow",
        entry_id="e-cash-flow",
        pos="noun",
        ipa="/ˈkæʃ fləʊ/",
        pronunciation_id="p-cash-flow",
        gloss_en="The money moving in and out of a business over a period.",
        gloss_tc="一段時間內流入和流出生意的現金。",
        freq_form=None,
        examples=[
            {
                "id": "ex-cash-flow-1",
                "en": "Slow cash flow made it hard to pay the supplier early.",
                "tc": "現金流偏慢，難以提早支付供應商。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "liquidity", "relation": "related", "difference": "Liquidity is a finance term for how easily assets become cash. Cash flow is the actual movement of money."}],
        collocations=["positive cash flow", "cash flow problem"],
        domains=["entrepreneurship", "business"],
        usage_note="Phrase frequency is not manufactured from cash + flow.",
    ),
    sense(
        sid="s-automate",
        entry_id="e-automate",
        pos="verb",
        ipa="/ˈɔːtəmeɪt/",
        pronunciation_id="p-automate",
        gloss_en="To make a machine or program do work that people used to do by hand.",
        gloss_tc="改由機器或程式完成以往人手做的工作。",
        freq_form="automate",
        examples=[
            {
                "id": "ex-automate-1",
                "en": "Do not automate a messy process; clean it first.",
                "tc": "不要先把混亂流程自動化；應先理順。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "computerise", "relation": "related", "difference": "Computerise means put work on a computer. Automate means the computer then does the steps."}],
        collocations=["automate the process", "automate invoices"],
        domains=["technology", "project-management"],
    ),
    sense(
        sid="s-deploy",
        entry_id="e-deploy",
        pos="verb",
        ipa="/dɪˈplɔɪ/",
        pronunciation_id="p-deploy",
        gloss_en="To put a system or update into real use.",
        gloss_tc="把系統或更新正式投入使用。",
        freq_form="deploy",
        examples=[
            {
                "id": "ex-deploy-1",
                "en": "We will deploy the till update after closing time.",
                "tc": "我們會在關門後部署收銀系統更新。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "roll out", "relation": "near", "difference": "Roll out often means introduce to users in stages. Deploy is the technical put-live step."}],
        collocations=["deploy an update", "deploy to production"],
        domains=["technology"],
    ),
    sense(
        sid="s-backup",
        entry_id="e-backup",
        pos="noun",
        ipa="/ˈbækʌp/",
        pronunciation_id="p-backup",
        gloss_en="A copy of files kept so work can be restored if the original is lost.",
        gloss_tc="另存的檔案副本，以便原本遺失時還原。",
        freq_form="backup",
        examples=[
            {
                "id": "ex-backup-1",
                "en": "Keep a backup of your study file outside this phone.",
                "tc": "請在這部手機以外另存學習檔備份。",
                "context": "everyday",
            }
        ],
        synonyms=[{"term": "copy", "relation": "related", "difference": "Any copy is a copy. A backup exists specifically for recovery."}],
        collocations=["make a backup", "restore from backup"],
        domains=["technology"],
    ),
    sense(
        sid="s-offline",
        entry_id="e-offline",
        pos="adjective",
        ipa="/ˌɒfˈlaɪn/",
        pronunciation_id="p-offline",
        gloss_en="Not connected to the internet, but still able to use saved material.",
        gloss_tc="未連接互聯網，但仍可使用已儲存的資料。",
        freq_form="offline",
        examples=[
            {
                "id": "ex-offline-1",
                "en": "The installed pack works offline after you prepare it.",
                "tc": "完成準備後，已安裝的內容可離線使用。",
                "context": "everyday",
            }
        ],
        synonyms=[],
        collocations=["work offline", "offline mode"],
        domains=["technology"],
        usage_note="No useful interchangeable synonym. Opposite of online.",
    ),
    sense(
        sid="s-schedule",
        entry_id="e-schedule",
        pos="verb",
        ipa="/ˈʃedjuːl/",
        pronunciation_id="p-schedule",
        gloss_en="To arrange for something to happen at a particular time.",
        gloss_tc="安排某事在指定時間發生。",
        freq_form="schedule",
        examples=[
            {
                "id": "ex-schedule-1",
                "en": "Let's schedule the staff briefing for Monday morning.",
                "tc": "我們把員工簡介安排在星期一上午。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "arrange", "relation": "near", "difference": "Arrange is broader. Schedule always sets a time."}],
        collocations=["schedule a meeting", "schedule a review"],
        domains=["project-management", "everyday"],
    ),
    sense(
        sid="s-confirm",
        entry_id="e-confirm",
        pos="verb",
        ipa="/kənˈfɜːm/",
        pronunciation_id="p-confirm",
        gloss_en="To say that something is true or definitely arranged.",
        gloss_tc="表明某事屬實，或已確定安排。",
        freq_form="confirm",
        examples=[
            {
                "id": "ex-confirm-1",
                "en": "Please confirm that the Saturday shift is covered.",
                "tc": "請確認星期六的更期已有人頂。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "verify", "relation": "related", "difference": "Verify checks evidence. Confirm can also mean give a definite yes."}],
        collocations=["confirm the time", "please confirm"],
        domains=["business", "everyday"],
    ),
    sense(
        sid="s-negotiate",
        entry_id="e-negotiate",
        pos="verb",
        ipa="/nɪˈɡəʊʃieɪt/",
        pronunciation_id="p-negotiate",
        gloss_en="To discuss terms until both sides can accept an agreement.",
        gloss_tc="雙方商討條件，直至可以接受協議。",
        freq_form="negotiate",
        examples=[
            {
                "id": "ex-negotiate-1",
                "en": "We negotiated a longer payment period with the supplier.",
                "tc": "我們與供應商談妥較長的付款期。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "bargain", "relation": "related", "difference": "Bargain often means argue over price. Negotiate can cover time, scope, or terms."}],
        collocations=["negotiate a price", "negotiate terms"],
        domains=["business"],
    ),
    sense(
        sid="s-follow-up",
        entry_id="e-follow-up",
        pos="verb",
        ipa="/ˌfɒləʊ ˈʌp/",
        pronunciation_id="p-follow-up",
        gloss_en="To contact someone again about a matter that is not finished.",
        gloss_tc="就尚未完成的事情再次聯絡對方。",
        freq_form=None,
        examples=[
            {
                "id": "ex-follow-up-1",
                "en": "I will follow up with the supplier if we have no reply by noon.",
                "tc": "若中午前仍未回覆，我會再跟供應商跟進。",
                "context": "work",
            }
        ],
        synonyms=[{"term": "chase", "relation": "near", "difference": "Chase is informal and can sound impatient. Follow up is the usual workplace wording."}],
        collocations=["follow up with", "follow up by email"],
        domains=["business", "project-management"],
        usage_note="Phrase frequency is not manufactured from follow + up.",
    ),
    sense(
        sid="s-please",
        entry_id="e-please",
        pos="adverb",
        ipa="/pliːz/",
        pronunciation_id="p-please",
        gloss_en="A polite word used when asking for something.",
        gloss_tc="提出要求時表示禮貌的用語。",
        freq_form="please",
        examples=[
            {
                "id": "ex-please-1",
                "en": "Please wait here while I check the stockroom.",
                "tc": "請在這裏稍候，我去貨倉查看。",
                "context": "retail",
            }
        ],
        synonyms=[],
        collocations=["please wait", "yes, please"],
        domains=["everyday"],
    ),
    sense(
        sid="s-thank",
        entry_id="e-thank",
        pos="verb",
        ipa="/θæŋk/",
        pronunciation_id="p-thank",
        gloss_en="To tell someone you are grateful.",
        gloss_tc="向對方表示感謝。",
        freq_form="thank",
        examples=[
            {
                "id": "ex-thank-1",
                "en": "Thank the customer before you hand over the bag.",
                "tc": "把袋子交給顧客前，先向對方道謝。",
                "context": "retail",
            }
        ],
        synonyms=[],
        collocations=["thank you", "thank the team"],
        domains=["everyday"],
    ),
    sense(
        sid="s-help",
        entry_id="e-help",
        pos="verb",
        ipa="/help/",
        pronunciation_id="p-help",
        gloss_en="To make it easier for someone to do something.",
        gloss_tc="協助別人，使事情較容易完成。",
        freq_form="help",
        examples=[
            {
                "id": "ex-help-1",
                "en": "I can help you find a smaller size.",
                "tc": "我可以幫你找細一碼。",
                "context": "retail",
            }
        ],
        synonyms=[{"term": "assist", "relation": "near", "difference": "Assist is more formal. Help is the ordinary word."}],
        collocations=["help you", "help with"],
        domains=["everyday"],
    ),
    sense(
        sid="s-sorry",
        entry_id="e-sorry",
        pos="adjective",
        ipa="/ˈsɒri/",
        pronunciation_id="p-sorry",
        gloss_en="Used to apologise or to show you regret a problem.",
        gloss_tc="用來道歉，或表示對問題感到抱歉。",
        freq_form="sorry",
        examples=[
            {
                "id": "ex-sorry-1",
                "en": "Sorry for the wait; the next till is opening now.",
                "tc": "抱歉讓你等候；下一個收銀櫃位現正開放。",
                "context": "retail",
            }
        ],
        synonyms=[],
        collocations=["sorry for the wait", "I am sorry"],
        domains=["everyday"],
    ),
]


AUDIO_JOBS = [
    ("p-saw", "saw", False),
    ("p-read-present", "read", False),
    ("p-read-past", "rEd", True),
    ("p-bank", "bank", False),
    ("p-close-verb", "kloUz", True),
    ("p-close-adj", "close", False),
    ("p-book", "book", False),
    ("p-check", "check", False),
    ("p-address", "address", False),
    ("p-current", "current", False),
    ("p-i", "I", False),
    ("p-you", "you", False),
    ("p-we", "we", False),
    ("p-they", "they", False),
    ("p-streamline", "streamline", False),
    ("p-process", "process", False),
    ("p-approve", "approve", False),
    ("p-deadline", "deadline", False),
    ("p-stakeholder", "stakeholder", False),
    ("p-scope", "scope", False),
    ("p-risk", "risk", False),
    ("p-update", "update", False),
    ("p-meeting", "meeting", False),
    ("p-deliverable", "deliverable", False),
    ("p-customer", "customer", False),
    ("p-invoice", "invoice", False),
    ("p-revenue", "revenue", False),
    ("p-proposal", "proposal", False),
    ("p-feedback", "feedback", False),
    ("p-refund", "refund", False),
    ("p-queue", "queue", False),
    ("p-experience", "experience", False),
    ("p-complaint", "complaint", False),
    ("p-launch", "launch", False),
    ("p-pivot", "pivot", False),
    ("p-cash-flow", "cash flow", False),
    ("p-automate", "automate", False),
    ("p-deploy", "deploy", False),
    ("p-backup", "backup", False),
    ("p-offline", "offline", False),
    ("p-schedule", "schedule", False),
    ("p-confirm", "confirm", False),
    ("p-negotiate", "negotiate", False),
    ("p-follow-up", "follow up", False),
    ("p-please", "please", False),
    ("p-thank", "thank", False),
    ("p-help", "help", False),
    ("p-sorry", "sorry", False),
]


NOTICES = """# Foundation pack notices

This pack is original teaching material prepared for Chris's Offline Vocabulary Coach.
English glosses, Traditional Chinese explanations, examples, and synonym notes were
authored for study. They are not copied from a commercial dictionary.

## Frequency

Zipf frequencies for single-word forms were computed at build time with wordfreq
{wordfreq_version} (https://github.com/rspeer/wordfreq). wordfreq data is a snapshot
through approximately 2021, not a live slang index.

Display rule (scale {scale}):
  commonness = round(100 × clamp((zipf - 2.0) / 4.5, 0, 1))

This is the app's display convention, not a published language standard. A score is
not the percentage of people who know the word, a CEFR level, or personal usefulness.
Phrases such as "cash flow" and "follow up" are marked unmeasured. Do not invent
phrase frequencies from component words.

wordfreq code is MIT-licensed. If you redistribute frequency values, keep this
attribution and review wordfreq's data-source terms.

## Audio

Pronunciation clips were generated locally with eSpeak NG (en-GB) and encoded as
32 kbit/s MP3. They are a packaged offline aid, not studio speech. IPA text is
always retained. Accent: British English, changeable only when another audio pack
exists.

## Coverage

This pack contains 50 reviewed senses. It is a foundation sample, not a general
dictionary. Absent words are absent; the app must not invent definitions.
""".format(wordfreq_version=WORDFREQ_VERSION, scale=SCALE_VERSION)


def main() -> None:
    if len(SENSES) != 50:
        raise SystemExit(f"expected 50 senses, found {len(SENSES)}")

    AUDIO.mkdir(parents=True, exist_ok=True)
    audio_records = []
    checksums: dict[str, str] = {}
    total_audio_bytes = 0

    for audio_id, spoken, phonemes in AUDIO_JOBS:
        rel = f"audio/{audio_id}.mp3"
        dest = OUT / rel
        speak(spoken, dest, phonemes=phonemes)
        digest = sha256(dest)
        size = dest.stat().st_size
        total_audio_bytes += size
        checksums[rel] = digest
        audio_records.append(
            {
                "id": audio_id,
                "accent": ACCENT,
                "mediaKey": rel,
                "hash": digest,
                "bytes": size,
                "mime": "audio/mpeg",
                "provenance": {
                    "generator": "espeak-ng",
                    "voice": "en-gb",
                    "reviewed": True,
                    "reviewDate": REVIEW_DATE,
                },
            }
        )

    pack = {
        "schemaVersion": 1,
        "packId": "foundation-50",
        "version": "1.0.0",
        "name": "Foundation 50",
        "description": "Audited 50-sense sample that proves search, study, audio, and backup.",
        "accent": ACCENT,
        "entries": ENTRIES,
        "senses": SENSES,
        "audio": audio_records,
    }
    pack_path = OUT / "pack.json"
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    checksums["pack.json"] = sha256(pack_path)

    notices_path = OUT / "NOTICES.md"
    notices_path.write_text(NOTICES, encoding="utf-8")
    checksums["NOTICES.md"] = sha256(notices_path)

    measured_count = sum(1 for item in SENSES if item["frequency"]["status"] == "measured")
    synonym_none = sum(1 for item in SENSES if item["synonymStatus"] == "none-appropriate")
    manifest = {
        "packId": "foundation-50",
        "version": "1.0.0",
        "schemaVersion": 1,
        "name": "Foundation 50",
        "accent": ACCENT,
        "entryCount": len(ENTRIES),
        "senseCount": len(SENSES),
        "audioCount": len(audio_records),
        "requiredAssets": ["pack.json", "NOTICES.md", *[item["mediaKey"] for item in audio_records]],
        "checksums": checksums,
        "byteSize": sum((OUT / name).stat().st_size for name in checksums),
        "audioBytes": total_audio_bytes,
        "completeness": {
            "meanings": "complete",
            "audio": "complete",
            "examples": "complete",
            "synonyms": "partial",
            "frequency": "measured-single-words",
            "notes": f"{synonym_none} senses have no interchangeable synonym. {measured_count} senses have wordfreq scores. Phrases are unmeasured.",
        },
        "licenses": [
            "Original teaching text: prepared for this project.",
            f"Frequency values: wordfreq {WORDFREQ_VERSION}.",
            "Audio: generated with eSpeak NG en-GB.",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "senses": len(SENSES),
        "entries": len(ENTRIES),
        "audio": len(audio_records),
        "audioBytes": total_audio_bytes,
        "out": str(OUT),
    }, indent=2))


if __name__ == "__main__":
    main()
