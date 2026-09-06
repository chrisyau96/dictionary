import { useEffect, useState } from "react";
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
        title="Today"
        right={
          <button type="button" className="icon-btn" aria-label="Settings" onClick={() => go({ name: "settings" })}>
            ⚙
          </button>
        }
      />
      <p className="tiny">{summary.dayLabel}</p>
      <div className="stats-row">
        <div className="stat">
          <b>
            {introducedCount}/{summary.newLimit}
          </b>
          <span className="tiny">New today</span>
        </div>
        <div className="stat">
          <b>{summary.dueCount}</b>
          <span className="tiny">Reviews due</span>
        </div>
      </div>
      {needsCheck ? (
        <button type="button" className="ghost block" onClick={() => go({ name: "diagnostic" })}>
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
        <div className="panel muted">Today’s planned work is done. More study is optional.</div>
      )}
      <h2 className="section-label">New today</h2>
      {visibleItems.length === 0 ? (
        <p className="muted">{summary.pauseNew ? "Review first today." : "No new words were selected for today."}</p>
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
                    <button
                      type="button"
                      className="ghost"
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
                      className="ghost"
                      onClick={async () => {
                        await replacePlanItem(sense.id, "replaced");
                        await refresh();
                      }}
                    >
                      Skip
                    </button>
                  </div>
                ) : null
              }
            />
          );
        })
      )}
      <h2 className="section-label">Reviewed today</h2>
      <p className="tiny">
        {summary.reviewedSensesToday
          ? `${summary.reviewedSensesToday} word senses / ${summary.reviewedCardsToday} cards practised`
          : "No scheduled reviews completed yet today."}
        {summary.reviewAttemptsToday > summary.reviewedCardsToday
          ? ` · ${summary.reviewAttemptsToday} attempts including retries`
          : ""}
      </p>
    </section>
  );
}
