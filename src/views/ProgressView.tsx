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

function LineChart({ values }: { values: Array<number | null>; labels: string[] }) {
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
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="Delayed recall trend">
      {points.length >= 2 ? (
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points.join(" ")} />
      ) : (
        <text x="8" y="48" fontSize="12" fill="currentColor">
          Not enough review history
        </text>
      )}
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
        return (
          <div key={row.domain} className="horizon-row">
            <span className="tiny">{DOMAIN_LABELS[row.domain]} · {row.total}</span>
            <div className="horizon-track" style={{ width }}>
              <span style={{ width: `${verified}%` }} className="seg verified" />
              <span style={{ width: `${learning}%` }} className="seg learning" />
              <span style={{ width: `${declared}%` }} className="seg declared" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function delayedLabel(stats: ProgressSnapshot["delayedRecall"]): string {
  if (stats.total === 0) return "Not enough review history";
  const text = `${stats.success}/${stats.total}`;
  if (stats.total < 20) return `${text} · Limited evidence`;
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
      <ScreenHeader title="Progress" />
      <div className="kpi-grid">
        <div className="stat">
          <b>{stats.newVocabulary7d}</b>
          <span className="tiny">New vocabulary · 7 days</span>
        </div>
        <div className="stat">
          <b>{stats.reviewsCompletedToday}</b>
          <span className="tiny">Reviews completed today</span>
          {stats.reviewAttemptsToday !== stats.reviewsCompletedToday ? (
            <span className="tiny">{stats.reviewAttemptsToday} attempts</span>
          ) : null}
        </div>
        <div className="stat">
          <b>{delayedLabel(stats.delayedRecall)}</b>
          <span className="tiny">Delayed recall · 7 days</span>
        </div>
        <div className="stat">
          <b>{stats.rememberedThroughReview}</b>
          <span className="tiny">Remembered through review</span>
        </div>
      </div>
      <p className="tiny">
        New vocabulary counts first introductions only. Saved words and retries are not extra learned words. Marking Known does not invent review history.
        {stats.selfDeclaredKnown ? ` ${stats.selfDeclaredKnown} self-declared known ${stats.selfDeclaredKnown === 1 ? "sense is" : "senses are"} listed separately. ` : " "}
        Rule {stats.ruleVersion}.
      </p>
      <div className="panel">
        <p className="example-index">NEW WORDS BY DAY</p>
        <BarChart values={stats.introductionsByDay.slice(-30).map((row) => row.count)} labels={stats.introductionsByDay.slice(-30).map((row) => row.day)} />
      </div>
      <div className="panel">
        <div className="row">
          <p className="example-index">DELAYED RECALL</p>
          <div className="wrap">
            {([7, 30, 90] as const).map((item) => (
              <button key={item} type="button" className={range === item ? "chip active" : "chip"} onClick={() => setRange(item)}>
                {item}d
              </button>
            ))}
          </div>
        </div>
        <LineChart values={delayedValues} labels={delayedSlice.map((row) => row.day)} />
        <p className="tiny">
          {stats.delayedRecall.recognition.total || stats.delayedRecall.production.total
            ? `Recognition ${stats.delayedRecall.recognition.success}/${stats.delayedRecall.recognition.total} · Production ${stats.delayedRecall.production.success}/${stats.delayedRecall.production.total}`
            : "Not enough review history"}
        </p>
      </div>
      <div className="panel">
        <p className="example-index">COVERAGE BY TOPIC</p>
        <HorizonBars rows={stats.coverage} />
        <p className="tiny">Green = verified by review · teal = still learning · grey = marked known</p>
      </div>
      {stats.takeaway ? <p className="muted">{stats.takeaway}</p> : null}
      <button type="button" className="ghost block" onClick={() => go({ name: "words" })}>
        Open My Words
      </button>
    </section>
  );
}
