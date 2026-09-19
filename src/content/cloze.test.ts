import { describe, expect, it } from "vitest";
import { answersMatch, buildCloze, buildClozeForSense, isHintSlot, letterHint, lettersAnswer, seedClozeLetters } from "./cloze";
import type { SenseRecord } from "../types";

function sense(example: string, form = "deadline"): SenseRecord {
  return {
    id: "s-1",
    entryId: "e-1",
    packId: "p",
    pos: "noun",
    ipa: "",
    pronunciationId: "p-1",
    glossEn: "a time when work must be finished",
    glossTc: "限期",
    usageNote: null,
    domains: ["everyday"],
    examples: [{ id: "ex-1", en: example, tc: "請在限期前完成。", context: "" }],
    synonyms: [],
    synonymStatus: "not_prepared",
    collocations: ["miss a deadline"],
    frequency: {
      form,
      zipf: 4,
      commonness: 40,
      source: "wordfreq",
      sourceVersion: "3.1.1",
      scaleVersion: "v1",
      status: "measured",
    },
    selection: "learn",
  };
}

describe("cloze blanks", () => {
  it("blanks only the target wording, not half the sentence", () => {
    const exercise = buildCloze("Please send the report before the deadline tomorrow.", ["deadline"]);
    const blanked: string[] = [];
    for (const token of exercise.tokens) {
      if (token.type === "word" && token.blank) blanked.push(token.core);
    }
    expect(blanked).toEqual(["deadline"]);
    expect(exercise.blankKeys).toHaveLength(1);
  });

  it("still blanks the wording when it is the only word", () => {
    const exercise = buildCloze("Hello", ["hello"]);
    expect(exercise.blankKeys).toHaveLength(1);
  });

  it("keeps punctuation outside the blank", () => {
    const exercise = buildCloze("Hello, world!", ["hello"]);
    const hello = exercise.tokens.find((token) => token.type === "word" && token.core === "Hello");
    expect(hello).toMatchObject({ leading: "", trailing: ",", blank: true });
  });

  it("gives the first letter as the hint", () => {
    expect(letterHint("deadline")).toBe("d");
    expect(letterHint("Apple")).toBe("A");
    expect(isHintSlot("deadline", 0)).toBe(true);
    expect(isHintSlot("deadline", 1)).toBe(false);
  });

  it("seeds answers with the letter hint", () => {
    const exercise = buildCloze("We missed the deadline.", ["deadline"]);
    const seeded = seedClozeLetters(exercise);
    expect(seeded.b6?.[0]).toBe("d");
    expect(seeded.b6?.slice(1).join("")).toBe("");
    expect(lettersAnswer(seeded.b6)).toBe("d");
  });

  it("uses only the wording when the sentence does not contain it", () => {
    const exercise = buildCloze("Hello there.", ["deadline"]);
    expect(exercise.blankKeys).toEqual(["b-wording"]);
    const cores = exercise.tokens.filter((token) => token.type === "word").map((token) => token.core);
    expect(cores).toEqual(["deadline"]);
  });

  it("does not blank short words that only prefix the wording", () => {
    const exercise = buildCloze("A customer asked about an angel investor.", ["angel"]);
    const blanked: string[] = [];
    for (const token of exercise.tokens) {
      if (token.type === "word" && token.blank) blanked.push(token.core);
    }
    expect(blanked).toEqual(["angel"]);
  });

  it("compares answers without case or extra punctuation", () => {
    expect(answersMatch("Deadline", "deadline")).toBe(true);
    expect(answersMatch("don't", "dont")).toBe(false);
    expect(answersMatch("team", " group ")).toBe(false);
  });

  it("uses the full English example and blanks the wording on a sense", () => {
    const exercise = buildClozeForSense(sense("We cannot miss the deadline today."));
    expect(exercise.sentence).toBe("We cannot miss the deadline today.");
    const blanked: string[] = [];
    for (const token of exercise.tokens) {
      if (token.type === "word" && token.blank) blanked.push(token.core);
    }
    expect(blanked).toEqual(["deadline"]);
  });
});
