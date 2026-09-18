const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "DIV"]);

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function unwrapDisallowed(root: ParentNode): void {
  [...root.childNodes].forEach((child) => {
    if (child.nodeType !== 1) return;
    const el = child as HTMLElement;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") {
      el.remove();
      return;
    }
    unwrapDisallowed(el);
    if (!ALLOWED.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      return;
    }
    [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
  });
}

export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === "undefined") return escapeHtml(html);
  const doc = new DOMParser().parseFromString(html, "text/html");
  unwrapDisallowed(doc.body);
  return doc.body.innerHTML.trim();
}

function inlineMarkdown(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
}

const LIST_LINE = /^(\s*)(?:([-*•–])|(\d+)[.)])(?:\s+|$)(.*)$/;

export function parseListLine(line: string): { indent: number; kind: "ul" | "ol"; text: string } | null {
  const match = line.match(LIST_LINE);
  if (!match) return null;
  const text = (match[4] ?? "").trim();
  if (!text) return null;
  return {
    indent: Math.min(2, Math.floor((match[1] ?? "").replaceAll("\t", "  ").length / 2)),
    kind: match[2] ? "ul" : "ol",
    text,
  };
}

function nestedListHtml(items: Array<{ indent: number; kind: "ul" | "ol"; text: string }>): string {
  if (!items.length) return "";

  function build(start: number, depth: number): { html: string; next: number } {
    const kind = items[start].kind;
    let html = `<${kind}>`;
    let index = start;
    while (index < items.length && items[index].indent >= depth) {
      if (items[index].indent > depth) break;
      if (items[index].kind !== kind) break;
      const body = inlineMarkdown(escapeHtml(items[index].text));
      let item = `<li>${body}`;
      if (index + 1 < items.length && items[index + 1].indent > depth) {
        const child = build(index + 1, items[index + 1].indent);
        item += child.html;
        index = child.next;
      } else {
        index += 1;
      }
      item += "</li>";
      html += item;
    }
    html += `</${kind}>`;
    return { html, next: index };
  }

  const parts: string[] = [];
  let cursor = 0;
  while (cursor < items.length) {
    const chunk = build(cursor, items[cursor].indent);
    parts.push(chunk.html);
    cursor = chunk.next;
  }
  return parts.join("");
}

export function markdownToHtml(text: string): string {
  const lines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }
    const list = parseListLine(lines[index]);
    if (list) {
      const items: Array<{ indent: number; kind: "ul" | "ol"; text: string }> = [];
      while (index < lines.length) {
        if (!lines[index].trim()) {
          const peek = lines[index + 1];
          if (peek && parseListLine(peek)) {
            index += 1;
            continue;
          }
          break;
        }
        const item = parseListLine(lines[index]);
        if (!item) break;
        if (item.text) items.push(item);
        index += 1;
      }
      if (items.length) out.push(nestedListHtml(items));
      continue;
    }
    const para: string[] = [];
    while (index < lines.length && lines[index].trim() && !parseListLine(lines[index])) {
      para.push(lines[index]);
      index += 1;
    }
    out.push(`<p>${inlineMarkdown(escapeHtml(para.join("\n")).replaceAll("\n", "<br>"))}</p>`);
  }
  return out.join("");
}

function isEmptyItem(li: HTMLElement): boolean {
  const copy = li.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("ul,ol").forEach((node) => node.remove());
  return copy.textContent?.replace(/\u00a0/g, " ").trim() === "";
}

function paragraphMarker(text: string): { kind: "ul" | "ol"; text: string } | null {
  const match = text.match(/^\s*(?:([-*•–])|(\d+)[.)])\s+(.*)$/);
  if (!match) return null;
  return { kind: match[1] ? "ul" : "ol", text: (match[3] ?? "").trim() };
}

function convertParagraphLists(root: HTMLElement): void {
  const children = [...root.children];
  let index = 0;
  while (index < children.length) {
    const start = children[index];
    const first =
      start.tagName === "P" || start.tagName === "DIV" ? paragraphMarker(start.textContent ?? "") : null;
    if (!first?.text) {
      index += 1;
      continue;
    }
    const items: Array<{ kind: "ul" | "ol"; text: string }> = [];
    let cursor = index;
    while (cursor < children.length) {
      const node = children[cursor];
      const parsed =
        node.tagName === "P" || node.tagName === "DIV" ? paragraphMarker(node.textContent ?? "") : null;
      if (!parsed?.text) break;
      items.push(parsed);
      cursor += 1;
    }
    const wrap = root.ownerDocument.createElement("div");
    wrap.innerHTML = nestedListHtml(items.map((item) => ({ ...item, indent: 0 })));
    start.replaceWith(...wrap.childNodes);
    children.slice(index + 1, cursor).forEach((node) => node.remove());
    index = cursor;
  }
}

function mergeAdjacentLists(root: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    [...root.querySelectorAll("ul,ol")].forEach((list) => {
      const next = list.nextElementSibling;
      if (next && next.tagName === list.tagName) {
        list.append(...next.childNodes);
        next.remove();
        changed = true;
      }
    });
  }
}

export function tidyHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  convertParagraphLists(doc.body);
  [...doc.body.querySelectorAll("li")].forEach((li) => {
    if (isEmptyItem(li as HTMLElement) && !(li as HTMLElement).querySelector("ul,ol")) li.remove();
  });
  [...doc.body.querySelectorAll("ul,ol")].forEach((list) => {
    if (!list.querySelector("li")) list.remove();
  });
  mergeAdjacentLists(doc.body);
  return doc.body.innerHTML.trim();
}

export function toSafeHtml(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return tidyHtml(sanitizeHtml(text));
  return tidyHtml(sanitizeHtml(markdownToHtml(text)));
}

export function noteToHtml(raw: string): string {
  return toSafeHtml(raw);
}

export function noteIsEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim() === "";
}
