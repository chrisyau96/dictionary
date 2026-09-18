import { noteIsEmpty } from "../ai/html";
import { setWordNotes } from "../study/session";
import { RichHtml, RichTextEditor } from "./RichText";

export function NoteField({
  senseId,
  entryId,
  initial,
}: {
  senseId: string;
  entryId: string;
  initial: string;
}) {
  function persist(next: string) {
    void setWordNotes(senseId, noteIsEmpty(next) ? "" : next, entryId);
  }

  return (
    <div className="note-field">
      <span className="note-field-label">Note</span>
      <RichTextEditor
        resetKey={`${senseId}:${initial}`}
        value={initial}
        placeholder="Write something that helps you remember this"
        onBlur={persist}
      />
    </div>
  );
}

export function NoteDisplay({ note }: { note: string }) {
  if (noteIsEmpty(note)) return null;
  return (
    <div className="note-display">
      <p className="example-index">Note</p>
      <RichHtml html={note} className="note-html" />
    </div>
  );
}
