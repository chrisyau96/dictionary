import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/database";
import { canonicalizeSynonymStatus } from "../content/synonyms";
import { getOrCreateDailyPlan, replacePlanItem } from "./plan";
import type { SenseRecord } from "../types";

function sense(id: string, commonness: number): SenseRecord {
  return {
    id,
    entryId: `e-${id}`,
    packId: "p",
    pos: "verb",
    ipa: "",
    pronunciationId: id,
    glossEn: id,
    glossTc: id,
    usageNote: null,
    domains: ["business"],
    examples: [{ id: "ex", en: `Please ${id} this.`, tc: "請處理。", context: "work" }],
    synonyms: [],
    synonymStatus: "not_prepared",
    collocations: [id],
    frequency: { form: id, zipf: 3.5, commonness, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
    selection: "learn",
  };
}

describe("daily plan", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.senses.bulkPut([
      sense("streamline", 26),
      sense("mitigate", 24),
      sense("handover", 30),
      sense("invoice", 40),
      sense("stakeholder", 28),
      sense("escalate", 22),
    ]);
  });

  it("reopening the same study day does not mint a new batch", async () => {
    const now = new Date("2026-09-05T04:00:00.000Z");
    const first = await getOrCreateDailyPlan(now);
    const again = await getOrCreateDailyPlan(new Date("2026-09-05T10:00:00.000Z"));
    expect(again.id).toBe(first.id);
    expect(again.items.map((item) => item.senseId)).toEqual(first.items.map((item) => item.senseId));
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.items.length).toBeLessThanOrEqual(5);
  });

  it("replace swaps one item once without duplicating the day", async () => {
    const now = new Date("2026-09-05T04:00:00.000Z");
    const plan = await getOrCreateDailyPlan(now);
    const original = plan.items[0];
    const next = await replacePlanItem(original.senseId, "replaced", now);
    expect(next.items.some((item) => item.senseId === original.senseId && item.status === "replaced")).toBe(true);
    const active = next.items.filter((item) => item.status === "not-started");
    expect(active.some((item) => item.senseId === original.senseId)).toBe(false);
  });
});

describe("synonym status", () => {
  it("does not treat an empty field as proof that no synonym exists", () => {
    expect(
      canonicalizeSynonymStatus("none-appropriate", [], {
        pos: "verb",
        frequency: { form: "streamline", zipf: 3, commonness: 26, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
      }),
    ).toBe("not_prepared");
    expect(
      canonicalizeSynonymStatus("authored", [{ term: "simplify" }], {
        pos: "verb",
        frequency: { form: "streamline", zipf: 3, commonness: 26, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
      }),
    ).toBe("available");
    expect(
      canonicalizeSynonymStatus("none-appropriate", [], {
        pos: "pronoun",
        frequency: { form: "I", zipf: 7, commonness: 96, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" },
      }),
    ).toBe("none_appropriate");
  });
});
