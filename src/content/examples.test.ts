import { describe, expect, it } from "vitest";
import { traditionalWithoutEnglish } from "./examples";

describe("Traditional Chinese examples", () => {
  it("does not keep English collocations inside the translation", () => {
    expect(traditionalWithoutEnglish("把「angel round」寫在白板上。", "天使投資人的一輪融資")).toBe(
      "把這個用法寫在白板上。",
    );
    expect(traditionalWithoutEnglish("簡報談到「appointment time」。", "預約時間")).toBe("簡報談到這個用法。");
    expect(traditionalWithoutEnglish("排隊短一點，我就會「make an appointment」。", "預約")).toBe(
      "排隊短一點，我就會這個用法。",
    );
  });
});
