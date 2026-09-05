import { db, ensureProfile, normalizeUserWord } from "../db/database";
import { recommendationReason } from "../recommend/select";
import { applyRating, isDue, newCardRecord } from "../scheduler/schedule";
import { studyDayKey } from "../time/timezone";
import type { CardRecord, CardTask, DailyPlanRecord, ReviewSessionType, SenseRecord, UserWordRecord } from "../types";
import { getOrCreateDailyPlan, markPlanSense } from "./plan";

export interface QueueItem {
  card: CardRecord;
  sense: SenseRecord;
  reason: string;
  isNew: boolean;
}

export interface TodaySummary {
  dayKey: string;
  dayLabel: string;
  dueCount: number;
  newLimit: number;
  pauseNew: boolean;
  packName: string | null;
  plan: DailyPlanRecord;
  introducedToday: number;
  reviewedSensesToday: number;
  reviewedCardsToday: number;
  reviewAttemptsToday: number;
  queue: QueueItem[];
  unfinishedSession: boolean;
}

function siblingKey(card: CardRecord): string {
  return `${card.entryId}:${card.task === "recognition" ? "production" : "recognition"}`;
}

export function formatStudyDayLabel(dayKey: string, timeZone: string): string {
  const date = new Date(`${dayKey}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
}

export async function buildToday(now = new Date()): Promise<TodaySummary> {
  const [profile, cards, senses, userWords, pack, plan] = await Promise.all([
    ensureProfile(),
    db.cards.toArray(),
    db.senses.toArray(),
    db.userWords.toArray(),
    db.packs.where("status").equals("installed").first(),
    getOrCreateDailyPlan(now),
  ]);

  const day = studyDayKey(now, profile.timezone);
  const senseById = new Map(senses.map((sense) => [sense.id, sense]));
  const savedBySense = new Map(userWords.map((word) => [word.senseId, word]));
  const due = cards
    .filter((card) => isDue(card, now))
    .filter((card) => savedBySense.get(card.senseId)?.membership !== "removed")
    .sort((a, b) => new Date(a.scheduler.due).getTime() - new Date(b.scheduler.due).getTime());

  const events = (await db.reviewEvents.where("studyDay").equals(day).toArray()).filter((event) => !event.undone);
  const reviewedCards = new Set(events.map((event) => event.cardId));
  const reviewedSenses = new Set(events.map((event) => event.senseId));
  const introducedSensesToday = new Set(
    cards
      .filter((card) => studyDayKey(new Date(card.introducedAt), profile.timezone) === day)
      .map((card) => card.senseId),
  ).size;

  const queue: QueueItem[] = [];
  if (plan.session && !plan.session.completedAt) {
    for (const cardId of plan.session.cardIds) {
      const card = cards.find((item) => item.id === cardId);
      if (!card || card.paused) continue;
      const sense = senseById.get(card.senseId);
      if (!sense) continue;
      queue.push({
        card,
        sense,
        reason: recommendationReason(sense, Boolean(savedBySense.get(sense.id)?.membership === "active"), profile),
        isNew: studyDayKey(new Date(card.introducedAt), profile.timezone) === day,
      });
    }
  } else {
    const seenEntries = new Set<string>();
    for (const card of due) {
      const sense = senseById.get(card.senseId);
      if (!sense) continue;
      if (seenEntries.has(siblingKey(card))) continue;
      seenEntries.add(`${card.entryId}:${card.task}`);
      queue.push({
        card,
        sense,
        reason: recommendationReason(sense, Boolean(savedBySense.get(sense.id)?.membership === "active"), profile),
        isNew: false,
      });
    }
  }

  return {
    dayKey: day,
    dayLabel: formatStudyDayLabel(day, profile.timezone),
    dueCount: due.length,
    newLimit: plan.newLimit,
    pauseNew: plan.pauseNew,
    packName: pack?.name ?? null,
    plan,
    introducedToday: introducedSensesToday,
    reviewedSensesToday: reviewedSenses.size,
    reviewedCardsToday: reviewedCards.size,
    reviewAttemptsToday: events.length,
    queue,
    unfinishedSession: Boolean(plan.session && !plan.session.completedAt && plan.session.index < plan.session.cardIds.length),
  };
}

export async function startFrozenSession(cardIds: string[], sessionType: ReviewSessionType, now = new Date()): Promise<DailyPlanRecord> {
  const plan = await getOrCreateDailyPlan(now);
  const session = {
    cardIds,
    index: plan.session && !plan.session.completedAt && plan.session.cardIds.join() === cardIds.join() ? plan.session.index : 0,
    sessionType,
    startedAt: plan.session?.startedAt && !plan.session.completedAt ? plan.session.startedAt : now.toISOString(),
    completedAt: null,
  };
  const next = { ...plan, session };
  await db.dailyPlans.put(next);
  return next;
}

export async function persistSessionIndex(index: number, completed: boolean, now = new Date()): Promise<void> {
  const plan = await getOrCreateDailyPlan(now);
  if (!plan.session) return;
  await db.dailyPlans.put({
    ...plan,
    session: {
      ...plan.session,
      index,
      completedAt: completed ? now.toISOString() : null,
    },
  });
}

export async function introduceSense(sense: SenseRecord, reason: string, now = new Date()): Promise<CardRecord> {
  const profile = await ensureProfile();
  const existing = await db.cards.get(`card:recognition:${sense.id}`);
  if (existing) {
    await markPlanSense(sense.id, "started", now);
    return existing;
  }

  const card = newCardRecord(sense.id, sense.entryId, "recognition", profile.desiredRetention, now);
  const saved = normalizeUserWord({
    id: `word:${sense.id}`,
    senseId: sense.id,
    entryId: sense.entryId,
    savedAt: now.toISOString(),
    status: "learning",
    notes: "",
    usefulness: null,
    reason,
    membership: "active",
    removedAt: null,
    knownEvidence: null,
    recommend: "include",
  });

  const day = studyDayKey(now, profile.timezone);
  await db.transaction("rw", [db.cards, db.userWords, db.profile, db.dailyPlans], async () => {
    await db.cards.put(card);
    const word = await db.userWords.get(saved.id);
    if (!word) await db.userWords.put(saved);
    else if (word.membership === "removed") {
      await db.userWords.put({ ...word, membership: "active", removedAt: null, status: word.status === "paused" ? "learning" : word.status });
    }
    const latest = await ensureProfile();
    if (latest.lastStudyDay !== day) {
      latest.lastStudyDay = day;
      latest.newIntroducedOnStudyDay = 0;
    }
    latest.newIntroducedOnStudyDay += 1;
    await db.profile.put(latest);
  });
  await markPlanSense(sense.id, "started", now);
  return card;
}

export async function rateCard(
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  now = new Date(),
  sessionType: ReviewSessionType = "scheduled",
): Promise<void> {
  await db.transaction("rw", [db.cards, db.reviewEvents, db.senses, db.profile, db.dailyPlans, db.userWords], async () => {
    const card = await db.cards.get(cardId);
    if (!card || card.paused) return;
    const last = await db.reviewEvents.where("cardId").equals(cardId).reverse().sortBy("ratedAt");
    const latestEvent = last.at(-1);
    if (latestEvent && now.getTime() - new Date(latestEvent.ratedAt).getTime() < 600) return;

    const profile = await ensureProfile();
    const { next, prior } = applyRating(card, rating, now);
    await db.cards.put(next);
    await db.reviewEvents.add({
      id: crypto.randomUUID(),
      cardId: card.id,
      senseId: card.senseId,
      task: card.task,
      ratedAt: now.toISOString(),
      studyDay: studyDayKey(now, profile.timezone),
      rating,
      prior,
      next: next.scheduler,
      undone: false,
      sessionType,
      hinted: false,
    });

    const plan = await db.dailyPlans.get(studyDayKey(now, profile.timezone));
    if (plan) {
      const items = plan.items.map((item) =>
        item.senseId === card.senseId && (item.status === "not-started" || item.status === "started")
          ? { ...item, status: "practised" as const }
          : item,
      );
      await db.dailyPlans.put({ ...plan, items });
    }

    if (card.task === "recognition" && rating >= 3 && next.scheduler.reps >= 2) {
      const productionId = `card:production:${card.senseId}`;
      const existing = await db.cards.get(productionId);
      if (!existing) {
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
  if (existing) {
    if (existing.membership === "removed") {
      await db.userWords.put({
        ...existing,
        membership: "active",
        removedAt: null,
        status: existing.status === "paused" ? "learning" : existing.status,
        recommend: "include",
        reason: existing.reason || reason,
      });
    }
    return;
  }
  await db.userWords.put(
    normalizeUserWord({
      id: `word:${sense.id}`,
      senseId: sense.id,
      entryId: sense.entryId,
      savedAt: new Date().toISOString(),
      status: "learning",
      notes: "",
      usefulness: null,
      reason,
      membership: "active",
      removedAt: null,
      knownEvidence: null,
      recommend: "include",
    }),
  );
}

export async function setWordFeedback(
  senseId: string,
  usefulness: UserWordRecord["usefulness"],
  status: UserWordRecord["status"],
): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  const known = status === "known";
  await db.userWords.put({
    ...word,
    usefulness,
    status,
    knownEvidence: known ? "self-declared" : word.knownEvidence,
    recommend: known || usefulness === "not-useful" || usefulness === "already-know" ? "exclude" : word.recommend,
  });
  // Known does not pause maintenance reviews. Not useful / removed does.
  if (status === "paused") {
    const cards = await db.cards.where("senseId").equals(senseId).toArray();
    await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: true })));
  }
}

export async function markSenseKnown(senseId: string): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  await db.userWords.put({
    ...word,
    status: "known",
    usefulness: "already-know",
    knownEvidence: "self-declared",
    recommend: "exclude",
  });
}

export async function removeFromMyWords(senseId: string, now = new Date()): Promise<UserWordRecord | null> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return null;
  const next = { ...word, membership: "removed" as const, removedAt: now.toISOString(), recommend: "exclude" as const };
  await db.userWords.put(next);
  const cards = await db.cards.where("senseId").equals(senseId).toArray();
  await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: true })));
  const plan = await getOrCreateDailyPlan(now);
  if (plan.session) {
    await db.dailyPlans.put({
      ...plan,
      items: plan.items.map((item) => (item.senseId === senseId ? { ...item, status: "not-useful" as const } : item)),
      session: {
        ...plan.session,
        cardIds: plan.session.cardIds.filter((id) => !id.endsWith(`:${senseId}`)),
      },
    });
  }
  return next;
}

export async function undoRemoveFromMyWords(previous: UserWordRecord): Promise<void> {
  await db.userWords.put({ ...previous, membership: "active", removedAt: null });
  const cards = await db.cards.where("senseId").equals(previous.senseId).toArray();
  await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: false })));
}

export async function reAddToMyWords(senseId: string): Promise<void> {
  const word = await db.userWords.get(`word:${senseId}`);
  if (!word) return;
  await db.userWords.put({
    ...word,
    membership: "active",
    removedAt: null,
    status: word.status === "paused" ? "learning" : word.status,
    recommend: word.status === "known" ? "exclude" : "include",
  });
  if (word.status !== "known") {
    const cards = await db.cards.where("senseId").equals(senseId).toArray();
    await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: false })));
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
  await db.userWords.put({
    ...word,
    status: "learning",
    usefulness: null,
    membership: "active",
    removedAt: null,
    knownEvidence: null,
    recommend: "include",
  });
  const cards = await db.cards.where("senseId").equals(senseId).toArray();
  await db.cards.bulkPut(cards.map((card) => ({ ...card, paused: false })));
}

export async function studySavedWords(now = new Date()): Promise<number> {
  const words = (await db.userWords.toArray()).filter((word) => word.membership === "active" && word.status === "learning");
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
    const collocation = sense.collocations[0];
    return {
      prompt: collocation ? `What does this mean in “${collocation}”?` : "What does this word mean in the selected sense?",
      hint: "Think of the English and Chinese meaning before you reveal.",
    };
  }
  return {
    prompt: sense.glossTc,
    hint: "Say or think the English word. Do not reveal until you have tried.",
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

export async function learnPlanSenses(now = new Date()): Promise<string[]> {
  const [plan, senses] = await Promise.all([getOrCreateDailyPlan(now), db.senses.toArray()]);
  const senseById = new Map(senses.map((sense) => [sense.id, sense]));
  const cardIds: string[] = [];
  for (const item of plan.items) {
    if (item.status !== "not-started" && item.status !== "started") continue;
    const sense = senseById.get(item.senseId);
    if (!sense) continue;
    const card = await introduceSense(sense, item.reason, now);
    cardIds.push(card.id);
  }
  if (cardIds.length) await startFrozenSession(cardIds, "learn-new", now);
  return cardIds;
}

export async function startDueSession(now = new Date()): Promise<string[]> {
  const today = await buildToday(now);
  const cardIds = today.queue.map((item) => item.card.id);
  if (cardIds.length) await startFrozenSession(cardIds, "scheduled", now);
  return cardIds;
}
