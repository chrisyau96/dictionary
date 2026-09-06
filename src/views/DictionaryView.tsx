import { useEffect, useMemo, useState } from "react";
import { db } from "../db/database";
import { ScreenHeader } from "../components/ScreenHeader";
import { WordListCard } from "../components/WordListCard";
import { go } from "../router";
import type { SearchHit } from "../search/lookup";
import { searchDictionary } from "../search/lookup";
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
  const [packLabel, setPackLabel] = useState("Installed offline pack");

  const normalized = useMemo(() => normalizeQuery(query), [query]);

  useEffect(() => {
    void db.packs.where("status").equals("installed").first().then((pack) => {
      if (pack) setPackLabel(`${pack.name} · installed`);
    });
  }, []);

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
      <ScreenHeader eyebrow={packLabel} title="Dictionary" subtitle="Find the meaning you need." />
      <input
        className="search-box"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          go({ name: "dictionary", q: event.target.value });
        }}
        placeholder="Try a workplace word, like address"
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Search installed words"
      />
      <p className="tiny helper-copy">Searches this device only. Separate noun and verb senses stay separate.</p>
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
            <button type="button" className="text-btn" onClick={() => setBrowse(null)}>
              Back
            </button>
          </div>
          {topicSenses.map((sense) => (
            <WordListCard
              key={sense.id}
              sense={sense}
              onOpen={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
            />
          ))}
        </div>
      ) : null}
      {hits.flatMap((hit) =>
        hit.senses.map((sense) => (
          <WordListCard
            key={sense.id}
            sense={sense}
            onOpen={() => go({ name: "entry", entryId: hit.entry.id, senseId: sense.id })}
          />
        )),
      )}
      {missing ? (
        <div className="empty-state">
          <strong>Not in this offline pack.</strong>
          <br />
          No online lookup has been made.
        </div>
      ) : null}
      {missing ? (
        <div className="panel">
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
            <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>
              Back to Today
            </button>
          </div>
          {savedRequest ? <p className="tiny">Saved local request for “{savedRequest}”.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
