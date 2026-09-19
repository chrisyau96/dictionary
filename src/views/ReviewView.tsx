import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PronunciationButtons } from "../components/AudioButton";
import { BackButton } from "../components/ScreenHeader";
import { WordDetail } from "../components/WordDetail";
import {
  answersMatch,
  buildClozeForSense,
  clozeCoreByKey,
  isHintSlot,
  lettersAnswer,
  seedClozeLetters,
  type ClozeExercise,
} from "../content/cloze";
import { go } from "../router";
import { buildToday, persistSessionIndex, rateCard, type QueueItem } from "../study/session";

type Phase = "meaning" | "cloze" | "detail";
type ClozeAnswers = Record<string, string[]>;

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

function LetterSlots({
  tokenKey,
  core,
  letters,
  checked,
  autoFocus,
  onChange,
}: {
  tokenKey: string;
  core: string;
  letters: string[];
  checked: boolean;
  autoFocus?: boolean;
  onChange: (next: string[]) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = [...core];
  const given = lettersAnswer(letters);
  const ok = checked ? answersMatch(core, given) : null;

  function editableIndex(from: number, step: 1 | -1): number {
    for (let i = from; i >= 0 && i < chars.length; i += step) {
      if (!isHintSlot(core, i)) return i;
    }
    return -1;
  }

  function focusSlot(index: number) {
    const node = refs.current[index];
    if (!node) return;
    node.focus();
    node.select();
  }

  function fillFrom(index: number, raw: string) {
    const incoming = [...raw].filter((ch) => /\p{L}|\p{N}/u.test(ch));
    const next = chars.map((_, slot) => letters[slot] ?? (isHintSlot(core, slot) ? chars[slot] ?? "" : ""));
    if (!incoming.length) {
      if (!isHintSlot(core, index)) next[index] = "";
      onChange(next);
      return;
    }
    let cursor = index;
    for (const ch of incoming) {
      while (cursor < chars.length && isHintSlot(core, cursor)) cursor += 1;
      if (cursor >= chars.length) break;
      next[cursor] = ch;
      cursor += 1;
    }
    onChange(next);
    const following = editableIndex(cursor, 1);
    if (following >= 0) focusSlot(following);
  }

  return (
    <span className={`cloze-letters${ok === true ? " is-correct" : ok === false ? " is-wrong" : ""}`}>
      {chars.map((ch, index) => {
        if (isHintSlot(core, index)) {
          const punct = !/\p{L}/u.test(ch);
          return (
            <span
              key={`${tokenKey}-${index}`}
              className={punct ? "cloze-punct" : "cloze-slot is-hint"}
              aria-hidden={punct ? true : undefined}
            >
              {ch}
            </span>
          );
        }
        return (
          <input
            key={`${tokenKey}-${index}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            className="cloze-slot"
            value={letters[index] ?? ""}
            maxLength={1}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={Boolean(autoFocus && index === editableIndex(0, 1))}
            aria-label={`Letter ${index + 1} of ${core.length}`}
            onChange={(event) => fillFrom(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              fillFrom(index, event.clipboardData.getData("text"));
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !(letters[index] ?? "")) {
                event.preventDefault();
                const prev = editableIndex(index - 1, -1);
                if (prev < 0) return;
                const next = [...letters];
                next[prev] = "";
                onChange(next);
                focusSlot(prev);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                const prev = editableIndex(index - 1, -1);
                if (prev >= 0) focusSlot(prev);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                const following = editableIndex(index + 1, 1);
                if (following >= 0) focusSlot(following);
              }
            }}
          />
        );
      })}
    </span>
  );
}

function ClozePrompt({
  exercise,
  answers,
  checked,
  onChange,
}: {
  exercise: ClozeExercise;
  answers: ClozeAnswers;
  checked: boolean;
  onChange: (key: string, value: string[]) => void;
}) {
  let focused = false;
  return (
    <p className="cloze-sentence">
      {exercise.tokens.map((token) => {
        if (token.type !== "word") return null;
        if (!token.blank) {
          return (
            <span className="cloze-word" key={token.key}>
              {token.leading}
              {token.core}
              {token.trailing}
            </span>
          );
        }
        const autoFocus = !focused && !checked;
        focused = true;
        return (
          <span key={token.key} className="cloze-word is-blank">
            {token.leading}
            <LetterSlots
              tokenKey={token.key}
              core={token.core}
              letters={answers[token.key] ?? seedClozeLetters(exercise)[token.key] ?? []}
              checked={checked}
              autoFocus={autoFocus}
              onChange={(value) => onChange(token.key, value)}
            />
            {token.trailing}
          </span>
        );
      })}
    </p>
  );
}

function clozeScore(exercise: ClozeExercise, answers: ClozeAnswers): { correct: number; total: number } {
  const total = exercise.blankKeys.length;
  const correct = exercise.blankKeys.filter((key) =>
    answersMatch(clozeCoreByKey(exercise, key), lettersAnswer(answers[key])),
  ).length;
  return { correct, total };
}

export function ReviewView() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("meaning");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sessionType, setSessionType] = useState<"scheduled" | "learn-new">("scheduled");
  const [answers, setAnswers] = useState<ClozeAnswers>({});
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

  function startCloze() {
    if (exercise) setAnswers(seedClozeLetters(exercise));
    setClozeChecked(false);
    setPhase("cloze");
  }

  async function rate(gotIt: boolean) {
    if (!item || busy || phase !== "detail" || !exercise) return;
    setBusy(true);
    await rateCard(item.card.id, gotIt ? 3 : 1, new Date(), sessionType);
    const score = clozeScore(exercise, answers);
    const nextResults = [
      ...results,
      { word: item.sense.frequency.form || word, gotIt, blanksCorrect: score.correct, blanksTotal: score.total },
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
        if (phase === "meaning") startCloze();
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
        <button type="button" className="primary block" onClick={startCloze}>
          Check
        </button>
      </ReviewChrome>
    );
  }

  if (phase === "cloze" && exercise) {
    const score = clozeScore(exercise, answers);
    return (
      <ReviewChrome index={index} total={queue.length}>
        <div className="cloze-card">
          <p className="hero-kicker">Fill in the blanks</p>
          <p className="lede">Type the missing letters. The first letter is given.</p>
          <ClozePrompt
            exercise={exercise}
            answers={answers}
            checked={clozeChecked}
            onChange={(key, value) => setAnswers((current) => ({ ...current, [key]: value }))}
          />
          {exercise.hintTc ? <p className="muted cloze-hint">{exercise.hintTc}</p> : null}
          {clozeChecked ? (
            <p className="tiny helper-copy">
              {score.correct}/{score.total} spelled correctly
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

  const detailScore = exercise ? clozeScore(exercise, answers) : null;
  return (
    <ReviewChrome index={index} total={queue.length}>
      {detailScore ? (
        <p className="tiny helper-copy">
          {detailScore.correct}/{detailScore.total} blanks correct · rate this word
        </p>
      ) : null}
      <WordDetail
        key={item.card.id}
        entryId={item.sense.entryId}
        senseId={item.sense.id}
        showBack={false}
        hideLearn
        hideFab
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
