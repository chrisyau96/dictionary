import { describe, expect, it } from "vitest";
import { zipfToCommonness } from "./commonness";

describe("commonness scale v1", () => {
  it("matches the documented wordfreq examples", () => {
    expect(zipfToCommonness(7.73)).toBe(100);
    expect(zipfToCommonness(5.26)).toBe(72);
    expect(zipfToCommonness(4.36)).toBe(52);
  });

  it("saturates at the top band and does not go below zero", () => {
    expect(zipfToCommonness(6.5)).toBe(100);
    expect(zipfToCommonness(2)).toBe(0);
    expect(zipfToCommonness(1.2)).toBe(0);
  });
});
