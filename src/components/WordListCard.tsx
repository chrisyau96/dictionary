import type { ReactNode, MouseEvent } from "react";
import { PronunciationButtons } from "./AudioButton";
import { FrequencyBars } from "./FrequencyBars";
import { NoteDisplay } from "./NoteField";
import type { SenseRecord } from "../types";

export function WordListCard({
  sense,
  status,
  note,
  onOpen,
  actions,
}: {
  sense: SenseRecord;
  status?: ReactNode;
  note?: string;
  onOpen?: () => void;
  actions?: ReactNode;
}) {
  const word = sense.frequency.form || sense.id;

  function open(event: MouseEvent) {
    if (!onOpen) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, .speaker-btn, .word-card-actions")) return;
    onOpen();
  }

  return (
    <article
      className={`word-card${onOpen ? " is-openable" : ""}`}
      onClick={open}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      <div className="word-card-top">
        <div className="word-card-main">
          <span className="word-row-title">
            <strong>{word}</strong>
            <span className="pos-inline">{sense.pos}</span>
          </span>
          {status ? <span className="tiny">{status}</span> : null}
          <p className="word-card-en">{sense.glossEn}</p>
        </div>
        <div className="word-card-meta">
          <FrequencyBars score={sense.frequency.commonness} />
          <PronunciationButtons pronunciationId={sense.pronunciationId} fallbackText={word} allowed />
        </div>
      </div>
      <NoteDisplay note={note ?? ""} />
      {actions ? <div className="word-card-actions">{actions}</div> : null}
    </article>
  );
}
