import { createEmptyCard, fsrs, FSRSVersion, generatorParameters, type Card, type Grade } from "ts-fsrs";
import type { CardRecord, CardTask, SchedulerSnapshot } from "../types";

export const SCHEDULER_VERSION = FSRSVersion;

export function makeScheduler(desiredRetention = 0.9) {
  return fsrs(generatorParameters({ request_retention: desiredRetention }));
}

export function snapshotFromCard(card: Card): SchedulerSnapshot {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

export function cardFromSnapshot(snapshot: SchedulerSnapshot): Card {
  return {
    due: new Date(snapshot.due),
    stability: snapshot.stability,
    difficulty: snapshot.difficulty,
    elapsed_days: snapshot.elapsed_days,
    scheduled_days: snapshot.scheduled_days,
    learning_steps: snapshot.learning_steps,
    reps: snapshot.reps,
    lapses: snapshot.lapses,
    state: snapshot.state,
    last_review: snapshot.last_review ? new Date(snapshot.last_review) : undefined,
  };
}

export function newCardRecord(
  senseId: string,
  entryId: string,
  task: CardTask,
  desiredRetention = 0.9,
  now = new Date(),
): CardRecord {
  return {
    id: `card:${task}:${senseId}`,
    senseId,
    entryId,
    task,
    introducedAt: now.toISOString(),
    scheduler: snapshotFromCard(createEmptyCard(now)),
    schedulerVersion: SCHEDULER_VERSION,
    desiredRetention,
    paused: false,
  };
}

export function applyRating(
  record: CardRecord,
  rating: 1 | 2 | 3 | 4,
  now = new Date(),
): { next: CardRecord; prior: SchedulerSnapshot } {
  const scheduler = makeScheduler(record.desiredRetention);
  const prior = record.scheduler;
  const result = scheduler.next(cardFromSnapshot(prior), now, rating as Grade);
  return {
    prior,
    next: {
      ...record,
      scheduler: snapshotFromCard(result.card),
    },
  };
}

export function isDue(record: CardRecord, now = new Date()): boolean {
  return !record.paused && new Date(record.scheduler.due).getTime() <= now.getTime();
}

export function formatInterval(from: Date, dueIso: string): string {
  const ms = new Date(dueIso).getTime() - from.getTime();
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

export function previewRatingIntervals(record: CardRecord, now = new Date()): Record<1 | 2 | 3 | 4, string> {
  return {
    1: formatInterval(now, applyRating(record, 1, now).next.scheduler.due),
    2: formatInterval(now, applyRating(record, 2, now).next.scheduler.due),
    3: formatInterval(now, applyRating(record, 3, now).next.scheduler.due),
    4: formatInterval(now, applyRating(record, 4, now).next.scheduler.due),
  };
}
