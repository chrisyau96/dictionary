import { useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { DIAGNOSTIC_ITEMS, saveDiagnostic } from "../study/diagnostic";
import type { DiagnosticAnswer, DiagnosticResponse } from "../types";
import { go } from "../router";

export function DiagnosticView() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<DiagnosticResponse[]>([]);
  const [doneBand, setDoneBand] = useState<string | null>(null);
  const item = DIAGNOSTIC_ITEMS[index];

  async function choose(answer: DiagnosticAnswer) {
    if (!item) return;
    const next = [
      ...answers,
      { itemId: item.id, senseId: item.senseId, kind: item.kind, answer },
    ];
    setAnswers(next);
    setRevealed(false);
    if (index + 1 >= DIAGNOSTIC_ITEMS.length) {
      const band = await saveDiagnostic(next);
      setDoneBand(band);
      return;
    }
    setIndex(index + 1);
  }

  if (doneBand) {
    return (
      <section className="stack">
        <ScreenHeader title="Start check" back={{ name: "today" }} />
        <div className="panel">
          <p>This short check suggests a <strong>{doneBand}</strong> vocabulary band.</p>
          <p className="muted">It is an estimate from {DIAGNOSTIC_ITEMS.length} items, not a formal English exam or CEFR result.</p>
        </div>
        <div className="center-actions">
          <button type="button" className="primary block" onClick={() => go({ name: "today" })}>Back to Today</button>
        </div>
      </section>
    );
  }

  if (!item) return null;

  return (
    <section className="stack">
      <ScreenHeader title="Start check" back={{ name: "today" }} right={<span className="tiny">{index + 1}/{DIAGNOSTIC_ITEMS.length}</span>} />
      <div className="panel">
        <p className="tiny">{item.kind === "recognition" ? "Do you understand this word?" : "Could you produce this English word?"}</p>
        <p className="prompt-word">{item.prompt}</p>
        {revealed ? <p>{item.answer}</p> : <button type="button" className="primary block" onClick={() => setRevealed(true)}>Reveal</button>}
      </div>
      {revealed ? (
        <div className="stack">
          <button type="button" className="rating good" onClick={() => choose("know")}>I can use it</button>
          <button type="button" className="rating hard" onClick={() => choose("familiar")}>Familiar, but I cannot use it</button>
          <button type="button" className="rating again" onClick={() => choose("unknown")}>I do not know</button>
        </div>
      ) : null}
      <div className="center-actions">
        <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Skip and go back</button>
      </div>
    </section>
  );
}
