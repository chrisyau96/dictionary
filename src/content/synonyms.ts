import type { SenseRecord, SynonymStatus } from "../types";

const CLOSED_CLASS_POS = new Set(["pronoun", "determiner", "article", "preposition", "conjunction", "auxiliary"]);

const CLOSED_CLASS_FORMS = new Set([
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "it",
  "me",
  "my",
  "your",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "as",
  "be",
  "is",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "not",
  "also",
  "just",
  "only",
  "very",
  "can",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "must",
]);

export function isClosedClassSense(sense: Pick<SenseRecord, "pos" | "frequency">): boolean {
  if (CLOSED_CLASS_POS.has(sense.pos.toLowerCase())) return true;
  const form = (sense.frequency.form || "").trim().toLowerCase();
  return CLOSED_CLASS_FORMS.has(form);
}

export function canonicalizeSynonymStatus(
  raw: string | undefined,
  synonyms: { term?: string }[] | undefined,
  sense: Pick<SenseRecord, "pos" | "frequency">,
): SynonymStatus {
  const list = (synonyms ?? []).filter((item) => item.term && item.term.trim());
  if (raw === "available" || raw === "authored") {
    return list.length ? "available" : isClosedClassSense(sense) ? "none_appropriate" : "not_prepared";
  }
  if (raw === "none_appropriate" || raw === "none-appropriate") {
    if (list.length) return "available";
    return isClosedClassSense(sense) ? "none_appropriate" : "not_prepared";
  }
  if (raw === "not_prepared") return "not_prepared";
  if (list.length) return "available";
  return isClosedClassSense(sense) ? "none_appropriate" : "not_prepared";
}

export function normalizeSenseSynonyms<T extends Pick<SenseRecord, "pos" | "frequency" | "synonyms"> & { synonymStatus?: string }>(
  sense: T,
): T & { synonymStatus: SynonymStatus } {
  return {
    ...sense,
    synonymStatus: canonicalizeSynonymStatus(sense.synonymStatus, sense.synonyms, sense),
  };
}
