import { studyDayKey } from "../time/timezone";
import {
  REVIEW_VERIFIED_RULE_VERSION,
  type CardRecord,
  type DomainId,
  type ReviewEventRecord,
  type SenseRecord,
  type UserWordRecord,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DelayedAttempt {
  event: ReviewEventRecord;
  success: boolean;
}

export interface ProgressSnapshot {
  newVocabulary7d: number;
  reviewsCompletedToday: number;
  reviewAttemptsToday: number;
  delayedRecall: { success: number; total: number; recognition: { success: number; total: number }; production: { success: number; total: number } };
  rememberedThroughReview: number;
  selfDeclaredKnown: number;
  introductionsByDay: Array<{ day: string; count: number }>;
  delayedByDay: Array<{ day: string; success: number; total: number }>;
  coverage: Array<{ domain: DomainId; notStarted: number; learning: number; reviewVerified: number; selfDeclared: number; total: number }>;
  takeaway: string | null;
  ruleVersion: string;
}

function liveEvents(events: ReviewEventRecord[]): ReviewEventRecord[] {
  return events.filter((event) => !event.undone);
}

function firstIntroductionBySense(cards: CardRecord[], timezone: string): Map<string, { at: Date; day: string }> {
  const map = new Map<string, { at: Date; day: string }>();
  for (const card of cards) {
    const at = new Date(card.introducedAt);
    const current = map.get(card.senseId);
    if (!current || at.getTime() < current.at.getTime()) {
      map.set(card.senseId, { at, day: studyDayKey(at, timezone) });
    }
  }
  return map;
}

export function qualifiedDelayedAttempts(
  events: ReviewEventRecord[],
  cards: CardRecord[],
  timezone: string,
): DelayedAttempt[] {
  const live = liveEvents(events).sort((a, b) => a.ratedAt.localeCompare(b.ratedAt));
  const cardIntro = new Map(cards.map((card) => [card.id, card.introducedAt]));
  const firstInDay = new Set<string>();
  const attempts: DelayedAttempt[] = [];
  for (const event of live) {
    const dayKey = `${event.cardId}:${event.studyDay}`;
    if (firstInDay.has(dayKey)) continue;
    firstInDay.add(dayKey);
    const intro = cardIntro.get(event.cardId);
    const elapsedMs = event.prior.last_review
      ? new Date(event.ratedAt).getTime() - new Date(event.prior.last_review).getTime()
      : intro
        ? new Date(event.ratedAt).getTime() - new Date(intro).getTime()
        : 0;
    const hasPriorSchedule = Boolean(event.prior.last_review) || event.prior.reps > 0;
    if (!hasPriorSchedule || elapsedMs < DAY_MS) continue;
    attempts.push({ event, success: event.rating >= 3 && !event.hinted });
  }
  void timezone;
  return attempts;
}

export function isReviewVerified(
  senseId: string,
  events: ReviewEventRecord[],
  cards: CardRecord[],
  timezone: string,
): boolean {
  const production = qualifiedDelayedAttempts(events, cards, timezone).filter(
    (item) => item.event.senseId === senseId && item.event.task === "production",
  );
  const successes = production.filter((item) => item.success);
  if (successes.length < 2) return false;
  const days = new Set(successes.map((item) => item.event.studyDay));
  if (days.size < 2) return false;
  const hasLongGap = successes.some((item) => {
    const prev = item.event.prior.last_review ? new Date(item.event.prior.last_review).getTime() : 0;
    return new Date(item.event.ratedAt).getTime() - prev >= 7 * DAY_MS;
  });
  if (!hasLongGap) return false;
  const last = production.at(-1);
  return Boolean(last?.success);
}

export function libraryTab(
  word: UserWordRecord,
  events: ReviewEventRecord[],
  cards: CardRecord[],
  timezone: string,
): "learning" | "known" {
  if (word.membership !== "active") return "learning";
  if (isReviewVerified(word.senseId, events, cards, timezone)) return "known";
  if (word.status === "known") return "known";
  return "learning";
}

function dayWindow(endDay: string, days: number): string[] {
  const [year, month, day] = endDay.split("-").map(Number);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1, day - i));
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

export function computeProgress(
  now: Date,
  timezone: string,
  cards: CardRecord[],
  events: ReviewEventRecord[],
  words: UserWordRecord[],
  senses: SenseRecord[],
): ProgressSnapshot {
  const today = studyDayKey(now, timezone);
  const window7 = dayWindow(today, 7);
  const window90 = dayWindow(today, 90);
  const introductions = firstIntroductionBySense(cards, timezone);
  const newVocabulary7d = [...introductions.values()].filter((item) => window7.includes(item.day)).length;
  const todayEvents = liveEvents(events).filter((event) => event.studyDay === today);
  const delayed = qualifiedDelayedAttempts(events, cards, timezone).filter((item) => window7.includes(item.event.studyDay));
  const delayedAll = qualifiedDelayedAttempts(events, cards, timezone);
  const remembered = new Set(
    words
      .filter((word) => word.membership === "active" && isReviewVerified(word.senseId, events, cards, timezone))
      .map((word) => word.senseId),
  );
  const selfDeclaredKnown = words.filter(
    (word) => word.membership === "active" && word.status === "known" && word.knownEvidence === "self-declared" && !remembered.has(word.senseId),
  ).length;

  const introductionsByDay = window90.map((day) => ({
    day,
    count: [...introductions.values()].filter((item) => item.day === day).length,
  }));

  const delayedByDay = window90.map((day) => {
    const rows = delayedAll.filter((item) => item.event.studyDay === day);
    return { day, success: rows.filter((item) => item.success).length, total: rows.length };
  });

  const senseById = new Map(senses.map((sense) => [sense.id, sense]));
  const domains: DomainId[] = [
    "everyday",
    "project-management",
    "business",
    "retail",
    "entrepreneurship",
    "technology",
  ];
  const coverage = domains.map((domain) => {
    const members = words.filter((word) => {
      if (word.membership !== "active") return false;
      return senseById.get(word.senseId)?.domains.includes(domain);
    });
    let notStarted = 0;
    let learning = 0;
    let reviewVerified = 0;
    let selfDeclared = 0;
    for (const word of members) {
      const verified = remembered.has(word.senseId);
      const hasCard = cards.some((card) => card.senseId === word.senseId);
      if (verified) reviewVerified += 1;
      else if (word.status === "known") selfDeclared += 1;
      else if (!hasCard) notStarted += 1;
      else learning += 1;
    }
    return { domain, notStarted, learning, reviewVerified, selfDeclared, total: members.length };
  });

  const rec = delayed.filter((item) => item.event.task === "recognition");
  const prod = delayed.filter((item) => item.event.task === "production");
  let takeaway: string | null = null;
  if (rec.length >= 5 && prod.length >= 5) {
    const recRate = rec.filter((item) => item.success).length / rec.length;
    const prodRate = prod.filter((item) => item.success).length / prod.length;
    if (recRate - prodRate >= 0.15) {
      takeaway = "Your production recall has more misses than meaning recognition; keep practising word use.";
    } else if (prodRate - recRate >= 0.15) {
      takeaway = "Word use is holding better than meaning recognition in this sample; keep checking precise senses.";
    }
  }

  return {
    newVocabulary7d,
    reviewsCompletedToday: new Set(todayEvents.map((event) => event.cardId)).size,
    reviewAttemptsToday: todayEvents.length,
    delayedRecall: {
      success: delayed.filter((item) => item.success).length,
      total: delayed.length,
      recognition: { success: rec.filter((item) => item.success).length, total: rec.length },
      production: { success: prod.filter((item) => item.success).length, total: prod.length },
    },
    rememberedThroughReview: remembered.size,
    selfDeclaredKnown,
    introductionsByDay,
    delayedByDay,
    coverage,
    takeaway,
    ruleVersion: REVIEW_VERIFIED_RULE_VERSION,
  };
}
