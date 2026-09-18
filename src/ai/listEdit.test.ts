import { describe, expect, it } from "vitest";
import { autoListPrefix, indentListItem, outdentListItem } from "./listEdit";

describe("list editing", () => {
  it("detects dash and 1. prefixes", () => {
    expect(autoListPrefix("-")).toBe("ul");
    expect(autoListPrefix("•")).toBe("ul");
    expect(autoListPrefix("1.")).toBe("ol");
    expect(autoListPrefix("12.")).toBe("ol");
    expect(autoListPrefix("- item")).toBeNull();
  });

  it("nests and restores list items", () => {
    document.body.innerHTML = "<ul><li>one</li><li>two</li></ul>";
    const items = [...document.querySelectorAll("li")];
    expect(indentListItem(items[1])).toBe(true);
    expect(document.body.innerHTML).toBe("<ul><li>one<ul><li>two</li></ul></li></ul>");
    const nested = document.querySelector("ul ul li") as HTMLLIElement;
    expect(outdentListItem(nested)).toBe(true);
    expect(document.body.querySelectorAll("ul").length).toBe(1);
    expect([...document.querySelectorAll("li")].map((item) => item.childNodes[0]?.textContent)).toEqual(["one", "two"]);
  });

  it("turns a top-level item back into a paragraph", () => {
    document.body.innerHTML = "<ul><li>only</li></ul>";
    expect(outdentListItem(document.querySelector("li") as HTMLLIElement)).toBe(true);
    expect(document.body.innerHTML).toBe("<p>only</p>");
  });
});
