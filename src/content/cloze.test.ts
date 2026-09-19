import { describe, expect, it } from "vitest";
import { answersMatch, buildCloze, buildClozeForSense } from "./cloze";
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
  it("blanks half the words, rounded down, and prefers the target lemma", () => {
    const exercise = buildCloze("Please send the report before the deadline tomorrow.", ["deadline"]);
    expect(exercise.blankKeys).toHaveLength(4);
    const blanked: string[] = [];
    for (const token of exercise.tokens) {
      if (token.type === "word" && token.blank) blanked.push(token.core);
    }
    expect(blanked).toContain("deadline");
  });

  it("still blanks one word when rounding down would leave none", () => {
    const exercise = buildCloze("Hello", ["hello"]);
    expect(exercise.blankKeys).toHaveLength(1);
  });

  it("keeps punctuation outside the blank", () => {
    const exercise = buildCloze("Hello, world!", ["hello"]);
    const hello = exercise.tokens.find((token) => token.type === "word" && token.core === "Hello");
    expect(hello).toMatchObject({ leading: "", trailing: ",", blank: true });
  });

  it("compares answers without case or extra punctuation", () => {
    expect(answersMatch("Deadline", "deadline")).toBe(true);
    expect(answersMatch("don't", "dont")).toBe(false);
    expect(answersMatch("team", " group ")).toBe(false);
  });

  it("uses the full English example on a sense", () => {
    const exercise = buildClozeForSense(sense("We cannot miss the deadline today."));
    expect(exercise.sentence).toBe("We cannot miss the deadline today.");
    expect(exercise.blankKeys.length).toBe(Math.max(1, Math.floor(6 * 0.5)));
  });
});
