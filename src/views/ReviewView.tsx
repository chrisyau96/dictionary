import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";
import { previewRatingIntervals } from "../scheduler/schedule";
import { buildToday, persistSessionIndex, productionBlank, questionFor, rateCard, undoLastReview, type QueueItem } from "../study/session";

const GRADE_HELP = [
  { rating: 1 as const, key: "again", label: "Again", hint: "Forgot" },
  { rating: 2 as const, key: "hard", label: "Hard", hint: "Recalled with difficulty" },
  { rating: 3 as const, key: "good", label: "Good", hint: "Recalled" },
  { rating: 4 as const, key: "easy", label: "Easy", hint: "Effortless" },
];

export function ReviewView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sessionType, setSessionType] = useState<"scheduled" | "learn-new">("scheduled");

  useEffect(() => {
    void (async () => {
      const [today, profile] = await Promise.all([buildToday(), ensureProfile()]);
      setQueue(today.queue);
      setIndex(today.plan.session && !today.plan.session.completedAt ? today.plan.session.index : 0);
      setSessionType(today.plan.session?.sessionType ?? "scheduled");
      setShowHelp(!profile.seenReviewHelp);
      setRevealed(false);
    })();
  }, []);

  const item = queue[index];

  async function rate(rating: 1 | 2 | 3 | 4) {
    if (!item || busy || !revealed) return;
    setBusy(true);
    await rateCard(item.card.id, rating, new Date(), sessionType);
    const nextIndex = index + 1;
    const done = nextIndex >= queue.length;
    await persistSessionIndex(nextIndex, done);
    setRevealed(false);
    setIndex(nextIndex);
    setBusy(false);
    if (showHelp) {
      const profile = await ensureProfile();
      await db.profile.put({ ...profile, seenReviewHelp: true });
      setShowHelp(false);
    }
  }

  if (!item) {
    return (
      <section className="stack compact">
        <ScreenHeader title="Review" back={{ name: "today" }} />
        <div className="panel">
          <p>Session complete.</p>
          <p className="muted">This batch is finished. Any cards that became due again are shown separately on Today.</p>
        </div>
        <button type="button" className="primary block" onClick={() => go({ name: "today" })}>
          Back to Today
        </button>
      </section>
    );
  }

  const question = questionFor(item.card.task, item.sense);
  const showWord = item.card.task === "recognition";
  const previews = revealed ? previewRatingIntervals(item.card) : null;
  const word = item.sense.frequency.form || item.sense.id;

  return (
    <section className="stack compact">
      <ScreenHeader
        title={item.card.task === "recognition" ? "Recall meaning" : "Produce word"}
        back={{ name: "today" }}
        right={
          <span className="tiny">
            {index + 1}/{queue.length}
          </span>
        }
      />
      <div className="progress-bar" aria-label="Session progress">
        <span style={{ width: `${Math.round((index / queue.length) * 100)}%` }} />
      </div>
      <div className="panel">
        <p className="tiny">{question.prompt}</p>
        {showWord ? (
          <p className="prompt-word">
            {word}
            <span className="pos-inline">{item.sense.pos}</span>
          </p>
        ) : (
          <>
            <p className="prompt-word">{item.sense.glossTc}</p>
            <p className="muted">{productionBlank(item.sense)}</p>
          </>
        )}
        <p className="tiny">{question.hint}</p>
      </div>
      {!revealed ? (
        <button type="button" className="primary block" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      ) : (
        <div className="panel stack tight">
          {!showWord ? (
            <p className="prompt-word">
              {word}
              <span className="pos-inline">{item.sense.pos}</span>
            </p>
          ) : null}
          <p>{item.sense.glossEn}</p>
          <p>{item.sense.glossTc}</p>
          {item.sense.collocations.slice(0, 3).map((col) => (
            <span className="chip collocation" key={col}>
              {col}
            </span>
          ))}
          {item.sense.examples.slice(0, 2).map((example) => (
            <p className="muted" key={example.id}>
              {example.en}
              <br />
              {example.tc}
            </p>
          ))}
          <AudioButton pronunciationId={item.sense.pronunciationId} fallbackText={word} allowed={revealed} />
        </div>
      )}
      {revealed ? (
        <div className="rating-row">
          {GRADE_HELP.map((grade) => (
            <button
              key={grade.key}
              type="button"
              className={`rating ${grade.key}`}
              disabled={busy}
              onClick={() => rate(grade.rating)}
            >
              {grade.label}
              <span className="tiny">
                {grade.hint}
                {previews ? ` · ${previews[grade.rating]}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {revealed ? (
        <button
          type="button"
          className="text-btn"
          onClick={async () => {
            const ok = await undoLastReview();
            if (ok) {
              const nextIndex = Math.max(0, index - 1);
              await persistSessionIndex(nextIndex, false);
              setIndex(nextIndex);
              setRevealed(false);
            }
          }}
        >
          Undo last rating
        </button>
      ) : null}
    </section>
  );
}
