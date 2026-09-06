import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { go } from "../router";
import {
  bandLabel,
  bandTitle,
  BANDS,
  itemForSession,
  optionOrderFor,
  recordAssessmentAnswer,
  startAssessment,
} from "../study/assessment";
import type { AssessmentItem } from "../study/assessmentItems";
import { ASSESSMENT_LENGTH, type AssessmentOutcome, type AssessmentSessionRecord, type EditorialBand } from "../types";

export function DiagnosticView() {
  const [session, setSession] = useState<AssessmentSessionRecord | null>(null);
  const [item, setItem] = useState<AssessmentItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function show(next: AssessmentSessionRecord) {
    setSession(next);
    const current = itemForSession(next);
    setItem(current);
    setOptions(current?.options ? optionOrderFor(current) ?? current.options : []);
    setPicked(null);
  }

  useEffect(() => {
    void startAssessment().then(show);
  }, []);

  async function choose(option: string) {
    if (!session || !item || busy || picked) return;
    setPicked(option);
    const outcome: AssessmentOutcome = option === item.correct ? "correct" : option === "" ? "unknown" : "incorrect";
    setBusy(true);
    const next = await recordAssessmentAnswer(session.id, {
      itemId: item.id,
      itemVersion: item.version,
      senseId: item.senseId,
      band: item.band,
      skill: item.skill,
      outcome,
      answer: option,
      optionOrder: options.length ? options : undefined,
      ratedAt: new Date().toISOString(),
    });
    setSession(next);
    setBusy(false);
  }

  if (session?.result && !picked) {
    const result = session.result;
    return (
      <section className="stack compact">
        <ScreenHeader title="Starting level" back={{ name: "today" }} />
        <LevelMeter band={result.recommendedBand} correct={result.overallCorrect} total={result.overallTotal} />
        <div className="panel">
          <p>
            Your starting level is <strong>{bandTitle(result.recommendedBand)}</strong>.
          </p>
          <p className="muted">{bandLabel(result.recommendedBand)}. This is a local vocabulary check, not an official English certificate.</p>
          <p>{result.note}</p>
        </div>
        <button type="button" className="primary block" onClick={() => go({ name: "today" })}>
          Use this starting point
        </button>
      </section>
    );
  }

  if (!item || !session) return <p className="muted">Preparing the check…</p>;
  const total = Math.min(session.itemIds.length, ASSESSMENT_LENGTH);
  const number = picked ? session.responses.length : session.responses.length + 1;

  return (
    <section className="stack compact">
      <ScreenHeader
        title="Starting level"
        back={{ name: "today" }}
        right={
          <span className="tiny">
            {Math.min(number, total)}/{total}
          </span>
        }
      />
      <p className="tiny">This checks vocabulary understanding and use. It is not an official English proficiency certificate.</p>
      <div className="panel">
        <p className="tiny">{item.skill === "recognition" ? "Choose the meaning" : "Choose the word"}</p>
        <p className="prompt-word">{item.stem || item.prompt}</p>
      </div>
      <div className="stack">
        {options.map((option) => {
          const isCorrect = option === item.correct;
          const isPicked = option === picked;
          let className = "choice";
          if (picked) {
            if (isCorrect) className += " is-correct";
            else if (isPicked) className += " is-wrong";
          }
          return (
            <button key={option} type="button" className={className} disabled={busy || Boolean(picked)} onClick={() => choose(option)}>
              {option}
            </button>
          );
        })}
        {!picked ? (
          <button type="button" className="text-btn" disabled={busy} onClick={() => choose("")}>
            I don’t know
          </button>
        ) : null}
      </div>
      {picked !== null ? (
        <div className="panel">
          <p>
            {picked === item.correct ? "Correct." : "The answer is:"} <strong>{item.correct}</strong>
          </p>
          <button
            type="button"
            className="primary block"
            onClick={() => {
              if (session.result) {
                setPicked(null);
                return;
              }
              void show(session);
            }}
          >
            {session.result ? "See my level" : "Continue"}
          </button>
        </div>
      ) : (
        <button type="button" className="text-btn" onClick={() => go({ name: "today" })}>
          Pause and go back
        </button>
      )}
    </section>
  );
}

function LevelMeter({ band, correct, total }: { band: EditorialBand; correct: number; total: number }) {
  const index = BANDS.indexOf(band);
  return (
    <div className="panel level-meter">
      <p className="example-index">YOUR LEVEL</p>
      <p className="level-score">
        {correct}/{total} <span>correct</span>
      </p>
      <div className="level-track" aria-label={`Starting level ${bandTitle(band)}`}>
        {BANDS.map((item, step) => (
          <div key={item} className={`level-stop${step === index ? " is-here" : ""}${step < index ? " is-passed" : ""}`}>
            <span className="level-dot" />
            <span className="tiny">{bandTitle(item)}</span>
          </div>
        ))}
      </div>
      <p className="muted">You are here: {bandTitle(band)}.</p>
    </div>
  );
}
