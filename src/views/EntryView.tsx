import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { go } from "../router";
import { introduceSense, saveSense } from "../study/session";
import type { EntryRecord, SenseRecord } from "../types";

export function EntryView({ entryId, senseId }: { entryId: string; senseId?: string }) {
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [senses, setSenses] = useState<SenseRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(senseId ?? null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void Promise.all([db.entries.get(entryId), db.senses.where("entryId").equals(entryId).toArray()]).then(
      ([found, list]) => {
        setEntry(found ?? null);
        setSenses(list);
        setSelected((current) => current ?? senseId ?? list[0]?.id ?? null);
      },
    );
  }, [entryId, senseId]);

  const sense = senses.find((item) => item.id === selected) ?? null;

  if (!entry) {
    return (
      <section className="stack">
        <ScreenHeader title="Word" back={{ name: "dictionary", q: "" }} />
        <p className="muted">Entry not found in the installed pack.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <ScreenHeader title="Dictionary" back={{ name: "dictionary", q: entry.lemma }} />
      {sense ? (
        <div className="panel entry-hero">
          <div className="entry-top">
            <h1 className="headword">
              {entry.display}
              <span className="pos-inline">{sense.pos}</span>
            </h1>
            <ScoreBadge score={sense.frequency.commonness} />
          </div>
          <div className="row" style={{ marginTop: "0.55rem" }}>
            <span className="ipa">{sense.ipa}</span>
            <AudioButton pronunciationId={sense.pronunciationId} fallbackText={entry.display} allowed />
          </div>
          <div className="meaning">
            <div className="en">{sense.glossEn}</div>
            <div className="tc">{sense.glossTc}</div>
          </div>
          {sense.usageNote ? <p className="tiny" style={{ marginTop: "0.55rem" }}>{sense.usageNote}</p> : null}
        </div>
      ) : null}
      {senses.length > 1 ? (
        <div className="panel">
          <p className="tiny">This word has more than one meaning. Choose the sense you want to learn.</p>
          <div className="stack">
            {senses.map((item) => (
              <button key={item.id} type="button" className={item.id === selected ? "primary block" : "ghost block"} onClick={() => setSelected(item.id)}>
                {item.pos}: {item.glossEn}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {sense ? (
        <>
          <div className="panel">
            <p className="example-index">EXAMPLES</p>
            {sense.examples.map((example, index) => (
              <div className="example" key={example.id}>
                <p className="tiny">{index + 1} / {sense.examples.length}</p>
                <p>{example.en}</p>
                <p className="muted">{example.tc}</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <p className="example-index">USED TOGETHER</p>
            {sense.collocations.length ? (
              <div className="wrap" style={{ marginTop: "0.55rem" }}>
                {sense.collocations.map((item) => (
                  <span className="chip collocation" key={item}>{item}</span>
                ))}
              </div>
            ) : (
              <p className="muted">No strong collocation is listed for this sense.</p>
            )}
          </div>
          <div className="panel">
            <p className="example-index">SIMILAR WORDS</p>
            {sense.synonymStatus === "none-appropriate" || sense.synonyms.length === 0 ? (
              <p className="muted">No interchangeable synonym is appropriate here.</p>
            ) : (
              <div className="stack" style={{ marginTop: "0.45rem" }}>
                {sense.synonyms.map((item) => (
                  <p key={item.term}>
                    <strong>{item.term}</strong>
                    <span className="tiny"> · {item.relation}</span>
                    <br />
                    <span className="muted">{item.difference}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="center-actions">
            <button
              type="button"
              className="primary block"
              onClick={async () => {
                await saveSense(sense, "Saved by you");
                await introduceSense(sense, "Saved by you");
                setMessage("Saved to My Words and added to Today.");
              }}
            >
              Save this meaning
            </button>
            <button type="button" className="ghost block" onClick={() => go({ name: "dictionary", q: entry.lemma })}>
              Back to search
            </button>
            {message ? <p className="tiny">{message}</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
