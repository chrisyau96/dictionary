import { traditionalWithoutEnglish } from "./examples";
import type { SenseRecord } from "../types";

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
  const form = (sense.frequency.form || "").trim();
  if (!form) return [];
  const whole = normalizeWord(form);
  const parts = form
    .replaceAll("-", " ")
    .split(/\s+/)
    .map(normalizeWord)
    .filter((item) => item.length >= 3 || item === whole);
  return [...new Set([whole, ...parts].filter(Boolean))];
}

function isTargetCore(core: string, targets: string[]): boolean {
  const lower = normalizeWord(core);
  if (!lower) return false;
  return targets.some((target) => {
    if (!target) return false;
    if (lower === target) return true;
    if (target.length < 3) return false;
    const delta = Math.abs(lower.length - target.length);
    if (delta > 3) return false;
    return lower.startsWith(target) || target.startsWith(lower);
  });
}

export function answersMatch(expected: string, given: string): boolean {
  return normalizeWord(expected) === normalizeWord(given);
}

export function letterHint(core: string): string {
  const match = core.match(/\p{L}/u);
  return match?.[0] ?? core.slice(0, 1);
}

export function isHintSlot(core: string, index: number): boolean {
  const chars = [...core];
  const ch = chars[index] ?? "";
  if (index === 0) return true;
  return !/\p{L}/u.test(ch);
}

export function seedClozeLetters(exercise: ClozeExercise): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const key of exercise.blankKeys) {
    const core = clozeCoreByKey(exercise, key);
    next[key] = [...core].map((ch, index) => (isHintSlot(core, index) ? ch : ""));
  }
  return next;
}

export function lettersAnswer(letters: string[] | undefined): string {
  return (letters ?? []).join("");
}

export function buildCloze(sentence: string, targets: string[] = [], hintTc = ""): ClozeExercise {
  const pieces = sentence.split(/(\s+)/);
  const tokens: ClozeToken[] = pieces.map((piece, index) => {
    if (/^\s+$/.test(piece) || piece === "") return { type: "space", text: piece };
    const parsed = parseWord(piece);
    return {
      type: "word",
      leading: parsed.leading,
      core: parsed.core,
      trailing: parsed.trailing,
      blank: false,
      key: `b${index}`,
    };
  });

  const blankKeys: string[] = [];
  for (const token of tokens) {
    if (token.type !== "word") continue;
    if (!isTargetCore(token.core, targets)) continue;
    token.blank = true;
    blankKeys.push(token.key);
  }

  if (!blankKeys.length) {
    const wording = targets[0] || sentence.split(/\s+/).find(Boolean) || "word";
    return {
      sentence,
      hintTc,
      tokens: [
        {
          type: "word",
          leading: "",
          core: wording,
          trailing: "",
          blank: true,
          key: "b-wording",
        },
      ],
      blankKeys: ["b-wording"],
    };
  }

  return { sentence, hintTc, tokens, blankKeys };
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
