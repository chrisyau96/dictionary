import { useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { ScoreBadge } from "../components/ScoreBadge";
import { db } from "../db/database";
import { go } from "../router";
import { nextDueForSense, resumeLearning, setWordFeedback, setWordNotes, studySavedWords } from "../study/session";
import type { SenseRecord, UserWordRecord } from "../types";

type Filter = "all" | "due" | "learning" | "known" | "paused";

export function MyWordsView() {
  const [rows, setRows] = useState<Array<{ word: UserWordRecord; sense: SenseRecord | undefined; due: string | null }>>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    const words = await db.userWords.orderBy("savedAt").reverse().toArray();
    const senses = await db.senses.bulkGet(words.map((word) => word.senseId));
    const dueLabels = await Promise.all(words.map((word) => nextDueForSense(word.senseId)));
    setRows(words.map((word, index) => ({ word, sense: senses[index], due: dueLabels[index] })));
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(({ word, sense, due }) => {
      if (filter === "due" && due !== "Due now") return false;
      if (filter === "learning" && word.status !== "learning") return false;
      if (filter === "known" && word.status !== "known") return false;
      if (filter === "paused" && word.status !== "paused") return false;
      if (!needle) return true;
      const hay = `${sense?.frequency.form ?? ""} ${sense?.glossEn ?? ""} ${sense?.glossTc ?? ""} ${word.notes}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, filter, query]);

  const dueCount = rows.filter((row) => row.due === "Due now" && row.word.status === "learning").length;

  return (
    <section className="stack">
      <ScreenHeader title="My Words" back={{ name: "today" }} />
      <div className="stats-row">
        <div className="stat">
          <b>{rows.length}</b>
          <span className="tiny">saved meanings</span>
        </div>
        <div className="stat">
          <b>{dueCount}</b>
          <span className="tiny">due to review</span>
        </div>
      </div>
      <div className="center-actions">
        <button
          type="button"
          className="primary block"
          onClick={async () => {
            const count = await studySavedWords();
            setNote(count ? `Study queue ready for ${count} saved meaning(s).` : "Save a meaning first.");
            if (count) go({ name: "review" });
          }}
        >
          Study my words
        </button>
      </div>
      <input className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your list" />
      <div className="wrap">
        {(["all", "due", "learning", "known", "paused"] as Filter[]).map((item) => (
          <button key={item} type="button" className={filter === item ? "chip active" : "chip"} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="panel">
          <p>Your study list is empty for this filter.</p>
          <p className="muted">In Dictionary, open a meaning, then tap Save. That is the word you will practise, not the whole entry.</p>
          <button type="button" className="ghost block" onClick={() => go({ name: "dictionary", q: "" })}>Find a word</button>
        </div>
      ) : null}
      {visible.map(({ word, sense, due }) => (
        <article className="card" key={word.id}>
          <div className="row">
            <div className="word-row-title">
              <strong>{sense?.frequency.form || word.senseId}</strong>
              {sense ? <span className="pos-inline">{sense.pos}</span> : null}
            </div>
            {sense ? <ScoreBadge score={sense.frequency.commonness} /> : null}
          </div>
          <p>{sense?.glossEn}</p>
          <p className="muted">{sense?.glossTc}</p>
          <p className="tiny">{due ?? "Not scheduled"} · {word.status}{word.reason ? ` · ${word.reason}` : ""}</p>
          <label>
            Note
            <input
              defaultValue={word.notes}
              placeholder="When you would use this"
              onBlur={(event) => setWordNotes(word.senseId, event.target.value)}
            />
          </label>
          <div className="center-actions">
            {sense ? (
              <button type="button" className="primary block" onClick={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}>
                Open dictionary card
              </button>
            ) : null}
            <button type="button" className="ghost block" onClick={() => setWordFeedback(word.senseId, "already-know", "known").then(refresh)}>
              I already know this
            </button>
            <button type="button" className="ghost block" onClick={() => setWordFeedback(word.senseId, "not-useful", "paused").then(refresh)}>
              Pause
            </button>
            {word.status !== "learning" ? (
              <button type="button" className="ghost block" onClick={() => resumeLearning(word.senseId).then(refresh)}>
                Resume
              </button>
            ) : null}
          </div>
        </article>
      ))}
      {note ? <p className="tiny">{note}</p> : null}
    </section>
  );
}
