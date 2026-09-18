import { useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { SwipeRemove } from "../components/SwipeRemove";
import { WordListCard } from "../components/WordListCard";
import { db, ensureProfile } from "../db/database";
import { wordListTab, type WordListTab } from "../progress/metrics";
import { go } from "../router";
import { learnSense, removeFromMyWords, skipSense, undoRemoveFromMyWords } from "../study/session";
import type { CardRecord, ReviewEventRecord, SenseRecord, UserWordRecord } from "../types";

const TABS: Array<{ id: WordListTab; label: string }> = [
  { id: "learning", label: "Learning" },
  { id: "learnt", label: "Learnt" },
  { id: "skipped", label: "Skipped" },
];

export function MyWordsView() {
  const [rows, setRows] = useState<Array<{ word: UserWordRecord; sense: SenseRecord | undefined; tab: WordListTab }>>([]);
  const [filter, setFilter] = useState<WordListTab>("learning");
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState<UserWordRecord | null>(null);

  async function refresh() {
    const [words, events, cards, profile] = await Promise.all([
      db.userWords.toArray(),
      db.reviewEvents.toArray(),
      db.cards.toArray(),
      ensureProfile(),
    ]);
    const active = words.filter((word) => word.membership === "active").sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    const senses = await db.senses.bulkGet(active.map((word) => word.senseId));
    setRows(
      active.map((word, index) => ({
        word,
        sense: senses[index],
        tab: wordListTab(word, events as ReviewEventRecord[], cards as CardRecord[], profile.timezone),
      })),
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(({ word, sense, tab }) => {
      if (tab !== filter) return false;
      if (!needle) return true;
      const hay = `${sense?.frequency.form ?? ""} ${sense?.glossEn ?? ""} ${sense?.glossTc ?? ""} ${word.notes}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, filter, query]);

  const counts = {
    learning: rows.filter((row) => row.tab === "learning").length,
    learnt: rows.filter((row) => row.tab === "learnt").length,
    skipped: rows.filter((row) => row.tab === "skipped").length,
  };

  return (
    <section className="stack compact words-page">
      <ScreenHeader eyebrow="Your list" title="My Words" subtitle="Learning, learnt, and skipped — all in one place." />
      <div className="segmented" role="tablist" aria-label="My Words filters">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>
      <input className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your list" />
      {visible.length === 0 ? (
        <div className="empty-state">
          {query.trim()
            ? "No wordings found."
            : filter === "learning"
              ? "Nothing in Learning yet. Pick a word from Today or Dictionary."
              : filter === "learnt"
                ? "Nothing learnt yet."
                : "Nothing skipped yet."}
        </div>
      ) : null}
      {visible.map(({ word, sense, tab }) => {
        if (!sense) return null;
        return (
          <SwipeRemove
            key={word.id}
            onRemove={async () => {
              const previous = await removeFromMyWords(word.senseId);
              setUndo(previous);
              await refresh();
            }}
          >
            <WordListCard
              sense={sense}
              note={word.notes}
              onOpen={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
              actions={
                tab === "learnt" ? (
                  <div className="split-actions">
                    <button type="button" className="primary" onClick={() => learnSense(sense).then(refresh)}>
                      Learn
                    </button>
                    <button type="button" className="ghost skip-btn" onClick={() => skipSense(sense).then(refresh)}>
                      Skip
                    </button>
                  </div>
                ) : null
              }
            />
          </SwipeRemove>
        );
      })}
      {undo ? (
        <div className="toast">
          Removed.
          <button
            type="button"
            className="text-btn"
            onClick={async () => {
              await undoRemoveFromMyWords(undo);
              setUndo(null);
              await refresh();
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </section>
  );
}
