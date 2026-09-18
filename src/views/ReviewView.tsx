import { useEffect, useState } from "react";
import { PronunciationButtons } from "../components/AudioButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";
import { previewRatingIntervals } from "../scheduler/schedule";
import { buildToday, persistSessionIndex, productionBlank, questionFor, rateCard, undoLastReview, type QueueItem } from "../study/session";

const GRADE_HELP = [
  { rating: 1 as const, key: "again", label: "Again", hint: "Forgot" },
  { rating: 2 as const, key: "hard", label: "Hard", hint: "Hesitated" },
  { rating: 3 as const, key: "good", label: "Good", hint: "Recalled" },
  { rating: 4 as const, key: "easy", label: "Easy", hint: "Instant" },
];

export function ReviewView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionType, setSessionType] = useState<"scheduled" | "learn-new">("scheduled");

  useEffect(() => {
    void (async () => {
      const today = await buildToday();
      setQueue(today.queue);
      setIndex(today.plan.session && !today.plan.session.completedAt ? today.plan.session.index : 0);
      setSessionType(today.plan.session?.sessionType ?? "scheduled");
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
    const profile = await ensureProfile();
    if (!profile.seenReviewHelp) await db.profile.put({ ...profile, seenReviewHelp: true });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      const grade = { "1": 1, "2": 2, "3": 3, "4": 4 }[event.key] as 1 | 2 | 3 | 4 | undefined;
      if (grade) void rate(grade);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, busy, index, item, sessionType]);

  if (!item) {
    return (
      <section className="stack compact">
        <ScreenHeader title="Session complete" back={{ name: "today" }} backLabel="Exit practice" />
        <div className="empty-state">
          <strong>Session complete.</strong>
          <br />
          This batch is finished. Any cards that became due again are shown separately on Today.
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
  const blank = productionBlank(item.sense);
  const example = item.sense.examples[0];

  return (
    <section className="stack compact">
      <ScreenHeader
        eyebrow={`Flashcards · ${index + 1}/${queue.length}`}
        title={item.card.task === "recognition" ? "What does it mean?" : "What is the word?"}
        subtitle={revealed ? "How well did you remember the front?" : "Think of the answer, then tap the card."}
        back={{ name: "today" }}
        backLabel="Exit practice"
      />
      <div className="progress-bar" aria-label="Session progress">
        <span style={{ width: `${Math.round((index / queue.length) * 100)}%` }} />
      </div>
      <div
        className={`flashcard${revealed ? " is-flipped" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setRevealed((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setRevealed((open) => !open);
          }
        }}
        aria-label={revealed ? "Hide answer" : "Show answer"}
      >
        <div className="flash-face flash-front">
          {showWord ? (
            <>
              <p className="prompt-word">
                {word}
                <span className="pos-inline">{item.sense.pos}</span>
              </p>
              <p>{question.prompt}</p>
            </>
          ) : (
            <>
              <p className="cue-sentence">{blank}</p>
              <p>{item.sense.glossTc}</p>
            </>
          )}
          <span className="flash-hint">Tap to flip</span>
        </div>
        <div className="flash-face flash-back">
          <h2 className="prompt-word">
            {word}
            <span className="pos-inline">{item.sense.pos}</span>
          </h2>
          <p>{item.sense.glossEn}</p>
          <p>{item.sense.glossTc}</p>
          {item.sense.collocations.slice(0, 3).map((col, collocationIndex) => (
            <span className={`phrase tone-${collocationIndex % 4}`} key={col}>
              {col}
            </span>
          ))}
          {example ? (
            <p className="example-line">
              {example.en}
              <br />
              <span className="muted">{example.tc}</span>
            </p>
          ) : null}
          <div className="flash-audio" onClick={(event) => event.stopPropagation()}>
            <PronunciationButtons pronunciationId={item.sense.pronunciationId} fallbackText={word} allowed />
          </div>
        </div>
      </div>
      {revealed ? (
        <>
          <p className="tiny helper-copy">
            Rate the moment before you flipped — FSRS, the same spaced-repetition method used by Anki.
          </p>
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
                <small>{grade.hint}</small>
                {previews ? <span className="rating-interval">{previews[grade.rating]}</span> : null}
              </button>
            ))}
          </div>
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
        </>
      ) : (
        <p className="tiny helper-copy">Space flips the card. 1–4 rate Again, Hard, Good, Easy.</p>
      )}
    </section>
  );
}
