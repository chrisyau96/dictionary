import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/database";
import { newCardRecord } from "../scheduler/schedule";
import { markSenseKnown, rateCard, reAddToMyWords, removeFromMyWords, undoLastReview } from "./session";

describe("review recording", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("writes the card and event in one step and ignores a rapid double tap", async () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const card = newCardRecord("s-1", "e-1", "recognition", 0.9, now);
    await db.cards.put(card);
    await rateCard(card.id, 3, now);
    await rateCard(card.id, 3, new Date(now.getTime() + 100));
    const events = await db.reviewEvents.toArray();
    expect(events).toHaveLength(1);
    const stored = await db.cards.get(card.id);
    expect(stored?.scheduler.reps).toBeGreaterThan(0);
  });

  it("undo restores the prior schedule and voids the event", async () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const card = newCardRecord("s-1", "e-1", "recognition", 0.9, now);
    await db.cards.put(card);
    await rateCard(card.id, 4, now);
    const after = await db.cards.get(card.id);
    expect(await undoLastReview()).toBe(true);
    const restored = await db.cards.get(card.id);
    expect(restored?.scheduler.due).toBe(card.scheduler.due);
    expect(after?.scheduler.due).not.toBe(card.scheduler.due);
    expect((await db.reviewEvents.toArray())[0]?.undone).toBe(true);
  });

  it("marking known does not pause cards or invent review events", async () => {
    const card = newCardRecord("s-1", "e-1", "recognition");
    await db.cards.put(card);
    await db.userWords.put({
      id: "word:s-1",
      senseId: "s-1",
      entryId: "e-1",
      savedAt: "2026-01-01T00:00:00.000Z",
      status: "learning",
      notes: "",
      usefulness: null,
      reason: "Saved by you",
      membership: "active",
      removedAt: null,
      knownEvidence: null,
      recommend: "include",
    });
    await markSenseKnown("s-1");
    expect((await db.cards.get(card.id))?.paused).toBe(false);
    expect(await db.reviewEvents.count()).toBe(0);
    expect((await db.userWords.get("word:s-1"))?.knownEvidence).toBe("self-declared");
  });

  it("remove and re-add keep history", async () => {
    const card = newCardRecord("s-1", "e-1", "recognition");
    await db.cards.put(card);
    await db.userWords.put({
      id: "word:s-1",
      senseId: "s-1",
      entryId: "e-1",
      savedAt: "2026-01-01T00:00:00.000Z",
      status: "learning",
      notes: "keep me",
      usefulness: null,
      reason: "Saved by you",
      membership: "active",
      removedAt: null,
      knownEvidence: null,
      recommend: "include",
    });
    await db.reviewEvents.put({
      id: "evt-1",
      cardId: card.id,
      senseId: "s-1",
      task: "recognition",
      ratedAt: "2026-01-02T00:00:00.000Z",
      studyDay: "2026-01-02",
      rating: 3,
      prior: card.scheduler,
      next: card.scheduler,
      undone: false,
      sessionType: "scheduled",
      hinted: false,
    });
    await removeFromMyWords("s-1");
    expect((await db.userWords.get("word:s-1"))?.membership).toBe("removed");
    expect((await db.cards.get(card.id))?.paused).toBe(true);
    await reAddToMyWords("s-1");
    expect((await db.userWords.get("word:s-1"))?.notes).toBe("keep me");
    expect(await db.reviewEvents.count()).toBe(1);
    expect((await db.userWords.get("word:s-1"))?.membership).toBe("active");
  });
});
