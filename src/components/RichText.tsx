import { useEffect, useRef } from "react";
import { escapeHtml, noteToHtml, sanitizeHtml } from "../ai/html";

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

  function emit(next: string) {
    onChange?.(next);
  }

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Text style">
        <button type="button" className="rte-tool" onMouseDown={(event) => { event.preventDefault(); run("bold"); emit(ref.current?.innerHTML ?? ""); }}>
          B
        </button>
        <button type="button" className="rte-tool" onMouseDown={(event) => { event.preventDefault(); run("italic"); emit(ref.current?.innerHTML ?? ""); }}>
          I
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
        onInput={() => emit(ref.current?.innerHTML ?? "")}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData("text/html");
          const text = event.clipboardData.getData("text/plain");
          const safe = html ? sanitizeHtml(html) : escapeHtml(text).replaceAll("\n", "<br>");
          document.execCommand("insertHTML", false, safe);
          emit(ref.current?.innerHTML ?? "");
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
