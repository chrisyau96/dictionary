import { describe, expect, it } from "vitest";
import { markdownToHtml, noteIsEmpty, sanitizeHtml, toSafeHtml } from "./html";

describe("note HTML helpers", () => {
  it("keeps simple markup and strips scripts", () => {
    expect(sanitizeHtml("<p>safe <strong>ok</strong></p><script>alert(1)</script>")).toBe(
      "<p>safe <strong>ok</strong></p>",
    );
  });

  it("turns markdown-ish model text into paragraphs", () => {
    expect(markdownToHtml("**envoy** is nearby")).toContain("<strong>envoy</strong>");
    expect(toSafeHtml("<p>Already HTML</p>")).toBe("<p>Already HTML</p>");
  });

  it("treats tag-only notes as empty", () => {
    expect(noteIsEmpty("<p><br></p>")).toBe(true);
    expect(noteIsEmpty("<p><strong>Connotation</strong></p><p>positive</p>")).toBe(false);
  });
});
