import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { CommonnessBadge } from "../components/CommonnessBadge";
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

  if (!entry) return <p className="muted">Entry not found in the installed pack.</p>;

  return (
    <section className="stack">
      <header className="topbar">
        <button type="button" className="text-btn" onClick={() => go({ name: "dictionary", q: entry.lemma })}>Back</button>
      </header>
      <div className="panel">
        <h1 className="headword">{entry.display}</h1>
        {sense ? (
          <>
            <div className="wrap">
              <span className="pos">{sense.pos}</span>
              <span className="ipa">{sense.ipa}</span>
              <AudioButton pronunciationId={sense.pronunciationId} fallbackText={entry.display} allowed />
              <CommonnessBadge score={sense.frequency.commonness} />
            </div>
            <div className="meaning">
              <div className="en">{sense.glossEn}</div>
              <div className="tc">{sense.glossTc}</div>
            </div>
            {sense.usageNote ? <p className="tiny">{sense.usageNote}</p> : null}
          </>
        ) : null}
      </div>
      {senses.length > 1 ? (
        <div className="panel">
          <p className="tiny">This form has more than one meaning. Choose the intended sense before saving.</p>
          {senses.map((item) => (
            <button key={item.id} type="button" className={item.id === selected ? "primary block" : "ghost block"} onClick={() => setSelected(item.id)}>
              {item.pos}: {item.glossEn}
            </button>
          ))}
        </div>
      ) : null}
      {sense ? (
        <>
          <button
            type="button"
            className="primary block"
            onClick={async () => {
              await saveSense(sense, "Saved by you");
              await introduceSense(sense, "Saved by you");
              setMessage("Saved this meaning and added a recognition card.");
            }}
          >
            Save this meaning
          </button>
          {message ? <p className="tiny">{message}</p> : null}
          <details className="panel">
            <summary>Examples</summary>
            {sense.examples.map((example) => (
              <p key={example.id}>
                {example.en}<br />
                <span className="muted">{example.tc}</span>
              </p>
            ))}
          </details>
          <details className="panel">
            <summary>Synonyms and collocations</summary>
            {sense.synonymStatus === "none-appropriate" ? (
              <p className="muted">No interchangeable synonym is appropriate here.</p>
            ) : (
              <ul className="plain">
                {sense.synonyms.map((item) => (
                  <li key={item.term}>
                    <strong>{item.term}</strong> ({item.relation}): {item.difference}
                  </li>
                ))}
              </ul>
            )}
            <p className="tiny">Collocations: {sense.collocations.join(", ")}</p>
          </details>
        </>
      ) : null}
    </section>
  );
}
