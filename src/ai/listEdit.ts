export function closestListItem(node: Node | null, root: HTMLElement): HTMLLIElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLLIElement) return current;
    current = current.parentNode;
  }
  return null;
}

export function closestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && /^(P|DIV|LI|H1|H2|H3)$/.test(current.tagName)) return current;
    current = current.parentNode;
  }
  return null;
}

export function textBeforeCaret(block: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return block.textContent ?? "";
  const caret = selection.getRangeAt(0);
  const range = caret.cloneRange();
  range.selectNodeContents(block);
  range.setEnd(caret.startContainer, caret.startOffset);
  return range.toString();
}

export function caretAtStart(block: HTMLElement): boolean {
  return textBeforeCaret(block).replace(/\u00a0/g, " ").trim() === "";
}

export function placeCaret(node: Node, atEnd = false): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(!atEnd);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function indentListItem(li: HTMLLIElement): boolean {
  const previous = li.previousElementSibling;
  if (!(previous instanceof HTMLLIElement)) return false;
  const parentList = li.parentElement;
  if (!parentList || (parentList.tagName !== "UL" && parentList.tagName !== "OL")) return false;
  const lists = [...previous.children].filter((child) => child.tagName === parentList.tagName);
  let nested = lists.at(-1) as HTMLElement | undefined;
  if (!nested) {
    nested = document.createElement(parentList.tagName.toLowerCase());
    previous.appendChild(nested);
  }
  nested.appendChild(li);
  placeCaret(li, true);
  return true;
}

export function outdentListItem(li: HTMLLIElement): boolean {
  const list = li.parentElement;
  if (!list || (list.tagName !== "UL" && list.tagName !== "OL")) return false;
  const parentItem = list.parentElement;
  const following: Element[] = [];
  for (let sibling = li.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
    following.push(sibling);
  }
  if (parentItem instanceof HTMLLIElement) {
    parentItem.after(li);
    if (following.length) {
      const existing = [...li.children].filter((child) => child.tagName === list.tagName);
      let nested = existing.at(-1) as HTMLElement | undefined;
      if (!nested) {
        nested = document.createElement(list.tagName.toLowerCase());
        li.appendChild(nested);
      }
      following.forEach((item) => nested.appendChild(item));
    }
    if (!list.childElementCount) list.remove();
    placeCaret(li, true);
    return true;
  }
  const paragraph = document.createElement("p");
  paragraph.innerHTML = li.innerHTML || "<br>";
  list.before(paragraph);
  li.remove();
  if (!list.childElementCount) list.remove();
  placeCaret(paragraph, true);
  return true;
}

export function autoListPrefix(text: string): "ul" | "ol" | null {
  const trimmed = text.replace(/\u00a0/g, " ");
  if (/^[-*•–]$/.test(trimmed)) return "ul";
  if (/^\d+\.$/.test(trimmed)) return "ol";
  return null;
}
