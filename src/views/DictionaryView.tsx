import { useEffect, useMemo, useState } from "react";
import { db } from "../db/database";
import { ScreenHeader } from "../components/ScreenHeader";
import { go } from "../router";
import { searchDictionary, type SearchHit } from "../search/lookup";
import { normalizeQuery } from "../search/normalize";
import type { DomainId, SenseRecord } from "../types";

const TOPICS: Array<{ id: DomainId; label: string; hint: string }> = [
  { id: "everyday", label: "Everyday", hint: "Talk to people" },
  { id: "project-management", label: "Projects", hint: "Plans and deadlines" },
  { id: "retail", label: "Shop & CX", hint: "Customers and service" },
  { id: "business", label: "Business", hint: "Meetings and money" },
  { id: "entrepreneurship", label: "Start-up", hint: "Running the business" },
  { id: "technology", label: "Tech", hint: "Tools and systems" },
];

export function DictionaryView({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [missing, setMissing] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [savedRequest, setSavedRequest] = useState("");
  const [browse, setBrowse] = useState<DomainId | null>(null);
  const [topicSenses, setTopicSenses] = useState<SenseRecord[]>([]);

  const normalized = useMemo(() => normalizeQuery(query), [query]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (!normalized) {
        setHits([]);
        setMissing(false);
        return;
      }
      const results = await searchDictionary(normalized);
      setHits(results);
      setMissing(results.length === 0);
    }, 80);
    return () => window.clearTimeout(handle);
  }, [normalized]);

  useEffect(() => {
    if (!browse) {
      setTopicSenses([]);
      return;
    }
    void db.senses.toArray().then((all) => {
      setTopicSenses(all.filter((sense) => sense.domains.includes(browse)).slice(0, 24));
    });
  }, [browse]);

  return (
    <section className="stack">
      <ScreenHeader title="Dictionary" />
      <input
        className="search-box"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          go({ name: "dictionary", q: event.target.value });
        }}
        placeholder="Search a word, form, or phrase"
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Search installed words"
      />
      {!normalized && !browse ? (
        <div className="browse-grid">
          {TOPICS.map((topic) => (
            <button key={topic.id} type="button" className="browse-tile" onClick={() => setBrowse(topic.id)}>
              {topic.label}
              <span>{topic.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
      {browse && !normalized ? (
        <div className="stack">
          <div className="row">
            <strong>{TOPICS.find((topic) => topic.id === browse)?.label}</strong>
            <button type="button" className="text-btn" onClick={() => setBrowse(null)}>Back</button>
          </div>
          {topicSenses.map((sense) => (
            <button
              key={sense.id}
              type="button"
              className="card"
              style={{ textAlign: "left" }}
              onClick={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
            >
              <div className="word-row-title">
                <strong>{sense.frequency.form || sense.id}</strong>
                <span className="pos-inline">{sense.pos}</span>
              </div>
              <p className="muted">{sense.glossTc}</p>
            </button>
          ))}
        </div>
      ) : null}
      {hits.map((hit) => (
        <article className="card" key={hit.entry.id}>
          <button type="button" className="text-btn" onClick={() => go({ name: "entry", entryId: hit.entry.id, senseId: hit.senses[0]?.id })}>
            <span className="word-row-title">
              <strong>{hit.entry.display}</strong>
              <span className="pos-inline">{hit.senses[0]?.pos}</span>
            </span>
          </button>
          {hit.senses.map((sense) => (
            <button
              key={sense.id}
              type="button"
              className="ghost block"
              onClick={() => go({ name: "entry", entryId: hit.entry.id, senseId: sense.id })}
            >
              {sense.pos}: {sense.glossEn}
            </button>
          ))}
        </article>
      ))}
      {missing ? (
        <div className="panel">
          <p><strong>Not in this offline pack</strong></p>
          <p className="muted">The app will not invent a definition or call a hidden dictionary service.</p>
          <label>
            Save a local request
            <input value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="Optional note" />
          </label>
          <div className="center-actions">
            <button
              type="button"
              className="primary block"
              onClick={async () => {
                await db.localRequests.add({
                  id: crypto.randomUUID(),
                  term: query.trim(),
                  note: requestNote,
                  createdAt: new Date().toISOString(),
                });
                setSavedRequest(query.trim());
                setRequestNote("");
              }}
            >
              Save request
            </button>
            <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Back to Today</button>
          </div>
          {savedRequest ? <p className="tiny">Saved local request for “{savedRequest}”.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
