import { describe, expect, it } from "vitest";
import { pickXTicks } from "./chartTicks";

describe("pickXTicks", () => {
  it("does not place adjacent day labels on a 30-day chart", () => {
    const ticks = pickXTicks(30);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(29);
    expect(ticks).not.toContain(1);
    for (let i = 1; i < ticks.length; i += 1) {
      expect((ticks[i] ?? 0) - (ticks[i - 1] ?? 0)).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps 7-day charts to the first and last day", () => {
    expect(pickXTicks(7)).toEqual([0, 6]);
  });

  it("spreads 90-day labels with a usable gap", () => {
    const ticks = pickXTicks(90);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(89);
    expect(ticks.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < ticks.length; i += 1) {
      expect((ticks[i] ?? 0) - (ticks[i - 1] ?? 0)).toBeGreaterThanOrEqual(8);
    }
  });
});
