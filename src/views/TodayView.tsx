import { useEffect, useState } from "react";
import { InstallHomeCard } from "../components/InstallHomeCard";
import { SettingsIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { WordListCard } from "../components/WordListCard";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";
import { buildToday, learnPlanSenses, learnSense, loadSenseNotes, skipSense, startDueSession, type TodaySummary } from "../study/session";
import type { SenseRecord } from "../types";

export function TodayView() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [senses, setSenses] = useState<Map<string, SenseRecord>>(new Map());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [needsCheck, setNeedsCheck] = useState(false);

  async function refresh() {
    const [today, allSenses, profile, senseNotes] = await Promise.all([
      buildToday(),
      db.senses.toArray(),
      ensureProfile(),
      loadSenseNotes(),
    ]);
    setSummary(today);
    setSenses(new Map(allSenses.map((sense) => [sense.id, sense])));
    setNotes(senseNotes);
    setNeedsCheck(!profile.diagnosticCompletedAt);
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!summary) return <p className="muted">Preparing today’s words…</p>;

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
        eyebrow={summary.dayLabel}
        title="Today"
        subtitle="A few useful words. Then practise them."
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
          <span className="stat-label">New today</span>
        </div>
        <div className="stat">
          <b>{summary.dueCount}</b>
          <span className="stat-label">Reviews due</span>
        </div>
      </div>
      {needsCheck ? (
        <button type="button" className="text-btn" onClick={() => go({ name: "diagnostic" })}>
          Find your starting level
        </button>
      ) : null}
      {summary.pauseNew ? <p className="tiny">New words wait until due reviews are closer to your daily capacity.</p> : null}
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
        <div className="empty-state">Today’s planned work is done.</div>
      )}
      {waitingCount ? (
        <p className="tiny helper-copy">
          {waitingCount} {waitingCount === 1 ? "word is" : "words are"} still waiting on this list.
        </p>
      ) : null}
      <h2 className="section-label">Your words</h2>
      {visibleItems.length === 0 ? (
        <div className="empty-state">
          {summary.pauseNew
            ? "Review first today."
            : "No new words were selected for today. Search Dictionary if you need something specific."}
        </div>
      ) : (
        visibleItems.map((item) => {
          const sense = senses.get(item.senseId);
          if (!sense) return null;
          return (
            <WordListCard
              key={item.senseId}
              sense={sense}
              note={notes[item.senseId]}
              onOpen={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
              actions={
                item.status === "not-started" ? (
                  <div className="split-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={async () => {
                        await learnSense(sense, item.reason);
                        go({ name: "entry", entryId: sense.entryId, senseId: sense.id });
                      }}
                    >
                      Learn
                    </button>
                    <button
                      type="button"
                      className="ghost skip-btn"
                      onClick={async () => {
                        await skipSense(sense);
                        await refresh();
                      }}
                    >
                      Skip
                    </button>
                  </div>
                ) : (
                  <p className="tiny helper-copy">{item.status === "practised" ? "Practised today" : "In Learning"}</p>
                )
              }
            />
          );
        })
      )}
      <p className="tiny reviewed-note">
        {summary.reviewedSensesToday
          ? `Reviewed today: ${summary.reviewedSensesToday} ${summary.reviewedSensesToday === 1 ? "word" : "words"}`
          : "No reviews completed yet today."}
      </p>
      <InstallHomeCard compact />
    </section>
  );
}
