import { useEffect, useMemo, useState } from "react";
import { db } from "../db/database";
import { go } from "../router";
import { searchDictionary, type SearchHit } from "../search/lookup";
import { normalizeQuery } from "../search/normalize";

export function DictionaryView({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [missing, setMissing] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [savedRequest, setSavedRequest] = useState("");

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

  return (
    <section className="stack">
      <header className="topbar">
        <h1>Dictionary</h1>
      </header>
      <label>
        Search installed words
        <input
          className="search-box"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            go({ name: "dictionary", q: event.target.value });
          }}
          placeholder="saw, streamline, cash flow"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>
      {hits.map((hit) => (
        <article className="card" key={hit.entry.id}>
          <div className="row">
            <button type="button" className="text-btn" onClick={() => go({ name: "entry", entryId: hit.entry.id })}>
              <strong>{hit.entry.display}</strong>
            </button>
            <span className="tiny">{hit.matchKind === "exact-form" ? `form: ${hit.matchedForm}` : hit.matchKind}</span>
          </div>
          {hit.senses.map((sense) => (
            <button
              key={sense.id}
              type="button"
              className="ghost block"
              onClick={() => go({ name: "entry", entryId: hit.entry.id, senseId: sense.id })}
            >
              <span className="pos">{sense.pos}</span> · {sense.glossEn}
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
          <button
            type="button"
            className="primary"
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
          {savedRequest ? <p className="tiny">Saved local request for “{savedRequest}”.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
