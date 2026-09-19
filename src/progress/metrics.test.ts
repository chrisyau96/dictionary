import { describe, expect, it } from "vitest";
import { computeProgress, consecutiveStreak, wordListTab } from "./metrics";
import { newCardRecord } from "../scheduler/schedule";
import type { ReviewEventRecord, UserWordRecord } from "../types";

function word(senseId: string, extra: Partial<UserWordRecord> = {}): UserWordRecord {
  return {
    id: `word:${senseId}`,
    senseId,
    entryId: `e-${senseId}`,
    savedAt: "2026-09-01T00:00:00.000Z",
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

describe("progress KPIs", () => {
  it("does not count saves, retries, or self-declared known as learned vocabulary", () => {
    const timezone = "Asia/Hong_Kong";
    const now = new Date("2026-09-05T04:00:00.000Z");
    const card = newCardRecord("s-1", "e-1", "recognition", 0.9, new Date("2026-09-04T04:00:00.000Z"));
    const prior = { ...card.scheduler, last_review: "2026-09-03T04:00:00.000Z", reps: 2 };
    const first: ReviewEventRecord = {
      id: "a",
      cardId: card.id,
      senseId: "s-1",
      task: "recognition",
      ratedAt: "2026-09-05T04:00:00.000Z",
      studyDay: "2026-09-05",
      rating: 1,
      prior,
      next: card.scheduler,
      undone: false,
      sessionType: "scheduled",
      hinted: false,
    };
    const retry: ReviewEventRecord = {
      ...first,
      id: "b",
      ratedAt: "2026-09-05T04:05:00.000Z",
      rating: 4,
    };
    const snapshot = computeProgress(
      now,
      timezone,
      [card],
      [first, retry],
      [word("s-saved-only"), word("s-1"), word("s-known", { status: "known", knownEvidence: "self-declared" })],
      [],
    );
    expect(snapshot.newVocabulary7d).toBe(1);
    expect(snapshot.reviewsCompletedToday).toBe(1);
    expect(snapshot.reviewAttemptsToday).toBe(2);
    expect(snapshot.rememberedThroughReview).toBe(0);
    expect(snapshot.selfDeclaredKnown).toBe(1);
    expect(snapshot.delayedRecall.total).toBe(1);
    expect(snapshot.delayedRecall.success).toBe(0);
    expect(snapshot.learningCount).toBe(2);
    expect(snapshot.learntCount).toBe(1);
  });

  it("shows an empty delayed-recall state when history is missing", () => {
    const snapshot = computeProgress(new Date("2026-09-05T04:00:00.000Z"), "UTC", [], [], [], []);
    expect(snapshot.delayedRecall.total).toBe(0);
    expect(snapshot.newVocabulary7d).toBe(0);
  });

  it("splits My Words into learning, learnt, and skipped", () => {
    expect(wordListTab(word("s-learn"), [], [], "UTC")).toBe("learning");
    expect(wordListTab(word("s-known", { status: "known", knownEvidence: "self-declared" }), [], [], "UTC")).toBe("learnt");
    expect(wordListTab(word("s-skip", { usefulness: "not-useful", recommend: "exclude", status: "paused" }), [], [], "UTC")).toBe("skipped");
  });

  it("keeps skipped and untouched topic words empty in coverage", () => {
    const senses = [
      {
        id: "s-learn",
        entryId: "e-learn",
        packId: "p",
        pos: "noun",
        ipa: "",
        pronunciationId: "p-learn",
        glossEn: "learn",
        glossTc: "學",
        usageNote: null,
        domains: ["everyday" as const],
        examples: [],
        synonyms: [],
        synonymStatus: "not_prepared" as const,
        collocations: [],
        frequency: { form: "learn", zipf: 4, commonness: 40, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" as const },
        selection: "learn" as const,
      },
      {
        id: "s-skip",
        entryId: "e-skip",
        packId: "p",
        pos: "noun",
        ipa: "",
        pronunciationId: "p-skip",
        glossEn: "skip",
        glossTc: "略",
        usageNote: null,
        domains: ["everyday" as const],
        examples: [],
        synonyms: [],
        synonymStatus: "not_prepared" as const,
        collocations: [],
        frequency: { form: "skip", zipf: 4, commonness: 40, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" as const },
        selection: "learn" as const,
      },
    ];
    const card = newCardRecord("s-learn", "e-learn", "recognition", 0.9, new Date("2026-09-04T04:00:00.000Z"));
    const snapshot = computeProgress(
      new Date("2026-09-05T04:00:00.000Z"),
      "UTC",
      [card],
      [],
      [
        word("s-learn"),
        word("s-skip", { usefulness: "not-useful", recommend: "exclude", status: "paused" }),
        word("s-idle"),
      ],
      senses,
    );
    const everyday = snapshot.coverage.find((row) => row.domain === "everyday");
    expect(everyday?.learning).toBe(1);
    expect(everyday?.reviewVerified).toBe(0);
    expect(everyday?.selfDeclared).toBe(0);
    expect(everyday?.notStarted).toBe(1);
  });

  it("counts learn and revision strikes from consecutive days", () => {
    expect(consecutiveStreak(["2026-09-03", "2026-09-04", "2026-09-05"], "2026-09-05")).toBe(3);
    expect(consecutiveStreak(["2026-09-03", "2026-09-04"], "2026-09-05")).toBe(2);
    expect(consecutiveStreak(["2026-09-01"], "2026-09-05")).toBe(0);
  });
});
