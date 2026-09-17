import { useEffect, useState } from "react";
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
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [senseId, initial]);

  function persist(next: string) {
    void setWordNotes(senseId, noteIsEmpty(next) ? "" : next, entryId);
  }

  return (
    <label className="note-field">
      Note
      <RichTextEditor
        resetKey={`${senseId}:${initial}`}
        value={value}
        placeholder="Write something that helps you remember this"
        onChange={setValue}
        onBlur={persist}
      />
    </label>
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
