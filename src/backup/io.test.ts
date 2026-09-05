import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/database";
import { exportBackup, previewBackup, restoreBackup } from "./io";
import { newCardRecord } from "../scheduler/schedule";

describe("backup", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("round-trips user words, events, and scheduler state", async () => {
    const card = newCardRecord("s-1", "e-1", "recognition");
    await db.userWords.put({
      id: "word:s-1",
      senseId: "s-1",
      entryId: "e-1",
      savedAt: "2026-01-01T00:00:00.000Z",
      status: "learning",
      notes: "shop",
      usefulness: null,
      reason: "Saved by you",
      membership: "active",
      removedAt: null,
      knownEvidence: null,
      recommend: "include",
    });
    await db.cards.put(card);
    await db.reviewEvents.put({
      id: "evt-1",
      cardId: card.id,
      senseId: "s-1",
      task: "recognition",
      ratedAt: "2026-01-01T00:00:01.000Z",
      studyDay: "2026-01-01",
      rating: 3,
      prior: card.scheduler,
      next: card.scheduler,
      undone: false,
      sessionType: "scheduled",
      hinted: false,
    });

    const backup = await exportBackup();
    expect(previewBackup(backup).ok).toBe(true);
    await db.userWords.clear();
    await db.cards.clear();
    await db.reviewEvents.clear();
    await restoreBackup(backup);
    expect(await db.userWords.count()).toBe(1);
    expect((await db.userWords.get("word:s-1"))?.notes).toBe("shop");
    expect((await db.reviewEvents.get("evt-1"))?.id).toBe("evt-1");
    expect((await db.cards.get(card.id))?.scheduler.due).toBe(card.scheduler.due);
  });

  it("rejects a random JSON file", () => {
    expect(previewBackup({ hello: true }).ok).toBe(false);
  });

  it("still restores a version 1 backup", async () => {
    const card = newCardRecord("s-1", "e-1", "recognition");
    const parsed = previewBackup({
      kind: "vocab-coach-backup",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      appVersion: "0.1.0",
      contentRefs: [],
      userWords: [
        {
          id: "word:s-1",
          senseId: "s-1",
          entryId: "e-1",
          savedAt: "2026-01-01T00:00:00.000Z",
          status: "learning",
          notes: "old",
          usefulness: null,
          reason: "Saved by you",
        },
      ],
      cards: [card],
      reviewEvents: [
        {
          id: "evt-1",
          cardId: card.id,
          senseId: "s-1",
          task: "recognition",
          ratedAt: "2026-01-01T00:00:01.000Z",
          rating: 3,
          prior: card.scheduler,
          next: card.scheduler,
          undone: false,
        },
      ],
      profile: { id: "profile" },
      localRequests: [],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await restoreBackup(parsed.backup);
    expect((await db.userWords.get("word:s-1"))?.membership).toBe("active");
    expect((await db.reviewEvents.get("evt-1"))?.studyDay).toBeTruthy();
  });
});
