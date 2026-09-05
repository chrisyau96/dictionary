import { describe, expect, it } from "vitest";
import { evaluateAssessment, routeAfterBlock, scoreTyped } from "./assessment";
import { ASSESSMENT_ITEMS } from "./assessmentItems";
import type { AssessmentResponse } from "../types";

function response(itemId: string, outcome: AssessmentResponse["outcome"]): AssessmentResponse {
  const item = ASSESSMENT_ITEMS.find((row) => row.id === itemId)!;
  return {
    itemId,
    itemVersion: "v1",
    senseId: item.senseId,
    band: item.band,
    skill: item.skill,
    outcome,
    answer: "",
    ratedAt: "2026-09-05T00:00:00.000Z",
  };
}

describe("adaptive vocabulary check", () => {
  it("routes a strong block upward and a weak block downward", () => {
    expect(routeAfterBlock("workplace", ["correct", "correct", "correct", "correct", "incorrect"])).toBe("professional");
    expect(routeAfterBlock("workplace", ["incorrect", "unknown", "incorrect", "correct", "unknown"])).toBe("everyday");
    expect(routeAfterBlock("workplace", ["correct", "incorrect", "correct", "unknown", "correct"])).toBe("workplace");
  });

  it("keeps recognition and production separate and does not claim a CEFR level", () => {
    const responses = [
      ...ASSESSMENT_ITEMS.filter((item) => item.skill === "recognition").slice(0, 16).map((item) => response(item.id, "correct")),
      ...ASSESSMENT_ITEMS.filter((item) => item.skill === "production").slice(0, 8).map((item) => response(item.id, "incorrect")),
    ];
    const result = evaluateAssessment(responses);
    expect(result.recognitionCorrect).toBe(16);
    expect(result.productionCorrect).toBe(0);
    expect(result.note.toLowerCase()).toMatch(/recognition was stronger|word-use/);
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/cefr|b1|b2|c1/);
  });

  it("scores typed production conservatively", () => {
    const item = ASSESSMENT_ITEMS.find((row) => row.id === "p-pr-1")!;
    expect(scoreTyped(item, " Streamline. ")).toBe("correct");
    expect(scoreTyped(item, "simplify")).toBe("incorrect");
    expect(scoreTyped(item, "")).toBe("unknown");
  });
});
