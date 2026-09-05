import { useEffect, useState } from "react";
import { db, ensureProfile } from "../db/database";

export function ProgressView() {
  const [stats, setStats] = useState<{
    words: number;
    cards: number;
    reviews: number;
    recall: string;
    production: string;
    band: string;
    scheduler: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const [words, cards, events, profile] = await Promise.all([
        db.userWords.count(),
        db.cards.count(),
        db.reviewEvents.where("undone").equals(0).count().catch(async () => {
          const all = await db.reviewEvents.toArray();
          return all.filter((event) => !event.undone).length;
        }),
        ensureProfile(),
      ]);
      const reviews = await db.reviewEvents.toArray();
      const live = reviews.filter((event) => !event.undone);
      const recognition = live.filter((event) => event.task === "recognition");
      const production = live.filter((event) => event.task === "production");
      const recallOk = recognition.filter((event) => event.rating >= 3).length;
      const prodOk = production.filter((event) => event.rating >= 3).length;
      setStats({
        words,
        cards,
        reviews: events,
        recall: recognition.length ? `${recallOk}/${recognition.length} recognition` : "No recognition reviews yet",
        production: production.length ? `${prodOk}/${production.length} production` : "No production reviews yet",
        band: profile.estimatedBand ? `${profile.estimatedBand} estimate` : "No diagnostic yet",
        scheduler: cards ? "ts-fsrs records stored per card" : "No cards yet",
      });
    })();
  }, []);

  if (!stats) return <p className="muted">Loading progress…</p>;

  return (
    <section className="stack">
      <header className="topbar">
        <h1>Progress</h1>
      </header>
      <div className="panel">
        <p><strong>{stats.words}</strong> saved senses</p>
        <p><strong>{stats.cards}</strong> cards · <strong>{stats.reviews}</strong> review events</p>
        <p className="muted">{stats.recall}</p>
        <p className="muted">{stats.production}</p>
        <p className="tiny">{stats.band}. Small samples are shown as fractions, not percentages.</p>
        <p className="tiny">{stats.scheduler}</p>
      </div>
    </section>
  );
}
