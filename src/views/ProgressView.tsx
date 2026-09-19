import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { computeProgress, type ProgressSnapshot } from "../progress/metrics";

const DOMAIN_LABELS: Record<string, string> = {
  everyday: "Everyday",
  "project-management": "Projects",
  business: "Business",
  retail: "Retail",
  entrepreneurship: "Start-up",
  technology: "Tech",
};

function formatDay(day: string): string {
  const parts = day.split("-");
  const month = Number(parts[1]);
  const date = Number(parts[2]);
  if (!month || !date) return day;
  return `${month}/${date}`;
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 124;
  const padL = 24;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const gap = 2.2;
  const barW = (plotW - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length);
  const yTicks = Array.from(new Set([0, Math.round(max / 2), max]));
  const xTicks = labels
    .map((_, index) => index)
    .filter((index) => index === 0 || index === labels.length - 1 || (labels.length > 1 && (labels.length - 1 - index) % 7 === 0));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart" role="img" aria-label="New words introduced by day">
      {yTicks.map((tick) => {
        const y = padT + plotH - (tick / max) * plotH;
        return (
          <g key={`y-${tick}`}>
            <line className="chart-grid" x1={padL} x2={width - padR} y1={y} y2={y} />
            <text className="chart-axis" x={padL - 4} y={y + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        );
      })}
      {values.map((value, index) => {
        const h = (value / max) * plotH;
        const x = padL + index * (barW + gap);
        return <rect key={labels[index]} x={x} y={padT + plotH - h} width={Math.max(barW, 0.8)} height={h} rx="1.4" fill="currentColor" />;
      })}
      <line className="chart-grid" x1={padL} x2={width - padR} y1={padT + plotH} y2={padT + plotH} />
      {xTicks.map((index) => {
        const x = padL + index * (barW + gap) + barW / 2;
        return (
          <text key={`x-${labels[index]}`} className="chart-axis" x={x} y={height - 8} textAnchor="middle">
            {formatDay(labels[index])}
          </text>
        );
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
  const visible = rows.filter((row) => row.learning + row.reviewVerified + row.selfDeclared > 0);
  if (!visible.length) {
    return <div className="empty-state compact-empty">No learning or learnt words in a topic yet.</div>;
  }
  const values = visible.map((row) => row.learning + row.reviewVerified + row.selfDeclared);
  const max = Math.max(1, ...values);
  const xTicks = Array.from(new Set([0, Math.round(max / 2), max]));
  return (
    <div className="horizon-chart">
      {visible.map((row) => {
        const learnt = row.reviewVerified + row.selfDeclared;
        const value = learnt + row.learning;
        const fill = (value / max) * 100;
        const learntPct = value ? (learnt / value) * 100 : 0;
        const learningPct = value ? (row.learning / value) * 100 : 0;
        return (
          <div key={row.domain} className="horizon-row">
            <span className="horizon-label">{DOMAIN_LABELS[row.domain]}</span>
            <div className="horizon-plot">
              <div className="horizon-track" style={{ width: `${fill}%` }}>
                <span style={{ width: `${learntPct}%` }} className="seg learnt" />
                <span style={{ width: `${learningPct}%` }} className="seg learning" />
              </div>
            </div>
          </div>
        );
      })}
      <div className="horizon-axis">
        <span className="horizon-label" aria-hidden="true" />
        <div className="horizon-plot horizon-x" aria-hidden="true">
          {xTicks.map((tick, index) => (
            <span
              key={`x-${tick}`}
              className={index === 0 ? "is-start" : index === xTicks.length - 1 ? "is-end" : "is-mid"}
              style={{ left: `${(tick / max) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
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
  const intro = stats.introductionsByDay.slice(-30);

  return (
    <section className="stack compact">
      <ScreenHeader eyebrow="This device" title="Progress" subtitle="What you actually practised." />
      <div className="kpi-grid">
        <div className="stat" title="Words in Learnt">
          <b>{stats.learntCount}</b>
          <span className="stat-label">Learnt</span>
        </div>
        <div className="stat" title="Words in Learning">
          <b>{stats.learningCount}</b>
          <span className="stat-label">Learning</span>
        </div>
        <div className="stat" title="Consecutive days you learned a new word">
          <b>{stats.learnStreak}</b>
          <span className="stat-label">Strike · new words</span>
        </div>
        <div className="stat" title="Consecutive days you completed a revision">
          <b>{stats.reviewStreak}</b>
          <span className="stat-label">Strike · revision</span>
        </div>
      </div>
      <div className="panel">
        <p className="example-index">New words by day</p>
        <BarChart values={intro.map((row) => row.count)} labels={intro.map((row) => row.day)} />
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
            <i className="dot learnt" /> Learnt
          </span>
          <span>
            <i className="dot learning" /> Learning
          </span>
        </p>
      </div>
      {stats.takeaway ? (
        <div className="insight-card">
          <p>{stats.takeaway}</p>
        </div>
      ) : null}
    </section>
  );
}
