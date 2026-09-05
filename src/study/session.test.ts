import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/database";
import { newCardRecord } from "../scheduler/schedule";
import { rateCard } from "./session";

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
});
