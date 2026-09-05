import { useEffect, useState } from "react";
import { db } from "../db/database";
import { go } from "../router";
import { setWordFeedback } from "../study/session";
import type { SenseRecord, UserWordRecord } from "../types";

export function MyWordsView() {
  const [rows, setRows] = useState<Array<{ word: UserWordRecord; sense: SenseRecord | undefined }>>([]);

  async function refresh() {
    const words = await db.userWords.orderBy("savedAt").reverse().toArray();
    const senses = await db.senses.bulkGet(words.map((word) => word.senseId));
    setRows(words.map((word, index) => ({ word, sense: senses[index] })));
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="stack">
      <header className="topbar">
        <h1>My words</h1>
      </header>
      {rows.length === 0 ? <p className="muted">Saved meanings will appear here. Saving requires choosing a sense.</p> : null}
      {rows.map(({ word, sense }) => (
        <article className="card" key={word.id}>
          <div className="row">
            <strong>{sense?.glossEn ?? word.senseId}</strong>
            <span className="tiny">{word.status}</span>
          </div>
          <p className="muted">{sense?.glossTc}</p>
          <p className="tiny">{word.reason}</p>
          {sense ? (
            <button type="button" className="text-btn" onClick={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}>
              Open entry
            </button>
          ) : null}
          <div className="wrap">
            <button type="button" className="chip" onClick={() => setWordFeedback(word.senseId, "already-know", "known").then(refresh)}>Already know</button>
            <button type="button" className="chip" onClick={() => setWordFeedback(word.senseId, "not-useful", "paused").then(refresh)}>Not useful</button>
            <button type="button" className="chip" onClick={() => setWordFeedback(word.senseId, "too-easy", "paused").then(refresh)}>Too easy</button>
          </div>
        </article>
      ))}
    </section>
  );
}
