import { useEffect, useState } from "react";
import { SettingsIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { WordListCard } from "../components/WordListCard";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";
import { markPlanSense, replacePlanItem } from "../study/plan";
import {
  buildToday,
  learnPlanSenses,
  markSenseKnown,
  saveSense,
  startDueSession,
  type TodaySummary,
} from "../study/session";
import type { DailyPlanItem, SenseRecord } from "../types";

function statusLabel(status: DailyPlanItem["status"]): string {
  if (status === "practised") return "Practised";
  if (status === "started") return "Started";
  if (status === "not-started") return "Not started";
  if (status === "already-know") return "Already know";
  return "Skipped";
}

export function TodayView() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [senses, setSenses] = useState<Map<string, SenseRecord>>(new Map());
  const [busy, setBusy] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(false);

  async function refresh() {
    const [today, allSenses, profile] = await Promise.all([buildToday(), db.senses.toArray(), ensureProfile()]);
    setSummary(today);
    setSenses(new Map(allSenses.map((sense) => [sense.id, sense])));
    setNeedsCheck(!profile.diagnosticCompletedAt);
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!summary) return <p className="muted">Computing today’s list…</p>;

  const visibleItems = summary.plan.items.filter(
    (item) => item.status === "not-started" || item.status === "started" || item.status === "practised",
  );
  const introducedCount = visibleItems.filter((item) => item.status !== "not-started").length;
  const waitingCount = visibleItems.filter((item) => item.status === "not-started").length;
  const primary = summary.unfinishedSession
    ? { label: "Continue review", action: async () => go({ name: "review" }) }
    : summary.dueCount > 0
      ? {
          label: "Start review",
          action: async () => {
            await startDueSession();
            go({ name: "review" });
          },
        }
      : visibleItems.some((item) => item.status === "not-started")
        ? {
            label: "Learn new words",
            action: async () => {
              await learnPlanSenses();
              go({ name: "review" });
            },
          }
        : null;

  return (
    <section className="stack compact">
      <ScreenHeader
        eyebrow={`${summary.dayLabel} · daily workspace`}
        title="Today"
        subtitle="A little learning. Deliberate practice."
        right={
          <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go({ name: "settings" })}>
            <SettingsIcon />
          </button>
        }
      />
      <div className="stats-row">
        <div className="stat">
          <b>
            {introducedCount}
            <span className="stat-over">/{summary.newLimit}</span>
          </b>
          <span className="stat-label">New senses introduced today</span>
        </div>
        <div className="stat">
          <b>{summary.dueCount}</b>
          <span className="stat-label">Reviews due</span>
        </div>
      </div>
      {needsCheck ? (
        <button type="button" className="text-btn" onClick={() => go({ name: "diagnostic" })}>
          Find your starting vocabulary level
        </button>
      ) : null}
      {summary.pauseNew ? <p className="tiny">New words are paused until due reviews are closer to your daily capacity.</p> : null}
      {primary ? (
        <button
          type="button"
          className="primary block"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await primary.action();
            setBusy(false);
          }}
        >
          {primary.label}
        </button>
      ) : (
        <div className="empty-state">Today’s planned work is done. More study is optional.</div>
      )}
      {waitingCount ? (
        <p className="tiny helper-copy">
          {waitingCount} new {waitingCount === 1 ? "sense is" : "senses are"} still waiting on this list. This is not a
          due-review count.
        </p>
      ) : summary.dueCount > 0 ? (
        <p className="tiny helper-copy">Due reviews are counted separately from words you have only saved.</p>
      ) : null}
      <h2 className="section-label">Your learning queue</h2>
      {visibleItems.length === 0 ? (
        <div className="empty-state">
          {summary.pauseNew ? "Review first today." : "No new words were selected for today. Save a meaning from Dictionary if you need something specific."}
        </div>
      ) : (
        visibleItems.map((item) => {
          const sense = senses.get(item.senseId);
          if (!sense) return null;
          return (
            <WordListCard
              key={item.senseId}
              sense={sense}
              status={statusLabel(item.status)}
              onOpen={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
              actions={
                item.status === "not-started" ? (
                  <>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="primary"
                        onClick={async () => {
                          await saveSense(sense, item.reason);
                          await markPlanSense(sense.id, "started");
                          go({ name: "entry", entryId: sense.entryId, senseId: sense.id });
                        }}
                      >
                        Learn
                      </button>
                    </div>
                    <div className="subtle-row">
                      <button
                        type="button"
                        className="text-btn"
                        onClick={async () => {
                          await saveSense(sense, "Already know");
                          await markSenseKnown(sense.id);
                          await replacePlanItem(sense.id, "already-know");
                          await refresh();
                        }}
                      >
                        Already know
                      </button>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={async () => {
                          await replacePlanItem(sense.id, "replaced");
                          await refresh();
                        }}
                      >
                        Skip
                      </button>
                    </div>
                  </>
                ) : null
              }
            />
          );
        })
      )}
      <div className="insight-card">
        <p className="example-index">Useful words, not random words</p>
        <p>Start with meanings you save. Today only adds a small batch when the workload still fits.</p>
      </div>
      <p className="tiny reviewed-note">
        {summary.reviewedSensesToday
          ? `Reviewed today: ${summary.reviewedSensesToday} word senses / ${summary.reviewedCardsToday} cards`
          : "No scheduled reviews completed yet today."}
        {summary.reviewAttemptsToday > summary.reviewedCardsToday
          ? ` · ${summary.reviewAttemptsToday} attempts including retries`
          : ""}
      </p>
    </section>
  );
}
