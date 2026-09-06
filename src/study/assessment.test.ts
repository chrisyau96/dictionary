import { describe, expect, it } from "vitest";
import { buildAssessmentQueue, ensureMcq, evaluateAssessment, routeAfterBlock } from "./assessment";
import { ASSESSMENT_ITEMS } from "./assessmentItems";
import { ASSESSMENT_LENGTH, type AssessmentResponse } from "../types";

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
    expect(result.overallCorrect).toBe(16);
    expect(result.overallTotal).toBe(24);
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/cefr|b1|b2|c1/);
  });

  it("builds a 20-item multiple-choice check", () => {
    const queue = buildAssessmentQueue("workplace");
    expect(queue).toHaveLength(ASSESSMENT_LENGTH);
    expect(queue.every((item) => ensureMcq(item).options?.length === 4)).toBe(true);
  });
});
