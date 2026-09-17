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

export function markdownToHtml(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length > 0 && lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        const items = lines
          .map((line) => `<li>${inlineMarkdown(escapeHtml(line.replace(/^\s*[-*]\s+/, "")))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMarkdown(escapeHtml(lines.join("\n")).replaceAll("\n", "<br>"))}</p>`;
    })
    .join("");
}

export function toSafeHtml(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeHtml(text);
  return sanitizeHtml(markdownToHtml(text));
}

export function noteToHtml(raw: string): string {
  return toSafeHtml(raw);
}

export function noteIsEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim() === "";
}
