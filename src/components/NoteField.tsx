import { useEffect, useState } from "react";
import { setWordNotes } from "../study/session";

export function NoteField({ senseId, initial }: { senseId: string; initial: string }) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(initial);
  }, [senseId, initial]);

  function persist(next: string) {
    void setWordNotes(senseId, next);
  }

  return (
    <label className="note-field">
      Note
      <input
        value={value}
        placeholder="When you would use this"
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => persist(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            persist(value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
