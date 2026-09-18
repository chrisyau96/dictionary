import { useEffect, useRef } from "react";
import { autoListPrefix, caretAtStart, closestBlock, closestListItem, indentListItem, outdentListItem, placeCaret, textBeforeCaret } from "../ai/listEdit";
import { escapeHtml, noteToHtml, sanitizeHtml } from "../ai/html";
import { IndentDecreaseIcon, IndentIncreaseIcon, ListBulletIcon, ListNumberIcon } from "./icons";

function run(command: string): void {
  document.execCommand(command, false);
}

export function RichTextEditor({
  resetKey,
  value,
  placeholder,
  onChange,
  onBlur,
}: {
  resetKey: string;
  value: string;
  placeholder?: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.innerHTML = noteToHtml(value);
    // Reset only when the caller starts a new document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function emit(next = ref.current?.innerHTML ?? "") {
    onChange?.(next);
  }

  function tool(command: string) {
    run(command);
    emit();
  }

  function withItem(action: (item: HTMLLIElement) => boolean) {
    const root = ref.current;
    if (!root) return;
    const item = closestListItem(window.getSelection()?.anchorNode ?? null, root);
    if (!item) return;
    if (action(item)) emit();
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Text style">
        <button type="button" className="rte-tool rte-b" aria-label="Bold" onMouseDown={(event) => { event.preventDefault(); tool("bold"); }}>
          B
        </button>
        <button type="button" className="rte-tool rte-i" aria-label="Italic" onMouseDown={(event) => { event.preventDefault(); tool("italic"); }}>
          I
        </button>
        <button type="button" className="rte-tool" aria-label="Bulleted list" onMouseDown={(event) => { event.preventDefault(); tool("insertUnorderedList"); }}>
          <ListBulletIcon />
        </button>
        <button type="button" className="rte-tool" aria-label="Numbered list" onMouseDown={(event) => { event.preventDefault(); tool("insertOrderedList"); }}>
          <ListNumberIcon />
        </button>
        <button type="button" className="rte-tool" aria-label="Decrease indent" onMouseDown={(event) => { event.preventDefault(); withItem(outdentListItem); }}>
          <IndentDecreaseIcon />
        </button>
        <button type="button" className="rte-tool" aria-label="Increase indent" onMouseDown={(event) => { event.preventDefault(); withItem(indentListItem); }}>
          <IndentIncreaseIcon />
        </button>
      </div>
      <div
        ref={ref}
        className="rte-body"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={() => emit()}
        onKeyDown={(event) => {
          const root = ref.current;
          if (!root || event.nativeEvent.isComposing) return;
          const selection = window.getSelection();
          const item = closestListItem(selection?.anchorNode ?? null, root);
          if (event.key === "Tab") {
            if (!item) return;
            event.preventDefault();
            if (event.shiftKey) outdentListItem(item);
            else indentListItem(item);
            emit();
            return;
          }
          if (event.key === "Backspace" && item && caretAtStart(item) && selection?.isCollapsed) {
            event.preventDefault();
            outdentListItem(item);
            emit();
            return;
          }
          if (event.key !== " " || !selection?.isCollapsed) return;
          const block = closestBlock(selection.anchorNode, root);
          if (!block || block.tagName === "LI") return;
          const kind = autoListPrefix(textBeforeCaret(block));
          if (!kind) return;
          event.preventDefault();
          block.innerHTML = "<br>";
          placeCaret(block);
          run(kind === "ul" ? "insertUnorderedList" : "insertOrderedList");
          emit();
        }}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData("text/html");
          const text = event.clipboardData.getData("text/plain");
          const safe = html ? sanitizeHtml(html) : escapeHtml(text).replaceAll("\n", "<br>");
          document.execCommand("insertHTML", false, safe);
          emit();
        }}
        onBlur={() => onBlur?.(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}

export function RichHtml({ html, className }: { html: string; className?: string }) {
  const safe = noteToHtml(html);
  if (!safe) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
