import type { ReactNode } from "react";
import { AudioButton } from "./AudioButton";
import { ScoreBadge } from "./ScoreBadge";
import type { SenseRecord } from "../types";

export function WordListCard({
  sense,
  status,
  onOpen,
  actions,
}: {
  sense: SenseRecord;
  status?: ReactNode;
  onOpen?: () => void;
  actions?: ReactNode;
}) {
    const word = sense.frequency.form || sense.id;
    const heading = (
      <>
        <span className="word-row-title">
          <strong>{word}</strong>
          <span className="pos-inline">{sense.pos}</span>
        </span>
        {status ? <span className="tiny">{status}</span> : null}
        <p className="word-card-en">{sense.glossEn}</p>
      </>
    );
    return (
    <article className="word-card">
      <div className="word-card-top">
        {onOpen ? (
          <button type="button" className="word-card-main" onClick={onOpen}>
            {heading}
          </button>
        ) : (
          <div className="word-card-main">{heading}</div>
        )}
        <div className="word-card-meta">
          <ScoreBadge score={sense.frequency.commonness} />
          <AudioButton pronunciationId={sense.pronunciationId} fallbackText={word} allowed label={`Play pronunciation of ${word}`} />
        </div>
      </div>
      {actions}
    </article>
  );
}
