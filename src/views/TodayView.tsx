import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { ScoreBadge } from "../components/ScoreBadge";
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
      <ScreenHeader
        title="Today"
        right={
          <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go({ name: "settings" })}>
            ⚙
          </button>
        }
      />
      <div className="stats-row">
        <div className="stat">
          <b>{summary.dueCount}</b>
          <span className="tiny">due now</span>
        </div>
        <div className="stat">
          <b>{summary.pauseNew ? 0 : summary.newRemaining}</b>
          <span className="tiny">new left today</span>
        </div>
      </div>
      <p className="tiny">{summary.packName ? summary.packName : "No pack installed."}</p>
      {summary.dueCount > 0 ? (
        <button type="button" className="primary block" onClick={() => go({ name: "review" })}>
          Review due cards
        </button>
      ) : (
        <div className="panel muted">No due reviews. Start a new word below, or open My Words.</div>
      )}
      <h2 className="screen-title">Learn new</h2>
      <p className="tiny">Each new meaning starts with a recall card. A production card is added later, so five meanings can mean more than five cards.</p>
      {summary.pauseNew ? <p className="muted">New words are paused until due work is closer to your daily capacity.</p> : null}
      {summary.pauseNew
        ? null
        : suggestions.map(({ sense, reason }) => (
            <article className="card" key={sense.id}>
              <div className="row">
                <div className="word-row-title">
                  <strong>{sense.frequency.form || sense.id}</strong>
                  <span className="pos-inline">{sense.pos}</span>
                </div>
                <ScoreBadge score={sense.frequency.commonness} />
              </div>
              <p>{sense.glossEn}</p>
              <p className="muted">{sense.glossTc}</p>
              <p className="tiny">{reason}</p>
              <div className="center-actions">
                <button
                  type="button"
                  className="primary block"
                  onClick={async () => {
                    await introduceSense(sense, reason);
                    go({ name: "review" });
                  }}
                >
                  Learn this meaning
                </button>
                <button type="button" className="ghost block" onClick={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}>
                  Open dictionary card
                </button>
              </div>
            </article>
          ))}
    </section>
  );
}
