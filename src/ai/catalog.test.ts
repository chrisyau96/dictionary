import { describe, expect, it } from "vitest";
import { pickFastModels } from "./catalog";

describe("pickFastModels", () => {
  it("prefers cheap fast text models and skips media or reasoning-first ids", () => {
    const picked = pickFastModels(
      {
        "gemini-2.5-flash-lite": {
          id: "gemini-2.5-flash-lite",
          name: "Gemini 2.5 Flash-Lite",
          reasoning: false,
          modalities: { input: ["text"], output: ["text"] },
          cost: { input: 0.1, output: 0.4 },
        },
        "gemini-2.5-pro": {
          id: "gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          reasoning: true,
          modalities: { input: ["text"], output: ["text"] },
          cost: { input: 1.25, output: 10 },
        },
        "gemini-tts": {
          id: "gemini-tts",
          name: "Gemini TTS",
          modalities: { input: ["text"], output: ["audio"] },
        },
      },
      [{ id: "fallback", name: "Fallback", reasoning: false }],
    );
    expect(picked[0]?.id).toBe("gemini-2.5-flash-lite");
    expect(picked.some((item) => item.id === "gemini-tts")).toBe(false);
  });
});
