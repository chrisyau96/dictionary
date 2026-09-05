import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { ScreenHeader } from "../components/ScreenHeader";
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
        <ScreenHeader title="Review" back={{ name: "today" }} />
        <div className="panel">
          <p>Session clear.</p>
          <p className="muted">No due cards remain in this queue.</p>
        </div>
        <div className="center-actions">
          <button type="button" className="primary block" onClick={() => go({ name: "today" })}>Back to Today</button>
          <button type="button" className="ghost block" onClick={() => go({ name: "words" })}>Go to My Words</button>
        </div>
      </section>
    );
  }

  const question = questionFor(item.card.task, item.sense);
  const showWord = item.card.task === "recognition";

  return (
    <section className="stack">
      <ScreenHeader
        title={item.card.task === "recognition" ? "Recall meaning" : "Produce word"}
        back={{ name: "today" }}
        right={<span className="tiny">{index + 1}/{queue.length}</span>}
      />
      <div className="progress-bar" aria-label="Session progress">
        <span style={{ width: `${Math.round((index / queue.length) * 100)}%` }} />
      </div>
      <div className="panel">
        <p className="tiny">{question.prompt}</p>
        {showWord ? (
          <p className="prompt-word">
            {item.sense.frequency.form || item.sense.id}
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
        <div className="center-actions">
          <button type="button" className="primary block" onClick={() => setRevealed(true)}>Reveal answer</button>
          <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Back to Today</button>
        </div>
      ) : (
        <div className="panel stack">
          {!showWord ? (
            <p className="prompt-word">
              {item.sense.frequency.form}
              <span className="pos-inline">{item.sense.pos}</span>
            </p>
          ) : null}
          <p>{item.sense.glossEn}</p>
          <p>{item.sense.glossTc}</p>
          {item.sense.examples.slice(0, 2).map((example) => (
            <p className="muted" key={example.id}>
              {example.en}<br />
              {example.tc}
            </p>
          ))}
          {item.sense.collocations.length ? (
            <div className="wrap">
              {item.sense.collocations.slice(0, 3).map((col) => (
                <span className="chip collocation" key={col}>{col}</span>
              ))}
            </div>
          ) : null}
          <AudioButton pronunciationId={item.sense.pronunciationId} fallbackText={item.sense.frequency.form} allowed={revealed} />
        </div>
      )}
      {revealed ? (
        <div className="rating-row">
          <button type="button" className="rating again" disabled={busy} onClick={() => rate(1)}>Again</button>
          <button type="button" className="rating hard" disabled={busy} onClick={() => rate(2)}>Hard</button>
          <button type="button" className="rating good" disabled={busy} onClick={() => rate(3)}>Good</button>
          <button type="button" className="rating easy" disabled={busy} onClick={() => rate(4)}>Easy</button>
        </div>
      ) : null}
      {revealed ? (
        <div className="center-actions">
          <button
            type="button"
            className="ghost block"
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
          <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Back to Today</button>
        </div>
      ) : null}
    </section>
  );
}
