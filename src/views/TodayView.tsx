import { useEffect, useState } from "react";
import { db, ensureProfile } from "../db/database";
import { pickNewSenses, recommendationReason } from "../recommend/select";
import { go } from "../router";
import { buildToday, introduceSense, type TodaySummary } from "../study/session";
import type { SenseRecord } from "../types";

export function TodayView() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ sense: SenseRecord; reason: string }>>([]);

  async function refresh() {
    const today = await buildToday();
    setSummary(today);
    const [profile, senses, words, cards] = await Promise.all([
      ensureProfile(),
      db.senses.toArray(),
      db.userWords.toArray(),
      db.cards.toArray(),
    ]);
    const already = new Set(cards.map((card) => card.senseId));
    const picked = pickNewSenses(senses, profile, words, already, today.newRemaining);
    setSuggestions(picked.map((sense) => ({ sense, reason: recommendationReason(sense, Boolean(words.find((word) => word.senseId === sense.id)), profile) })));
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!summary) return <p className="muted">Computing due cards…</p>;

  return (
    <section className="stack">
      <header className="topbar">
        <h1>Today</h1>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go({ name: "settings" })}>⚙</button>
      </header>
      <div className="panel">
        <p><strong>{summary.dueCount}</strong> due now</p>
        <p className="muted">
          {summary.pauseNew
            ? "New words are paused until the due work is closer to your daily capacity."
            : `${summary.newRemaining} new senses still available today (limit ${summary.newLimit}).`}
        </p>
        <p className="tiny">{summary.packName ? `Installed: ${summary.packName}` : "No pack installed."}</p>
      </div>
      {summary.dueCount > 0 ? (
        <button type="button" className="primary block" onClick={() => go({ name: "review" })}>
          Review due cards
        </button>
      ) : (
        <div className="panel muted">No due reviews. You can still learn a new sense below.</div>
      )}
      <div>
        <h2 className="screen-title">New senses</h2>
        <p className="tiny">Five new senses can create more than five cards. Recognition is introduced first; production comes later.</p>
      </div>
      {summary.pauseNew ? null : suggestions.map(({ sense, reason }) => (
        <article className="card" key={sense.id}>
          <div className="row">
            <strong>{sense.frequency.form || sense.id}</strong>
            <span className="pos">{sense.pos}</span>
          </div>
          <p>{sense.glossEn}</p>
          <p className="muted">{sense.glossTc}</p>
          <p className="tiny">{reason}</p>
          <button
            type="button"
            className="primary"
            onClick={async () => {
              await introduceSense(sense, reason);
              go({ name: "review" });
            }}
          >
            Learn this sense
          </button>
        </article>
      ))}
    </section>
  );
}
