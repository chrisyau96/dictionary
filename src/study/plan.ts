import { db, ensureProfile, normalizeUserWord } from "../db/database";
import { pickNewSenses, recommendationReason } from "../recommend/select";
import { isDue } from "../scheduler/schedule";
import { studyDayKey } from "../time/timezone";
import type { DailyPlanItem, DailyPlanRecord, SenseRecord, UserWordRecord } from "../types";
import { latestCompletedAssessment, unknownSenseIdsFromAssessment } from "./assessment";

function lapseSenseIds(cards: { senseId: string; scheduler: { lapses: number } }[]): Set<string> {
  return new Set(cards.filter((card) => card.scheduler.lapses > 0).map((card) => card.senseId));
}

async function selectionContext() {
  const [profile, senses, userWords, cards, assessment] = await Promise.all([
    ensureProfile(),
    db.senses.toArray(),
    db.userWords.toArray(),
    db.cards.toArray(),
    latestCompletedAssessment(),
  ]);
  return {
    profile,
    senses,
    userWords,
    cards,
    unknownSenseIds: unknownSenseIdsFromAssessment(assessment),
    lapseSenseIds: lapseSenseIds(cards),
  };
}

export function planItemFromSense(sense: SenseRecord, saved: boolean, profile: Parameters<typeof recommendationReason>[2], source: DailyPlanItem["source"]): DailyPlanItem {
  return {
    senseId: sense.id,
    entryId: sense.entryId,
    reason: recommendationReason(sense, saved, profile),
    source,
    status: "not-started",
  };
}

export async function getOrCreateDailyPlan(now = new Date()): Promise<DailyPlanRecord> {
  const profile = await ensureProfile();
  const day = studyDayKey(now, profile.timezone);
  const existing = await db.dailyPlans.get(day);
  if (existing) return existing;

  const ctx = await selectionContext();
  const due = ctx.cards.filter((card) => isDue(card, now));
  const pauseNew = due.length > ctx.profile.dailyReviewCapacity;
  const already = new Set(ctx.cards.map((card) => card.senseId));
  const limit = pauseNew ? 0 : ctx.profile.dailyNewLimit;
  const picked = limit
    ? pickNewSenses(ctx.senses, ctx.profile, ctx.userWords, already, limit, {
        unknownSenseIds: ctx.unknownSenseIds,
        lapseSenseIds: ctx.lapseSenseIds,
      })
    : [];
  const savedIds = new Set(ctx.userWords.filter((word) => word.membership === "active").map((word) => word.senseId));
  const plan: DailyPlanRecord = {
    id: day,
    dayKey: day,
    createdAt: now.toISOString(),
    timezone: ctx.profile.timezone,
    newLimit: ctx.profile.dailyNewLimit,
    pauseNew,
    items: picked.map((sense) => planItemFromSense(sense, savedIds.has(sense.id), ctx.profile, savedIds.has(sense.id) ? "saved" : "gap")),
    session: null,
  };
  await db.dailyPlans.put(plan);
  if (profile.lastStudyDay !== day) {
    await db.profile.put({ ...profile, lastStudyDay: day, newIntroducedOnStudyDay: 0 });
  }
  return plan;
}

export async function saveDailyPlan(plan: DailyPlanRecord): Promise<void> {
  await db.dailyPlans.put(plan);
}

export async function replacePlanItem(
  senseId: string,
  status: Extract<DailyPlanItem["status"], "replaced" | "already-know" | "not-useful">,
  now = new Date(),
): Promise<DailyPlanRecord> {
  const plan = await getOrCreateDailyPlan(now);
  const ctx = await selectionContext();
  const exclude = new Set(plan.items.map((item) => item.senseId));
  const already = new Set(ctx.cards.map((card) => card.senseId));
  for (const id of exclude) already.add(id);
  const replacement = pickNewSenses(ctx.senses, ctx.profile, ctx.userWords, already, 1, {
    unknownSenseIds: ctx.unknownSenseIds,
    lapseSenseIds: ctx.lapseSenseIds,
    excludeSenseIds: exclude,
  })[0];
  const savedIds = new Set(ctx.userWords.filter((word) => word.membership === "active").map((word) => word.senseId));
  const items = plan.items.map((item) => (item.senseId === senseId ? { ...item, status } : item));
  if (replacement) {
    items.push(planItemFromSense(replacement, savedIds.has(replacement.id), ctx.profile, "replacement"));
  }
  const next = { ...plan, items };
  await db.dailyPlans.put(next);
  return next;
}

export function activePlanItems(plan: DailyPlanRecord): DailyPlanItem[] {
  return plan.items.filter((item) => item.status === "not-started" || item.status === "started" || item.status === "practised");
}

export async function markPlanSense(
  senseId: string,
  status: DailyPlanItem["status"],
  now = new Date(),
): Promise<void> {
  const plan = await getOrCreateDailyPlan(now);
  const items = plan.items.map((item) => (item.senseId === senseId ? { ...item, status } : item));
  await db.dailyPlans.put({ ...plan, items });
}

export function defaultUserWord(senseId: string, entryId: string, reason: string, now = new Date()): UserWordRecord {
  return normalizeUserWord({
    id: `word:${senseId}`,
    senseId,
    entryId,
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
}
