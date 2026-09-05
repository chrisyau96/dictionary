import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { CommonnessBadge } from "../components/CommonnessBadge";
import { go } from "../router";
import { buildToday, productionBlank, questionFor, rateCard, undoLastReview, type QueueItem } from "../study/session";

export function ReviewView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void buildToday().then((today) => setQueue(today.queue));
  }, []);

  const item = queue[index];

  async function rate(rating: 1 | 2 | 3 | 4) {
    if (!item || busy || !revealed) return;
    setBusy(true);
    await rateCard(item.card.id, rating);
    setRevealed(false);
    setIndex((current) => current + 1);
    setBusy(false);
  }

  if (!item) {
    return (
      <section className="stack">
        <h1 className="screen-title">Session paused</h1>
        <p className="muted">No due cards remain in this queue. New senses still available can be started from Today.</p>
        <button type="button" className="primary block" onClick={() => go({ name: "today" })}>Back to Today</button>
      </section>
    );
  }

  const question = questionFor(item.card.task, item.sense);
  const showWord = item.card.task === "recognition";

  return (
    <section className="stack">
      <header className="topbar">
        <h1>{item.card.task === "recognition" ? "Recall the meaning" : "Produce the word"}</h1>
        <span className="tiny">{index + 1} / {queue.length}</span>
      </header>
      <div className="panel">
        <p className="tiny">{question.prompt}</p>
        {showWord ? (
          <p className="prompt-word">{item.sense.frequency.form || item.sense.id}</p>
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
        <div className="panel stack">
          {!showWord ? <p className="prompt-word">{item.sense.frequency.form}</p> : null}
          <p>{item.sense.glossEn}</p>
          <p>{item.sense.glossTc}</p>
          {item.sense.examples[0] ? (
            <p className="muted">
              {item.sense.examples[0].en}<br />
              {item.sense.examples[0].tc}
            </p>
          ) : null}
          <div className="wrap">
            <AudioButton
              pronunciationId={item.sense.pronunciationId}
              fallbackText={item.sense.frequency.form}
              allowed={revealed}
            />
            <CommonnessBadge score={item.sense.frequency.commonness} />
          </div>
        </div>
      )}
      {revealed ? (
        <div className="rating-row">
          <button type="button" className="rating again" disabled={busy} onClick={() => rate(1)}>Again · could not retrieve</button>
          <button type="button" className="rating hard" disabled={busy} onClick={() => rate(2)}>Hard · correct, heavy effort</button>
          <button type="button" className="rating good" disabled={busy} onClick={() => rate(3)}>Good · normal effort</button>
          <button type="button" className="rating easy" disabled={busy} onClick={() => rate(4)}>Easy · little effort</button>
        </div>
      ) : null}
      <button
        type="button"
        className="text-btn"
        onClick={async () => {
          const ok = await undoLastReview();
          if (ok) {
            setIndex((current) => Math.max(0, current - 1));
            setRevealed(false);
          }
        }}
      >
        Undo last rating
      </button>
    </section>
  );
}
