import { describe, expect, it } from "vitest";
import { extractGeminiText, hiddenWordPrompt } from "./client";

describe("Gemini answers", () => {
  it("skips thought parts so Flash-Lite thinking does not look empty", () => {
    expect(
      extractGeminiText({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { thought: true, text: "I will compare nearby words." },
                { text: "<p><strong>envoy</strong> is more formal.</p>" },
              ],
            },
          },
        ],
      }),
    ).toBe("<p><strong>envoy</strong> is more formal.</p>");
  });

  it("falls back to thought text instead of a blank answer", () => {
    expect(
      extractGeminiText({
        candidates: [
          {
            finishReason: "MAX_TOKENS",
            content: { parts: [{ thought: true, text: "Nearby: envoy, emissary." }] },
          },
        ],
      }),
    ).toBe("Nearby: envoy, emissary.");
  });

  it("hides the word instruction from the user-facing ask", () => {
    expect(hiddenWordPrompt("amendment")).toContain('English word "amendment"');
    expect(hiddenWordPrompt("amendment")).toContain("as concise as possible");
    expect(hiddenWordPrompt("amendment")).toContain("No findings");
  });

  it("returns No findings when the model has no visible text", () => {
    expect(extractGeminiText({ candidates: [{ finishReason: "STOP", content: { parts: [] } }] })).toBe(
      "<p>No findings.</p>",
    );
  });
});
