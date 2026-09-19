import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AiDialog } from "./AiDialog";
import { PronunciationButtons } from "./AudioButton";
import { FrequencyBars } from "./FrequencyBars";
import aiFabIcon from "../assets/ai-fab.png";
import { NoteField } from "./NoteField";
import { BackButton } from "./ScreenHeader";
import { db } from "../db/database";
import { traditionalWithoutEnglish } from "../content/examples";
import { wordListTab, type WordListTab } from "../progress/metrics";
import { learnSense, loadSenseNotes } from "../study/session";
import type { CardRecord, EntryRecord, ReviewEventRecord, SenseRecord, UserWordRecord } from "../types";
import type { Route } from "../router";

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

function senseTab(
  word: UserWordRecord | undefined,
  events: ReviewEventRecord[],
  cards: CardRecord[],
  timezone: string,
): WordListTab | "none" {
  if (!word || word.membership !== "active") return "none";
  return wordListTab(word, events, cards, timezone);
}

export function WordDetail({
  entryId,
  senseId,
  back = "history",
  showBack = true,
  hideLearn = false,
  hideFab = false,
}: {
  entryId: string;
  senseId?: string;
  back?: Route | "history";
  showBack?: boolean;
  hideLearn?: boolean;
  hideFab?: boolean;
}) {
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [senses, setSenses] = useState<SenseRecord[]>([]);
  const [tabs, setTabs] = useState<Record<string, WordListTab | "none">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const [found, list, events, cards, profile] = await Promise.all([
      db.entries.get(entryId),
      db.senses.where("entryId").equals(entryId).toArray(),
      db.reviewEvents.toArray(),
      db.cards.toArray(),
      db.profile.get("profile"),
    ]);
    setEntry(found ?? null);
    setSenses(list);
    const words = await db.userWords.bulkGet(list.map((sense) => `word:${sense.id}`));
    const timezone = profile?.timezone ?? "Asia/Hong_Kong";
    const next: Record<string, WordListTab | "none"> = {};
    list.forEach((sense, index) => {
      next[sense.id] = senseTab(words[index], events, cards, timezone);
    });
    setTabs(next);
    setNotes(await loadSenseNotes(list.map((sense) => sense.id)));
    setLoaded(true);
  }

  useEffect(() => {
    setLoaded(false);
    void load();
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, senseId]);

  if (!loaded && !entry) return <p className="muted">Opening word…</p>;

  if (!entry) {
    return (
      <section className="stack compact">
        {showBack ? <BackButton to={back} /> : null}
        <p className="muted">Entry not found in the installed pack.</p>
      </section>
    );
  }

  const focused = senses.find((item) => item.id === senseId) ?? senses[0] ?? null;
  const ordered = focused ? [focused, ...senses.filter((item) => item.id !== focused.id)] : senses;

  return (
    <section className="stack compact entry-page">
      {focused ? (
        <div className="hero-card">
          {showBack ? <BackButton className="hero-back" to={back} /> : null}
          <p className="hero-kicker">{(focused.domains[0] ?? "workplace").replaceAll("-", " ")}</p>
          <h1 className="headword">{entry.display}</h1>
          <p className="hero-sub">in English</p>
          <div className="pron-row">
            <div className="pron-copy">
              <span className="pron-label">Pronunciation</span>
              {focused.ipa ? <span className="ipa-inline">{focused.ipa}</span> : null}
            </div>
            <div className="pron-tools">
              <FrequencyBars score={focused.frequency.commonness} />
              <PronunciationButtons pronunciationId={focused.pronunciationId} fallbackText={entry.display} allowed />
            </div>
          </div>
        </div>
      ) : null}
      {ordered.map((sense, index) => {
        const tab = tabs[sense.id] ?? "none";
        const showLearn = !hideLearn && tab !== "learning";
        return (
          <article key={sense.id} className={`sense-block${sense.id === senseId ? " is-focus" : ""}`}>
            {senses.length > 1 ? (
              <p className="sense-kicker">
                Meaning {index + 1} of {senses.length}
                <span className="pos-inline">{sense.pos}</span>
              </p>
            ) : (
              <p className="sense-kicker">{sense.pos}</p>
            )}
            {sense.id !== focused?.id ? (
              <div className="pron-mini">
                {sense.ipa ? <span className="ipa-inline">{sense.ipa}</span> : <span className="tiny">Pronunciation</span>}
                <FrequencyBars score={sense.frequency.commonness} />
                <PronunciationButtons pronunciationId={sense.pronunciationId} fallbackText={entry.display} allowed />
              </div>
            ) : null}
            <div className="meaning">
              <div className="en">{sense.glossEn}</div>
              <div className="tc">{sense.glossTc}</div>
            </div>
            {sense.collocations.length ? (
              <div className="collocation-block">
                <p className="example-index">Often used together</p>
                {sense.collocations.map((item, collocationIndex) => (
                  <span className={`phrase tone-${collocationIndex % 4}`} key={item}>
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {sense.examples.length ? (
              <div className="example-stack">
                <p className="example-index">{sense.examples.length > 1 ? "Examples" : "Example"}</p>
                {sense.examples.map((example) => (
                  <div className="example-card" key={example.id}>
                    <p>{emphasize(example.en, sense.collocations)}</p>
                    <p className="muted">{traditionalWithoutEnglish(example.tc, sense.glossTc)}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {sense.usageNote ? <p className="tiny usage-note">{sense.usageNote}</p> : null}
            <NoteField senseId={sense.id} entryId={entry.id} initial={notes[sense.id] ?? ""} />
            {tab === "learning" && !hideLearn ? <div className="saved-banner">In Learning</div> : null}
            {showLearn ? (
              <button
                type="button"
                className="primary block"
                disabled={busyId === sense.id}
                onClick={async () => {
                  setBusyId(sense.id);
                  await learnSense(sense);
                  await load();
                  setBusyId(null);
                }}
              >
                I want to learn this
              </button>
            ) : null}
          </article>
        );
      })}
      {focused && !aiOpen && !hideFab ? (
        <button type="button" className="ai-fab" aria-label="Ask AI" onClick={() => setAiOpen(true)}>
          <img src={aiFabIcon} alt="" width={64} height={64} />
        </button>
      ) : null}
      {aiOpen && focused ? (
        <AiDialog
          word={entry.display}
          senseId={focused.id}
          entryId={entry.id}
          onClose={() => setAiOpen(false)}
          onNoted={() => void load()}
        />
      ) : null}
    </section>
  );
}
