import { db, ensureProfile } from "../db/database";
import { pickNewSenses, recommendationReason } from "../recommend/select";
import { applyRating, isDue, newCardRecord } from "../scheduler/schedule";
import { studyDayKey } from "../time/timezone";
import type { CardRecord, CardTask, SenseRecord, UserWordRecord } from "../types";

export interface QueueItem {
  card: CardRecord;
  sense: SenseRecord;
  reason: string;
  isNew: boolean;
}

export interface TodaySummary {
  dueCount: number;
  newAvailable: number;
  newLimit: number;
  newRemaining: number;
  pauseNew: boolean;
  packName: string | null;
  queue: QueueItem[];
}

function siblingKey(card: CardRecord): string {
  return `${card.entryId}:${card.task === "recognition" ? "production" : "recognition"}`;
}

export async function buildToday(now = new Date()): Promise<TodaySummary> {
  const [profile, cards, senses, userWords, pack] = await Promise.all([
    ensureProfile(),
    db.cards.toArray(),
    db.senses.toArray(),
    db.userWords.toArray(),
    db.packs.where("status").equals("installed").first(),
  ]);

  const day = studyDayKey(now, profile.timezone);
  if (profile.lastStudyDay !== day) {
    profile.lastStudyDay = day;
    profile.newIntroducedOnStudyDay = 0;
    await db.profile.put(profile);
  }

  const senseById = new Map(senses.map((sense) => [sense.id, sense]));
  const savedBySense = new Map(userWords.map((word) => [word.senseId, word]));
  const due = cards
    .filter((card) => isDue(card, now))
    .sort((a, b) => new Date(a.scheduler.due).getTime() - new Date(b.scheduler.due).getTime());

  const pauseNew = due.length > profile.dailyReviewCapacity;
  const newRemaining = Math.max(0, profile.dailyNewLimit - profile.newIntroducedOnStudyDay);
  const already = new Set(cards.map((card) => card.senseId));
  const newSenses = pauseNew || newRemaining === 0 ? [] : pickNewSenses(senses, profile, userWords, already, newRemaining);

  const queue: QueueItem[] = [];
  const seenEntries = new Set<string>();
  for (const card of due) {
    const sense = senseById.get(card.senseId);
    if (!sense) continue;
    if (seenEntries.has(siblingKey(card))) continue;
    seenEntries.add(`${card.entryId}:${card.task}`);
    queue.push({
      card,
      sense,
      reason: recommendationReason(sense, Boolean(savedBySense.get(sense.id)), profile),
      isNew: false,
    });
  }

  return {
    dueCount: due.length,
    newAvailable: newSenses.length,
    newLimit: profile.dailyNewLimit,
    newRemaining,
    pauseNew,
    packName: pack?.name ?? null,
    queue,
  };
}

export async function introduceSense(sense: SenseRecord, reason: string, now = new Date()): Promise<CardRecord> {
  const profile = await ensureProfile();
  const existing = await db.cards.get(`card:recognition:${sense.id}`);
  if (existing) return existing;

  const card = newCardRecord(sense.id, sense.entryId, "recognition", profile.desiredRetention, now);
  const saved: UserWordRecord = {
    id: `word:${sense.id}`,
    senseId: sense.id,
    entryId: sense.entryId,
    savedAt: now.toISOString(),
    status: "learning",
    notes: "",
    usefulness: null,
    reason,
  };

  const day = studyDayKey(now, profile.timezone);
  await db.transaction("rw", [db.cards, db.userWords, db.profile], async () => {
    await db.cards.put(card);
    const word = await db.userWords.get(saved.id);
    if (!word) await db.userWords.put(saved);
    const latest = await ensureProfile();
    if (latest.lastStudyDay !== day) {
      latest.lastStudyDay = day;
      latest.newIntroducedOnStudyDay = 0;
    }
    latest.newIntroducedOnStudyDay += 1;
    await db.profile.put(latest);
  });
  return card;
}

export async function rateCard(cardId: string, rating: 1 | 2 | 3 | 4, now = new Date()): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewEvents, db.senses, db.profile], async () => {
    const card = await db.cards.get(cardId);
    if (!card || card.paused) return;
    const last = await db.reviewEvents.where("cardId").equals(cardId).reverse().sortBy("ratedAt");
    const latest = last.at(-1);
    if (latest && now.getTime() - new Date(latest.ratedAt).getTime() < 600) return;

    const { next, prior } = applyRating(card, rating, now);
    await db.cards.put(next);
    await db.reviewEvents.add({
      id: crypto.randomUUID(),
      cardId: card.id,
      senseId: card.senseId,
      task: card.task,
      ratedAt: now.toISOString(),
      rating,
      prior,
      next: next.scheduler,
      undone: false,
    });

    if (card.task === "recognition" && rating >= 3 && next.scheduler.reps >= 2) {
      const productionId = `card:production:${card.senseId}`;
      const existing = await db.cards.get(productionId);
      if (!existing) {
        const profile = await ensureProfile();
        const production = newCardRecord(card.senseId, card.entryId, "production", profile.desiredRetention, now);
        const delay = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        production.scheduler.due = delay.toISOString();
        await db.cards.put(production);
      }
    }
  });
}

export async function undoLastReview(): Promise<boolean> {
  return db.transaction("rw", [db.cards, db.reviewEvents], async () => {
    const events = await db.reviewEvents.orderBy("ratedAt").reverse().toArray();
    const last = events.find((event) => !event.undone);
    if (!last) return false;
    const card = await db.cards.get(last.cardId);
    if (!card) return false;
    await db.cards.put({ ...card, scheduler: last.prior });
    await db.reviewEvents.update(last.id, { undone: true });
    return true;
  });
}

export async function saveSense(sense: SenseRecord, reason = "Saved by you"): Promise<void> {
  const existing = await db.userWords.get(`word:${sense.id}`);
  if (existing) return;
  await db.userWords.put({
    id: `word:${sense.id}`,
    senseId: sense.id,
    entryId: sense.entryId,
    savedAt: new Date().toISOString(),
    status: "learning",
    notes: "",
    usefulness: null,
    reason,
  });
}

export async function setWordFeedback(
  senseId: string,
  usefulness: UserWordRecord["usefulness"],
  status: UserWordRecord["status"],
): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  await db.userWords.put({ ...word, usefulness, status });
  if (status === "paused" || status === "known") {
    const cards = await db.cards.where("senseId").equals(senseId).toArray();
    await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: true })));
  }
}

export async function setWordNotes(senseId: string, notes: string): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  await db.userWords.put({ ...word, notes });
}

export async function resumeLearning(senseId: string): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  await db.userWords.put({ ...word, status: "learning", usefulness: null });
  const cards = await db.cards.where("senseId").equals(senseId).toArray();
  await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: false })));
}

export async function studySavedWords(now = new Date()): Promise<number> {
  const words = await db.userWords.where("status").equals("learning").toArray();
  let ready = 0;
  for (const word of words) {
    const sense = await db.senses.get(word.senseId);
    if (!sense) continue;
    await introduceSense(sense, word.reason || "Saved by you", now);
    ready += 1;
  }
  return ready;
}

export async function nextDueForSense(senseId: string, now = new Date()): Promise<string | null> {
  const cards = (await db.cards.where("senseId").equals(senseId).toArray()).filter((card) => !card.paused);
  if (!cards.length) return null;
  const due = cards.map((card) => new Date(card.scheduler.due).getTime()).sort((a, b) => a - b)[0];
  if (due <= now.getTime()) return "Due now";
  return new Date(due).toLocaleString();
}

export function questionFor(task: CardTask, sense: SenseRecord): { prompt: string; hint: string } {
  if (task === "recognition") {
    return {
      prompt: "What does this word mean in the selected sense?",
      hint: "Think of the English and Chinese meaning before you reveal.",
    };
  }
  const example = sense.examples[0];
  return {
    prompt: sense.glossTc,
    hint: example ? example.tc : "Produce the English word for this meaning.",
  };
}

export function productionBlank(sense: SenseRecord): string {
  const example = sense.examples[0];
  if (!example) return sense.glossEn;
  const form = sense.frequency.form || "";
  const pattern = form ? new RegExp(form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  if (pattern && pattern.test(example.en)) {
    return example.en.replace(pattern, "______");
  }
  return example.en;
}
