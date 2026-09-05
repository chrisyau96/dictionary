import { describe, expect, it } from "vitest";
import { applyRating, newCardRecord, SCHEDULER_VERSION } from "./schedule";

describe("FSRS card scheduling", () => {
  it("keeps recognition and production as separate card identities", () => {
    const recognition = newCardRecord("s-1", "e-1", "recognition");
    const production = newCardRecord("s-1", "e-1", "production");
    expect(recognition.id).not.toBe(production.id);
    expect(recognition.schedulerVersion).toBe(SCHEDULER_VERSION);
  });

  it("records Again without treating a late review as a new word", () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    const later = new Date("2026-01-08T00:00:00.000Z");
    const card = newCardRecord("s-1", "e-1", "recognition", 0.9, created);
    const first = applyRating(card, 3, created);
    const late = applyRating(first.next, 1, later);
    expect(late.next.scheduler.reps).toBeGreaterThan(0);
    expect(late.next.introducedAt).toBe(card.introducedAt);
    expect(late.prior.due).toBe(first.next.scheduler.due);
  });
});
