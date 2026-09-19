import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PronunciationButtons } from "../components/AudioButton";
import { BackButton } from "../components/ScreenHeader";
import { WordDetail } from "../components/WordDetail";
import { answersMatch, buildClozeForSense, clozeCoreByKey, type ClozeExercise } from "../content/cloze";
import { go } from "../router";
import { buildToday, persistSessionIndex, rateCard, type QueueItem } from "../study/session";

type Phase = "meaning" | "cloze" | "detail";

interface SessionResult {
  word: string;
  gotIt: boolean;
  blanksCorrect: number;
  blanksTotal: number;
}

function ReviewChrome({
  index,
  total,
  children,
}: {
  index: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className="stack compact review-page">
      <div className="review-chrome">
        <BackButton to={{ name: "today" }} label="Exit revision" />
        <div className="progress-bar" aria-label="Session progress">
          <span style={{ width: `${Math.round((index / Math.max(1, total)) * 100)}%` }} />
        </div>
        <span className="tiny review-count">
          {Math.min(index + 1, total)}/{total}
        </span>
      </div>
      {children}
    </section>
  );
}

function ClozePrompt({
  exercise,
  answers,
  checked,
  onChange,
}: {
  exercise: ClozeExercise;
  answers: Record<string, string>;
  checked: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <p className="cloze-sentence">
      {exercise.tokens.map((token, index) => {
        if (token.type === "space") return <span key={`s${index}`}>{token.text}</span>;
        if (!token.blank) {
          return (
            <span key={token.key}>
              {token.leading}
              {token.core}
              {token.trailing}
            </span>
          );
        }
        const given = answers[token.key] ?? "";
        const ok = checked ? answersMatch(token.core, given) : null;
        return (
          <span key={token.key} className="cloze-word">
            {token.leading}
            <input
              className={`cloze-input${ok === true ? " is-correct" : ok === false ? " is-wrong" : ""}`}
              value={given}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Blank ${token.core.length} letters`}
              style={{ width: `${Math.max(3.2, token.core.length + 1.2)}ch` }}
              onChange={(event) => onChange(token.key, event.target.value)}
            />
            {token.trailing}
          </span>
        );
      })}
    </p>
  );
}

export function ReviewView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("meaning");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessionType, setSessionType] = useState<"scheduled" | "learn-new">("scheduled");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clozeChecked, setClozeChecked] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);

  useEffect(() => {
    void (async () => {
      const today = await buildToday();
      setQueue(today.queue);
      setIndex(today.plan.session && !today.plan.session.completedAt ? today.plan.session.index : 0);
      setSessionType(today.plan.session?.sessionType ?? "scheduled");
      setPhase("meaning");
      setLoaded(true);
    })();
  }, []);

  const item = queue[index];
  const exercise = useMemo(() => (item ? buildClozeForSense(item.sense) : null), [item]);
  const word = item ? item.sense.frequency.form || item.sense.id : "";

  function resetPrompt() {
    setPhase("meaning");
    setAnswers({});
    setClozeChecked(false);
  }

  async function rate(gotIt: boolean) {
    if (!item || busy || phase !== "detail" || !exercise) return;
    setBusy(true);
    await rateCard(item.card.id, gotIt ? 3 : 1, new Date(), sessionType);
    const blanksTotal = exercise.blankKeys.length;
    const blanksCorrect = exercise.blankKeys.filter((key) => answersMatch(clozeCoreByKey(exercise, key), answers[key] ?? "")).length;
    const nextResults = [
      ...results,
      { word: item.sense.frequency.form || word, gotIt, blanksCorrect, blanksTotal },
    ];
    setResults(nextResults);
    const nextIndex = index + 1;
    const done = nextIndex >= queue.length;
    await persistSessionIndex(nextIndex, done);
    resetPrompt();
    setIndex(nextIndex);
    setBusy(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
        if (event.key === "Enter" && phase === "cloze") {
          event.preventDefault();
          if (!clozeChecked) setClozeChecked(true);
          else setPhase("detail");
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (phase === "meaning") setPhase("cloze");
        else if (phase === "cloze" && !clozeChecked) setClozeChecked(true);
        else if (phase === "cloze") setPhase("detail");
        return;
      }
      if (phase === "detail" && (event.key === "1" || event.key.toLowerCase() === "f")) void rate(false);
      if (phase === "detail" && (event.key === "2" || event.key === "3" || event.key.toLowerCase() === "g")) void rate(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, clozeChecked, busy, item, sessionType, exercise, answers, results, index, queue.length]);

  if (!loaded) return <p className="muted">Opening revision…</p>;

  if (!item) {
    const gotIt = results.filter((row) => row.gotIt).length;
    const forgot = results.length - gotIt;
    if (!results.length) {
      return (
        <ReviewChrome index={0} total={0}>
          <div className="empty-state">Nothing is waiting in this revision.</div>
          <button type="button" className="primary block" onClick={() => go({ name: "today" })}>
            Back to Today
          </button>
        </ReviewChrome>
      );
    }
    return (
      <ReviewChrome index={results.length} total={results.length}>
        <div className="results-hero">
          <div className="results-mark" aria-hidden="true">
            ✓
          </div>
          <p className="hero-kicker">Revision complete</p>
          <h1 className="page-title">Congratulations</h1>
          <p className="lede">
            {gotIt === results.length
              ? "You remembered every word in this batch."
              : forgot === results.length
                ? "This batch is done. These words will come back sooner."
                : "You finished this revision. Keep the ones you forgot moving."}
          </p>
        </div>
        <div className="kpi-grid">
          <div className="stat">
            <b>{results.length}</b>
            <span className="stat-label">Words revised</span>
          </div>
          <div className="stat">
            <b>{gotIt}</b>
            <span className="stat-label">Got it</span>
          </div>
          <div className="stat">
            <b>{forgot}</b>
            <span className="stat-label">Forgot</span>
          </div>
          <div className="stat">
            <b>
              {results.reduce((sum, row) => sum + row.blanksCorrect, 0)}
              <span className="stat-over">/{results.reduce((sum, row) => sum + row.blanksTotal, 0) || 0}</span>
            </b>
            <span className="stat-label">Blanks spelled</span>
          </div>
        </div>
        <div className="panel results-list">
          <p className="example-index">This session</p>
          {results.map((row, resultIndex) => (
            <div className="results-row" key={`${row.word}-${resultIndex}`}>
              <strong>{row.word}</strong>
              <span className={row.gotIt ? "pill" : "pill is-forgot"}>{row.gotIt ? "Got it" : "Forgot"}</span>
            </div>
          ))}
        </div>
        <button type="button" className="primary block" onClick={() => go({ name: "today" })}>
          Back to Today
        </button>
      </ReviewChrome>
    );
  }

  if (phase === "meaning") {
    return (
      <ReviewChrome index={index} total={queue.length}>
        <div className="hero-card review-prompt">
          <p className="hero-kicker">Remember the meaning</p>
          <h1 className="headword">{word}</h1>
          <p className="hero-sub">{item.sense.pos}</p>
          <div className="pron-row">
            <div className="pron-copy">
              <span className="pron-label">Say it, then recall the meaning</span>
            </div>
            <PronunciationButtons pronunciationId={item.sense.pronunciationId} fallbackText={word} allowed />
          </div>
        </div>
        <button type="button" className="primary block" onClick={() => setPhase("cloze")}>
          Check
        </button>
      </ReviewChrome>
    );
  }

  if (phase === "cloze" && exercise) {
    const correct = exercise.blankKeys.filter((key) => answersMatch(clozeCoreByKey(exercise, key), answers[key] ?? "")).length;
    return (
      <ReviewChrome index={index} total={queue.length}>
        <div className="cloze-card">
          <p className="hero-kicker">Fill in the blanks</p>
          <p className="lede">Type the missing English words. Half of the sentence is blanked.</p>
          <ClozePrompt
            exercise={exercise}
            answers={answers}
            checked={clozeChecked}
            onChange={(key, value) => setAnswers((current) => ({ ...current, [key]: value }))}
          />
          {exercise.hintTc ? <p className="muted cloze-hint">{exercise.hintTc}</p> : null}
          {clozeChecked ? (
            <p className="tiny helper-copy">
              {correct}/{exercise.blankKeys.length} spelled correctly
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="primary block"
          onClick={() => {
            if (!clozeChecked) setClozeChecked(true);
            else setPhase("detail");
          }}
        >
          {clozeChecked ? "Show word" : "Check"}
        </button>
      </ReviewChrome>
    );
  }

  return (
    <ReviewChrome index={index} total={queue.length}>
      {exercise ? (
        <p className="tiny helper-copy">
          {exercise.blankKeys.filter((key) => answersMatch(clozeCoreByKey(exercise, key), answers[key] ?? "")).length}/
          {exercise.blankKeys.length} blanks correct · rate this word
        </p>
      ) : null}
      <WordDetail
        key={item.card.id}
        entryId={item.sense.entryId}
        senseId={item.sense.id}
        showBack={false}
        hideLearn
      />
      <div className="review-actions">
        <button type="button" className="rating again" disabled={busy} onClick={() => void rate(false)}>
          Forgot
        </button>
        <button type="button" className="rating good" disabled={busy} onClick={() => void rate(true)}>
          Got it
        </button>
      </div>
    </ReviewChrome>
  );
}
