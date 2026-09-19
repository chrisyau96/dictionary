import { describe, expect, it } from "vitest";
import { parseHash, toHash } from "./router";

describe("hash routes", () => {
  it("reads an API settings focus", () => {
    expect(parseHash("#/settings?focus=ai")).toEqual({ name: "settings", focus: "ai" });
    expect(toHash({ name: "settings", focus: "ai" })).toBe("#/settings?focus=ai");
    expect(parseHash("#/settings?focus=pack")).toEqual({ name: "settings", focus: "pack" });
    expect(toHash({ name: "settings", focus: "pack" })).toBe("#/settings?focus=pack");
  });

  it("treats the old starter test path as Today", () => {
    expect(parseHash("#/diagnostic")).toEqual({ name: "today" });
  });
});
