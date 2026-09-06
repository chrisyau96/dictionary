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

function savedStatus(word: UserWordRecord | null, started: boolean): string {
  if (!word || word.membership !== "active") return "";
  if (word.status === "known" && word.knownEvidence === "self-declared") return "Saved · marked known";
  if (word.status === "known") return "Saved · known";
  if (started) return "Saved · learning";
  return "Saved · not started";
}

export function EntryView({ entryId, senseId }: { entryId: string; senseId?: string }) {
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [senses, setSenses] = useState<SenseRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(senseId ?? null);
  const [saved, setSaved] = useState<UserWordRecord | null>(null);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [showMoreExamples, setShowMoreExamples] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function load(nextId?: string) {
    const [found, list] = await Promise.all([db.entries.get(entryId), db.senses.where("entryId").equals(entryId).toArray()]);
    setEntry(found ?? null);
    setSenses(list);
    const currentId = nextId ?? selected ?? senseId ?? list[0]?.id ?? null;
    setSelected(currentId);
    if (currentId) {
      const [word, card] = await Promise.all([db.userWords.get(`word:${currentId}`), db.cards.get(`card:recognition:${currentId}`)]);
      setSaved(word ?? null);
      setStarted(Boolean(card));
    }
  }

  useEffect(() => {
    void load(senseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, senseId]);

  useEffect(() => {
    if (!selected) return;
    void Promise.all([db.userWords.get(`word:${selected}`), db.cards.get(`card:recognition:${selected}`)]).then(([word, card]) => {
      setSaved(word ?? null);
      setStarted(Boolean(card));
    });
  }, [selected]);

  const sense = senses.find((item) => item.id === selected) ?? null;
  const membershipActive = saved?.membership === "active";
  const featured = sense?.examples[0] ?? null;
  const extraExamples = sense?.examples.slice(1) ?? [];

  if (!entry) {
    return (
      <section className="stack compact">
        <ScreenHeader back="history" backLabel="Back to Dictionary" />
        <p className="muted">Entry not found in the installed pack.</p>
      </section>
    );
  }

  return (
    <section className="stack compact">
      <ScreenHeader back="history" backLabel="Back to Dictionary" />
      {sense ? (
        <div className="panel entry-hero">
          <div className="entry-top">
            <div>
              <h1 className="headword">
                {entry.display}
                <span className="pos-inline">{sense.pos}</span>
              </h1>
              <p className="sense-kicker">{(sense.domains[0] ?? "workplace").replaceAll("-", " ")}</p>
            </div>
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
        <div className="sense-switch" role="list">
          {senses.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected ? "sense-choice active" : "sense-choice"}
              onClick={() => setSelected(item.id)}
            >
              <span className="pos-inline">{item.pos}</span>
              <span>{item.glossEn}</span>
            </button>
          ))}
        </div>
      ) : null}
      {sense ? (
        <>
          {sense.collocations.length ? (
            <div>
              {sense.collocations.slice(0, 3).map((item) => (
                <span className="phrase" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No strong combination is listed for this sense.</p>
          )}
          {featured ? (
            <blockquote className="featured-example">
              {emphasize(featured.en, sense.collocations)}
              <br />
              <span className="muted">{featured.tc}</span>
            </blockquote>
          ) : null}
          {extraExamples.length ? (
            <button type="button" className="text-btn" onClick={() => setShowMoreExamples((value) => !value)}>
              {showMoreExamples ? "Hide extra examples" : "More examples"}
            </button>
          ) : null}
          {showMoreExamples
            ? extraExamples.map((example) => (
                <div className="example" key={example.id}>
                  <p>{emphasize(example.en, sense.collocations)}</p>
                  <p className="muted">{example.tc}</p>
                </div>
              ))
            : null}
          <div className="insight-card">
            <p className="example-index">Similar words · different use</p>
            {synonymCopy(sense)}
          </div>
          {sense.usageNote ? (
            <>
              <button type="button" className="text-btn" onClick={() => setShowDetails((value) => !value)}>
                {showDetails ? "Hide usage note" : "Usage note"}
              </button>
              {showDetails ? <p className="tiny">{sense.usageNote}</p> : null}
            </>
          ) : null}
          <div className="center-actions">
            {membershipActive ? (
              <>
                <div className="saved-banner">{savedStatus(saved, started)}. Saving is not learning.</div>
                <button
                  type="button"
                  className="primary block"
                  onClick={async () => {
                    await saveSense(sense, "Saved by you");
                    await introduceSense(sense, "Saved by you");
                    setMessage("Queued to practise. It counts as introduced after you recall it.");
                    go({ name: "review" });
                  }}
                >
                  Practise this meaning
                </button>
                <div className="subtle-row">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={async () => {
                      await saveSense(sense, "Already know");
                      await markSenseKnown(sense.id);
                      setMessage("Marked known. This does not invent a successful review history.");
                      await load(sense.id);
                    }}
                  >
                    Mark known
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={async () => {
                      await removeFromMyWords(sense.id);
                      setMessage("Removed from My Words. Dictionary entry kept.");
                      await load(sense.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="primary block"
                  onClick={async () => {
                    await saveSense(sense, "Saved by you");
                    setMessage("Saved this meaning only. It remains Not started until a learning attempt.");
                    await load(sense.id);
                  }}
                >
                  Save this meaning
                </button>
                <p className="tiny helper-copy">Saving alone does not count as learning.</p>
              </>
            )}
            {message ? <p className="tiny">{message}</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
