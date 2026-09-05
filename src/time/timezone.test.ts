import { describe, expect, it } from "vitest";
import { studyDayKey } from "./timezone";

describe("study-day grouping", () => {
  it("keeps Hong Kong late evening on the same local date", () => {
    const utc = new Date("2026-03-01T16:30:00.000Z");
    expect(studyDayKey(utc, "Asia/Hong_Kong")).toBe("2026-03-02");
    expect(studyDayKey(utc, "UTC")).toBe("2026-03-01");
  });
});
