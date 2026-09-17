import { describe, expect, it } from "vitest";
import { DEFAULT_AI_PROMPTS, formatAiNote, rememberCommand, suggestedCommands } from "./types";

describe("AI prompt helpers", () => {
  it("formats a clean command and answer for notes", () => {
    expect(formatAiNote("Connotation", "positive")).toBe("Connotation: positive");
    expect(formatAiNote("What is the connotation? Positive, negative, or neutral — one short line.", "positive")).toBe(
      "Connotation: positive",
    );
  });

  it("keeps the last three distinct asks and surfaces them before defaults", () => {
    const recent = rememberCommand([], "tone in Cantonese");
    const next = rememberCommand(recent, "register: formal or casual?");
    const third = rememberCommand(next, "one workplace example");
    const fourth = rememberCommand(third, "tone in Cantonese");
    expect(fourth).toEqual(["tone in Cantonese", "one workplace example", "register: formal or casual?"]);
    const chips = suggestedCommands(fourth);
    expect(chips.slice(0, 3)).toEqual(fourth);
    expect(chips.slice(3)).toEqual(DEFAULT_AI_PROMPTS.map((item) => item.label));
  });
});
