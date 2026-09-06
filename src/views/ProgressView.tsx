import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { computeProgress, type ProgressSnapshot } from "../progress/metrics";
import { go } from "../router";

const DOMAIN_LABELS: Record<string, string> = {
  everyday: "Everyday",
  "project-management": "Projects",
  business: "Business",
  retail: "Retail",
  entrepreneurship: "Start-up",
  technology: "Tech",
};

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 92;
  const gap = 3;
  const barW = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="New words introduced by day">
      {values.map((value, index) => {
        const h = (value / max) * 72;
        const x = index * (barW + gap);
        return <rect key={labels[index]} x={x} y={80 - h} width={barW} height={h} rx="2" fill="currentColor" />;
      })}
    </svg>
  );
}

function LineChart({ values }: { values: Array<number | null> }) {
  const width = 320;
  const height = 92;
  const points = values
    .map((value, index) => {
      if (value === null) return null;
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = 80 - value * 72;
      return `${x},${y}`;
    })
    .filter((item): item is string => Boolean(item));
  if (points.length < 2) {
    return <div className="empty-state compact-empty">Not enough eligible delayed-recall events yet. No invented retention score.</div>;
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="Delayed recall trend">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points.join(" ")} />
    </svg>
  );
}

function HorizonBars({ rows }: { rows: ProgressSnapshot["coverage"] }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <div className="horizon-list">
      {rows.map((row) => {
        const width = `${Math.round((row.total / max) * 100)}%`;
        const learning = row.total ? (row.learning / row.total) * 100 : 0;
        const verified = row.total ? (row.reviewVerified / row.total) * 100 : 0;
        const declared = row.total ? (row.selfDeclared / row.total) * 100 : 0;
        const idle = row.total ? (row.notStarted / row.total) * 100 : 0;
        return (
          <div key={row.domain} className="horizon-row">
            <span className="tiny">
              {DOMAIN_LABELS[row.domain]} · {row.total}
            </span>
            <div className="horizon-track" style={{ width }}>
              <span style={{ width: `${verified}%` }} className="seg verified" />
              <span style={{ width: `${learning}%` }} className="seg learning" />
              <span style={{ width: `${declared}%` }} className="seg declared" />
              <span style={{ width: `${idle}%` }} className="seg idle" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function delayedLabel(stats: ProgressSnapshot["delayedRecall"]): string {
  if (stats.total === 0) return "—";
  const text = `${stats.success}/${stats.total}`;
  if (stats.total < 20) return `${text}`;
  return text;
}

export function ProgressView() {
  const [stats, setStats] = useState<ProgressSnapshot | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    void (async () => {
      const [profile, cards, events, words, senses] = await Promise.all([
        ensureProfile(),
        db.cards.toArray(),
        db.reviewEvents.toArray(),
        db.userWords.toArray(),
        db.senses.toArray(),
      ]);
      setStats(computeProgress(new Date(), profile.timezone, cards, events, words, senses));
    })();
  }, []);

  if (!stats) return <p className="muted">Loading progress…</p>;
  const delayedSlice = stats.delayedByDay.slice(-range);
  const delayedValues = delayedSlice.map((row) => (row.total === 0 ? null : row.success / row.total));

  return (
    <section className="stack compact">
      <ScreenHeader eyebrow="This device · recorded activity" title="Progress" subtitle="Count what actually happened." />
      <div className="kpi-grid">
        <div className="stat">
          <b>{stats.newVocabulary7d}</b>
          <span className="stat-label">New vocabulary · 7 days</span>
          <span className="stat-desc">First introductions only</span>
        </div>
        <div className="stat">
          <b>{stats.reviewsCompletedToday}</b>
          <span className="stat-label">Reviews completed today</span>
          <span className="stat-desc">
            {stats.reviewAttemptsToday !== stats.reviewsCompletedToday
              ? `${stats.reviewAttemptsToday} attempts including retries`
              : "Distinct cards, not extra saves"}
          </span>
        </div>
        <div className="stat">
          <b>{delayedLabel(stats.delayedRecall)}</b>
          <span className="stat-label">Delayed recall · 7 days</span>
          <span className="stat-desc">{stats.delayedRecall.total < 20 ? "Limited evidence" : "Failures included"}</span>
        </div>
        <div className="stat">
          <b>{stats.rememberedThroughReview}</b>
          <span className="stat-label">Remembered through review</span>
          <span className="stat-desc">
            {stats.selfDeclaredKnown ? `${stats.selfDeclaredKnown} self-declared known listed separately` : "Not inflated by saving"}
          </span>
        </div>
      </div>
      <div className="panel">
        <p className="example-index">New words by day</p>
        <BarChart values={stats.introductionsByDay.slice(-30).map((row) => row.count)} labels={stats.introductionsByDay.slice(-30).map((row) => row.day)} />
      </div>
      <div className="panel">
        <div className="row">
          <p className="example-index">Delayed recall</p>
          <div className="wrap">
            {([7, 30, 90] as const).map((item) => (
              <button key={item} type="button" className={range === item ? "chip active" : "chip"} onClick={() => setRange(item)}>
                {item}d
              </button>
            ))}
          </div>
        </div>
        <LineChart values={delayedValues} />
        <p className="tiny">
          {stats.delayedRecall.recognition.total || stats.delayedRecall.production.total
            ? `Recognition ${stats.delayedRecall.recognition.success}/${stats.delayedRecall.recognition.total} · Production ${stats.delayedRecall.production.success}/${stats.delayedRecall.production.total}`
            : "A delayed score needs eligible events after a real gap. First learning is not delayed recall."}
        </p>
      </div>
      <div className="panel">
        <p className="example-index">Coverage by topic</p>
        <HorizonBars rows={stats.coverage} />
        <p className="legend">
          <span>
            <i className="dot verified" /> Verified
          </span>
          <span>
            <i className="dot learning" /> Learning
          </span>
          <span>
            <i className="dot declared" /> Marked known
          </span>
          <span>
            <i className="dot idle" /> Saved, not started
          </span>
        </p>
      </div>
      {stats.takeaway ? (
        <div className="insight-card">
          <p className="example-index">What the charts can say</p>
          <p>{stats.takeaway}</p>
        </div>
      ) : (
        <p className="tiny helper-copy">
          Saving is not learning. Streaks stay secondary. Rule {stats.ruleVersion}.
        </p>
      )}
      <button type="button" className="ghost block" onClick={() => go({ name: "words" })}>
        Open My Words
      </button>
    </section>
  );
}
