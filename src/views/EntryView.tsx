import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AudioButton } from "../components/AudioButton";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScreenHeader } from "../components/ScreenHeader";
import { db } from "../db/database";
import { go } from "../router";
import { introduceSense, markSenseKnown, removeFromMyWords, saveSense } from "../study/session";
import type { EntryRecord, SenseRecord, UserWordRecord } from "../types";

function emphasize(text: string, collocations: string[]): ReactNode {
  const match = [...collocations].sort((a, b) => b.length - a.length).find((item) => text.toLowerCase().includes(item.toLowerCase()));
  if (!match) return text;
  const index = text.toLowerCase().indexOf(match.toLowerCase());
  return (
    <>
      {text.slice(0, index)}
      <strong>{text.slice(index, index + match.length)}</strong>
      {text.slice(index + match.length)}
    </>
  );
}

function synonymCopy(sense: SenseRecord): ReactNode {
  if (sense.synonyms.length > 0 && sense.synonymStatus !== "not_prepared") {
    return (
      <div className="stack tight">
        {sense.synonyms.map((item) => (
          <p key={item.term}>
            <strong>{item.term}</strong>
            {item.relation ? <span className="tiny"> · {item.relation}</span> : null}
            <br />
            <span className="muted">{item.difference}</span>
          </p>
        ))}
      </div>
    );
  }
  if (sense.synonymStatus === "none_appropriate") {
    return <p className="muted">No close substitute in this meaning.</p>;
  }
  return <p className="muted">Similar words for this sense are not prepared yet.</p>;
}

export function EntryView({ entryId, senseId }: { entryId: string; senseId?: string }) {
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [senses, setSenses] = useState<SenseRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(senseId ?? null);
  const [saved, setSaved] = useState<UserWordRecord | null>(null);
  const [message, setMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  async function load() {
    const [found, list] = await Promise.all([db.entries.get(entryId), db.senses.where("entryId").equals(entryId).toArray()]);
    setEntry(found ?? null);
    setSenses(list);
    const currentId = selected ?? senseId ?? list[0]?.id ?? null;
    setSelected(currentId);
    if (currentId) {
      const word = await db.userWords.get(`word:${currentId}`);
      setSaved(word?.membership === "active" ? word : word ?? null);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, senseId]);

  useEffect(() => {
    if (!selected) return;
    void db.userWords.get(`word:${selected}`).then((word) => setSaved(word ?? null));
  }, [selected]);

  const sense = senses.find((item) => item.id === selected) ?? null;
  const membershipActive = saved?.membership === "active";

  if (!entry) {
    return (
      <section className="stack compact">
        <ScreenHeader title="Word" back="history" />
        <p className="muted">Entry not found in the installed pack.</p>
      </section>
    );
  }

  return (
    <section className="stack compact">
      <ScreenHeader title="Dictionary" back="history" />
      {sense ? (
        <div className="panel entry-hero">
          <div className="entry-top">
            <h1 className="headword">
              {entry.display}
              <span className="pos-inline">{sense.pos}</span>
            </h1>
            <div className="word-card-meta">
              <ScoreBadge score={sense.frequency.commonness} />
              <AudioButton
                pronunciationId={sense.pronunciationId}
                fallbackText={entry.display}
                allowed
                label={`Play pronunciation of ${entry.display}`}
              />
            </div>
          </div>
          <div className="meaning">
            <div className="en">{sense.glossEn}</div>
            <div className="tc">{sense.glossTc}</div>
          </div>
        </div>
      ) : null}
      {senses.length > 1 ? (
        <div className="wrap">
          {senses.map((item) => (
            <button key={item.id} type="button" className={item.id === selected ? "chip active" : "chip"} onClick={() => setSelected(item.id)}>
              {item.pos}
            </button>
          ))}
        </div>
      ) : null}
      {sense ? (
        <>
          <div className="panel">
            <p className="example-index">COMMON COMBINATIONS</p>
            {sense.collocations.length ? (
              <div className="wrap">
                {sense.collocations.slice(0, 3).map((item) => (
                  <span className="chip collocation" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No strong combination is listed for this sense.</p>
            )}
          </div>
          <div className="panel">
            <p className="example-index">EXAMPLES</p>
            {sense.examples.slice(0, 3).map((example) => (
              <div className="example" key={example.id}>
                <p>{emphasize(example.en, sense.collocations)}</p>
                <p className="muted">{example.tc}</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <p className="example-index">SIMILAR WORDS</p>
            {synonymCopy(sense)}
          </div>
          <button type="button" className="text-btn" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide extra detail" : "Usage note"}
          </button>
          {showDetails && sense.usageNote ? (
            <p className="tiny">{sense.usageNote}</p>
          ) : null}
          <div className="center-actions">
            {membershipActive ? (
              <button
                type="button"
                className="ghost block"
                onClick={async () => {
                  await removeFromMyWords(sense.id);
                  setMessage("Removed from My Words. Dictionary entry kept.");
                  await load();
                }}
              >
                Remove from My Words
              </button>
            ) : (
              <button
                type="button"
                className="primary block"
                onClick={async () => {
                  await saveSense(sense, "Saved by you");
                  setMessage("Saved. This is not yet counted as learned.");
                  await load();
                }}
              >
                Save this meaning
              </button>
            )}
            <button
              type="button"
              className="ghost block"
              onClick={async () => {
                await saveSense(sense, "Saved by you");
                await introduceSense(sense, "Saved by you");
                setMessage("Queued to learn next. It counts as introduced after you recall it.");
                go({ name: "review" });
              }}
            >
              Learn next
            </button>
            <button
              type="button"
              className="ghost block"
              onClick={async () => {
                await saveSense(sense, "Already know");
                await markSenseKnown(sense.id);
                setMessage("Marked known. This does not invent a successful review history.");
                await load();
              }}
            >
              Mark known
            </button>
            {message ? <p className="tiny">{message}</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
