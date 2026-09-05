import { describe, expect, it } from "vitest";
import { defaultProfile } from "../db/database";
import type { SenseRecord, UserWordRecord } from "../types";
import { pickNewSenses } from "./select";

function sense(id: string, extra: Partial<SenseRecord> = {}): SenseRecord {
  return {
    id,
    entryId: `e-${id}`,
    packId: "p",
    pos: "noun",
    ipa: "",
    pronunciationId: id,
    glossEn: id,
    glossTc: id,
    usageNote: null,
    domains: ["project-management"],
    examples: [{ id: "ex", en: `Please ${id} the process.`, tc: "請處理。", context: "work" }],
    synonyms: [],
    synonymStatus: "not_prepared",
    collocations: [`${id} the process`],
    frequency: { form: id, zipf: 4, commonness: 44, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
    selection: "learn",
    ...extra,
  };
}

function saved(senseId: string, extra: Partial<UserWordRecord> = {}): UserWordRecord {
  return {
    id: `w-${senseId}`,
    senseId,
    entryId: `e-${senseId}`,
    savedAt: "",
    status: "learning",
    notes: "",
    usefulness: null,
    reason: "Saved by you",
    membership: "active",
    removedAt: null,
    knownEvidence: null,
    recommend: "include",
    ...extra,
  };
}

describe("new-sense selection", () => {
  it("prioritizes saved senses", () => {
    const profile = defaultProfile();
    const picked = pickNewSenses([sense("a"), sense("b")], profile, [saved("b")], new Set(), 1);
    expect(picked[0]?.id).toBe("b");
  });

  it("does not auto-select calibration, closed-class, known, or rejected words", () => {
    const profile = defaultProfile();
    const picked = pickNewSenses(
      [
        sense("i", { pos: "pronoun", frequency: { form: "I", zipf: 7, commonness: 96, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" }, selection: "calibration" }),
        sense("you", { pos: "pronoun", frequency: { form: "you", zipf: 7, commonness: 95, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" } }),
        sense("easy", { frequency: { form: "easy", zipf: 5, commonness: 88, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" } }),
        sense("known", {}),
        sense("skip", {}),
      ],
      { ...profile, estimatedBand: "workplace" },
      [saved("known", { status: "known", knownEvidence: "self-declared", recommend: "exclude" }), saved("skip", { usefulness: "too-easy", recommend: "exclude" })],
      new Set(),
      5,
    );
    expect(picked.map((item) => item.id)).toEqual([]);
  });

  it("does not rank solely by commonness", () => {
    const profile = { ...defaultProfile(), estimatedBand: "professional" as const };
    const picked = pickNewSenses(
      [
        sense("common", { frequency: { form: "common", zipf: 5.5, commonness: 70, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" } }),
        sense("precise", { frequency: { form: "precise", zipf: 3.4, commonness: 22, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" } }),
      ],
      profile,
      [],
      new Set(),
      1,
    );
    expect(picked[0]?.id).toBe("precise");
  });
});
