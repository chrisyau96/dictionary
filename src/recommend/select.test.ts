import { describe, expect, it } from "vitest";
import { defaultProfile } from "../db/database";
import type { SenseRecord } from "../types";
import { pickNewSenses, recommendationReason } from "./select";

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
    examples: [],
    synonyms: [],
    synonymStatus: "none-appropriate",
    collocations: [],
    frequency: { form: id, zipf: 4, commonness: 44, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
    selection: "learn",
    ...extra,
  };
}

describe("new-sense selection", () => {
  it("prioritizes saved senses and explains the reason", () => {
    const profile = defaultProfile();
    const saved = pickNewSenses(
      [sense("a"), sense("b")],
      profile,
      [{ id: "w", senseId: "b", entryId: "e-b", savedAt: "", status: "learning", notes: "", usefulness: null, reason: "Saved by you" }],
      new Set(),
      1,
    );
    expect(saved[0]?.id).toBe("b");
    expect(recommendationReason(saved[0]!, true, profile)).toBe("Saved by you");
  });

  it("does not auto-select calibration words or rejected feedback", () => {
    const profile = defaultProfile();
    const picked = pickNewSenses(
      [
        sense("i", { selection: "calibration" }),
        sense("x", { selection: "learn" }),
      ],
      profile,
      [{ id: "w", senseId: "x", entryId: "e-x", savedAt: "", status: "learning", notes: "", usefulness: "too-easy", reason: "" }],
      new Set(),
      5,
    );
    expect(picked.map((item) => item.id)).toEqual([]);
  });
});
