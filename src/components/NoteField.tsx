import { useEffect, useState } from "react";
import { setWordNotes } from "../study/session";

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
    void setWordNotes(senseId, next, entryId);
  }

  return (
    <label className="note-field">
      Note
      <textarea
        value={value}
        rows={3}
        placeholder="Write something that helps you remember this"
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => persist(event.target.value)}
      />
    </label>
  );
}

export function NoteDisplay({ note }: { note: string }) {
  const text = note.trim();
  if (!text) return null;
  return (
    <div className="note-display">
      <p className="example-index">Note</p>
      <p>{text}</p>
    </div>
  );
}
