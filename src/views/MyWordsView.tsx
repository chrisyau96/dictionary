import { useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { NoteField } from "../components/NoteField";
import { SwipeRemove } from "../components/SwipeRemove";
import { WordListCard } from "../components/WordListCard";
import { db, ensureProfile } from "../db/database";
import { libraryTab } from "../progress/metrics";
import { go } from "../router";
import { nextDueForSense, removeFromMyWords, resumeLearning, undoRemoveFromMyWords } from "../study/session";
import type { CardRecord, ReviewEventRecord, SenseRecord, UserWordRecord } from "../types";

type Filter = "all" | "learning" | "known";

export function MyWordsView() {
  const [rows, setRows] = useState<
    Array<{ word: UserWordRecord; sense: SenseRecord | undefined; due: string | null; tab: "learning" | "known" }>
  >([]);
  const [filter, setFilter] = useState<Filter>("all");
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
    const dueLabels = await Promise.all(active.map((word) => nextDueForSense(word.senseId)));
    setRows(
      active.map((word, index) => ({
        word,
        sense: senses[index],
        due: dueLabels[index],
        tab: libraryTab(word, events as ReviewEventRecord[], cards as CardRecord[], profile.timezone),
      })),
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(({ word, sense, tab }) => {
      if (filter === "learning" && tab !== "learning") return false;
      if (filter === "known" && tab !== "known") return false;
      if (!needle) return true;
      const hay = `${sense?.frequency.form ?? ""} ${sense?.glossEn ?? ""} ${sense?.glossTc ?? ""} ${word.notes}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, filter, query]);

  const counts = {
    all: rows.length,
    learning: rows.filter((row) => row.tab === "learning").length,
    known: rows.filter((row) => row.tab === "known").length,
  };

  return (
    <section className="stack compact words-page">
      <ScreenHeader eyebrow="Your personal library" title="My Words" subtitle="Saved is not the same as learned." />
      <div className="segmented" role="tablist" aria-label="My Words filters">
        {(["all", "learning", "known"] as Filter[]).map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {item === "all" ? "All" : item === "learning" ? "Learning" : "Known"} ({counts[item]})
          </button>
        ))}
      </div>
      <input className="search-box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your list" />
      <p className="tiny helper-copy">
        {visible.length} active {visible.length === 1 ? "sense" : "senses"} in this view. Swipe a card left to remove it.
      </p>
      {visible.length === 0 ? (
        <div className="empty-state">
          Nothing here yet.
          <br />
          Known is not automatically earned by saving.
        </div>
      ) : null}
      {visible.map(({ word, sense, due, tab }) => {
        if (!sense) return null;
        const status =
          tab === "known"
            ? word.knownEvidence === "self-declared"
              ? "Known · self-declared"
              : "Known · verified"
            : due === "Due now"
              ? "Due"
              : word.status === "learning" && due === null
                ? "Not started"
                : "Learning";
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
              status={status}
              onOpen={() => go({ name: "entry", entryId: sense.entryId, senseId: sense.id })}
              actions={
                <div className="word-card-extra">
                  <NoteField senseId={word.senseId} initial={word.notes} />
                  {tab === "known" ? (
                    <button type="button" className="ghost" onClick={() => resumeLearning(word.senseId).then(refresh)}>
                      Learn again
                    </button>
                  ) : null}
                </div>
              }
            />
          </SwipeRemove>
        );
      })}
      <div className="insight-card">
        <p className="example-index">Keep the evidence visible</p>
        <p>Self-declared Known differs from review-verified knowledge. Marking Known does not invent a successful review.</p>
      </div>
      {undo ? (
        <div className="toast">
          Removed. Dictionary entry kept.
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
