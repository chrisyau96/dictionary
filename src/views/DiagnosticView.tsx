import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { go } from "../router";
import {
  bandLabel,
  itemForSession,
  optionOrderFor,
  recordAssessmentAnswer,
  scoreTyped,
  startAssessment,
} from "../study/assessment";
import type { AssessmentItem } from "../study/assessmentItems";
import type { AssessmentOutcome, AssessmentSessionRecord } from "../types";

export function DiagnosticView() {
  const [session, setSession] = useState<AssessmentSessionRecord | null>(null);
  const [item, setItem] = useState<AssessmentItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function show(next: AssessmentSessionRecord) {
    setSession(next);
    const current = itemForSession(next);
    setItem(current);
    setOptions(current?.options ? optionOrderFor(current) ?? current.options : []);
    setTyped("");
    setRevealed(false);
  }

  useEffect(() => {
    void startAssessment().then(show);
  }, []);

  async function submit(outcome: AssessmentOutcome, answer: string) {
    if (!session || !item || busy) return;
    setBusy(true);
    const next = await recordAssessmentAnswer(session.id, {
      itemId: item.id,
      itemVersion: item.version,
      senseId: item.senseId,
      band: item.band,
      skill: item.skill,
      outcome,
      answer,
      optionOrder: options.length ? options : undefined,
      ratedAt: new Date().toISOString(),
    });
    await show(next);
    setBusy(false);
  }

  if (session?.result) {
    const result = session.result;
    return (
      <section className="stack compact">
        <ScreenHeader title="Starting level" back={{ name: "today" }} />
        <div className="panel">
          <p>This check suggests starting with <strong>{bandLabel(result.recommendedBand)}</strong>.</p>
          <p className="muted">This checks vocabulary understanding and use. It is not an official English proficiency certificate.</p>
          <p className="tiny">
            Meaning recognition: {result.recognitionCorrect}/{result.recognitionTotal} sampled as {bandLabel(result.recognitionBand)}.
            Word use: {result.productionCorrect}/{result.productionTotal} sampled as {bandLabel(result.productionBand)}.
            Coverage: {result.coverage}.
          </p>
          <p>{result.note}</p>
        </div>
        <div className="panel stack">
          <p className="tiny">Optional: tell the selector if this felt too easy or too hard. This does not rewrite your answers.</p>
          <button
            type="button"
            className="ghost block"
            onClick={async () => {
              const profile = await ensureProfile();
              await db.profile.put({ ...profile, difficultyPreference: "harder" });
              go({ name: "today" });
            }}
          >
            Too easy
          </button>
          <button
            type="button"
            className="ghost block"
            onClick={async () => {
              const profile = await ensureProfile();
              await db.profile.put({ ...profile, difficultyPreference: "easier" });
              go({ name: "today" });
            }}
          >
            Too difficult
          </button>
        </div>
        <button type="button" className="primary block" onClick={() => go({ name: "today" })}>
          Use this starting point
        </button>
      </section>
    );
  }

  if (!item || !session) return <p className="muted">Preparing the check…</p>;
  const total = Math.max(session.itemIds.length, 32);
  const isChoice = Boolean(item.options?.length);

  return (
    <section className="stack compact">
      <ScreenHeader
        title="Starting level"
        back={{ name: "today" }}
        right={
          <span className="tiny">
            {session.currentIndex + 1}/{total}
          </span>
        }
      />
      <p className="tiny">This checks vocabulary understanding and use. It is not an official English proficiency certificate.</p>
      <div className="panel">
        <p className="tiny">{item.skill === "recognition" ? "Meaning" : "Use this word"}</p>
        <p className="prompt-word">{item.stem || item.prompt}</p>
      </div>
      {isChoice ? (
        <div className="stack">
          {options.map((option) => (
            <button key={option} type="button" className="ghost block" disabled={busy} onClick={() => submit(option === item.correct ? "correct" : "incorrect", option)}>
              {option}
            </button>
          ))}
          <button type="button" className="text-btn" disabled={busy} onClick={() => submit("unknown", "")}>
            I don’t know
          </button>
        </div>
      ) : (
        <div className="stack">
          <label>
            Type the English word
            <input value={typed} onChange={(event) => setTyped(event.target.value)} autoCapitalize="none" autoCorrect="off" />
          </label>
          <button
            type="button"
            className="primary block"
            disabled={busy}
            onClick={() => submit(scoreTyped(item, typed), typed)}
          >
            Check
          </button>
          <button type="button" className="ghost block" disabled={busy} onClick={() => submit("unknown", "")}>
            I don’t know
          </button>
          {revealed ? <p className="muted">Accepted answer: {item.correct}</p> : (
            <button type="button" className="text-btn" onClick={() => setRevealed(true)}>
              Reveal after trying
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className="text-btn"
        onClick={() => go({ name: "today" })}
      >
        Pause and go back
      </button>
    </section>
  );
}
