import { traditionalWithoutEnglish } from "./examples";
import type { SenseRecord } from "../types";

const STOP = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "not",
  "of",
  "on",
  "or",
  "so",
  "than",
  "that",
  "the",
  "then",
  "this",
  "to",
  "too",
  "was",
  "were",
  "with",
]);

export type ClozeToken =
  | { type: "space"; text: string }
  | {
      type: "word";
      leading: string;
      core: string;
      trailing: string;
      blank: boolean;
      key: string;
    };

export interface ClozeExercise {
  sentence: string;
  hintTc: string;
  tokens: ClozeToken[];
  blankKeys: string[];
}

function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}']+/gu, "");
}

function parseWord(raw: string): { leading: string; core: string; trailing: string } {
  const match = raw.match(/^([^\p{L}\p{N}']*)(.*?)([^\p{L}\p{N}']*)$/u);
  if (!match) return { leading: "", core: raw, trailing: "" };
  const leading = match[1] ?? "";
  const trailing = match[3] ?? "";
  const core = match[2] || raw.slice(leading.length, raw.length - trailing.length) || raw;
  return { leading, core, trailing };
}

function targetWords(sense: SenseRecord): string[] {
  const bits = [sense.frequency.form, sense.frequency.form.replaceAll("-", " ")];
  for (const col of sense.collocations) bits.push(col);
  return bits
    .flatMap((item) => item.split(/\s+/))
    .map(normalizeWord)
    .filter(Boolean);
}

function scoreWord(core: string, targets: string[]): number {
  const lower = normalizeWord(core);
  if (!lower) return -1;
  let score = core.length;
  if (targets.some((target) => target && (lower === target || lower.includes(target) || target.includes(lower)))) {
    score += 80;
  }
  if (!STOP.has(lower)) score += 12;
  if (core.length >= 6) score += 6;
  else if (core.length >= 4) score += 3;
  return score;
}

export function answersMatch(expected: string, given: string): boolean {
  return normalizeWord(expected) === normalizeWord(given);
}

export function buildCloze(sentence: string, targets: string[] = [], hintTc = ""): ClozeExercise {
  const pieces = sentence.split(/(\s+)/);
  const wordIndexes: number[] = [];
  const tokens: ClozeToken[] = pieces.map((piece, index) => {
    if (/^\s+$/.test(piece) || piece === "") return { type: "space", text: piece };
    const parsed = parseWord(piece);
    wordIndexes.push(index);
    return {
      type: "word",
      leading: parsed.leading,
      core: parsed.core,
      trailing: parsed.trailing,
      blank: false,
      key: `b${index}`,
    };
  });

  const wordTokens = tokens.filter((token): token is Extract<ClozeToken, { type: "word" }> => token.type === "word");
  let blankCount = Math.floor(wordTokens.length * 0.5);
  if (blankCount < 1 && wordTokens.length > 0) blankCount = 1;

  const ranked = wordTokens
    .map((token, order) => ({ token, order, score: scoreWord(token.core, targets) }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, blankCount);

  const blankKeys = new Set(ranked.map((item) => item.token.key));
  for (const token of tokens) {
    if (token.type === "word" && blankKeys.has(token.key)) token.blank = true;
  }

  return {
    sentence,
    hintTc,
    tokens,
    blankKeys: ranked.map((item) => item.token.key),
  };
}

export function buildClozeForSense(sense: SenseRecord): ClozeExercise {
  const example = sense.examples[0];
  const sentence = example?.en?.trim() || sense.glossEn;
  const hintTc = example ? traditionalWithoutEnglish(example.tc, sense.glossTc) : sense.glossTc;
  return buildCloze(sentence, targetWords(sense), hintTc);
}

export function clozeCoreByKey(exercise: ClozeExercise, key: string): string {
  const token = exercise.tokens.find((item) => item.type === "word" && item.key === key);
  return token && token.type === "word" ? token.core : "";
}
