import { describe, expect, it } from "vitest";
import { markdownToHtml, noteIsEmpty, parseListLine, sanitizeHtml, tidyHtml, toSafeHtml } from "./html";

describe("note HTML helpers", () => {
  it("keeps simple markup and strips scripts", () => {
    expect(sanitizeHtml("<p>safe <strong>ok</strong></p><script>alert(1)</script>")).toBe(
      "<p>safe <strong>ok</strong></p>",
    );
  });

  it("turns mixed model text into a lead sentence plus a list", () => {
    const html = markdownToHtml(
      "Acceptance: agreeing to receive or agree to something.\n- **Approval**: endorsement. Example: The plan gained approval.\n-\n- Rejection: a no.",
    );
    expect(html).toContain("<p>Acceptance: agreeing to receive or agree to something.</p>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>Approval</strong>");
    expect(html).not.toContain("<li></li>");
  });

  it("nests bullets and numbers from indent", () => {
    const html = markdownToHtml("- fruit\n  - apple\n    - fuji\n1. first\n  2. nested");
    expect(html).toContain("<ul><li>fruit<ul><li>apple<ul><li>fuji</li></ul></li></ul></li></ul>");
    expect(html).toContain("<ol><li>first<ol><li>nested</li></ol></li></ol>");
  });

  it("drops empty list items from model HTML", () => {
    expect(tidyHtml("<p>Lead.</p><ul><li>Approval: yes.</li><li></li><li><br></li></ul>")).toBe(
      "<p>Lead.</p><ul><li>Approval: yes.</li></ul>",
    );
  });

  it("turns bullet paragraphs into a list", () => {
    const html = toSafeHtml("<p>- Approval: yes.</p><p>- Rejection: no.</p>");
    expect(html).toContain("<ul>");
    expect(html).toContain("Approval: yes.");
    expect(html).not.toContain("<p>-");
  });

  it("treats tag-only notes as empty", () => {
    expect(noteIsEmpty("<p><br></p>")).toBe(true);
    expect(noteIsEmpty("<p><strong>Connotation</strong></p><p>positive</p>")).toBe(false);
  });

  it("reads a numbered marker", () => {
    expect(parseListLine("1. nearby word")).toEqual({ indent: 0, kind: "ol", text: "nearby word" });
    expect(parseListLine("  - nested")).toEqual({ indent: 1, kind: "ul", text: "nested" });
    expect(parseListLine("-")).toBeNull();
  });
});
