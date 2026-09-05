import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";

export function ProgressView() {
  const [stats, setStats] = useState<{
    words: number;
    cards: number;
    reviews: number;
    recall: string;
    production: string;
    band: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [words, cards, reviews, profile] = await Promise.all([
        db.userWords.count(),
        db.cards.count(),
        db.reviewEvents.toArray(),
        ensureProfile(),
      ]);
      const live = reviews.filter((event) => !event.undone);
      const recognition = live.filter((event) => event.task === "recognition");
      const production = live.filter((event) => event.task === "production");
      const recallOk = recognition.filter((event) => event.rating >= 3).length;
      const prodOk = production.filter((event) => event.rating >= 3).length;
      setStats({
        words,
        cards,
        reviews: live.length,
        recall: recognition.length ? `${recallOk}/${recognition.length} recognition` : "No recognition reviews yet",
        production: production.length ? `${prodOk}/${production.length} production` : "No production reviews yet",
        band: profile.estimatedBand ? `${profile.estimatedBand} estimate` : "No diagnostic yet",
      });
    })();
  }, []);

  if (!stats) return <p className="muted">Loading progress…</p>;

  return (
    <section className="stack">
      <ScreenHeader title="Progress" back={{ name: "today" }} />
      <div className="stats-row">
        <div className="stat"><b>{stats.words}</b><span className="tiny">saved meanings</span></div>
        <div className="stat"><b>{stats.reviews}</b><span className="tiny">reviews logged</span></div>
      </div>
      <div className="panel">
        <p>{stats.recall}</p>
        <p>{stats.production}</p>
        <p className="tiny">{stats.band}. Small samples are shown as fractions, not percentages. Recognition is not the same as being able to use a word.</p>
        <p className="tiny">{stats.cards} cards in the scheduler.</p>
      </div>
      <div className="center-actions">
        <button type="button" className="primary block" onClick={() => go({ name: "words" })}>Open My Words</button>
        <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Back to Today</button>
      </div>
    </section>
  );
}
