import { db, defaultProfile, ensureProfile, normalizeProfile, normalizeReviewEvent, normalizeUserWord } from "../db/database";
import type { BackupFile } from "../types";
import { BACKUP_VERSION } from "../types";

const APP_VERSION = "0.2.0";

export async function exportBackup(): Promise<BackupFile> {
  const [userWords, cards, reviewEvents, profile, localRequests, packs, dailyPlans, assessmentSessions] = await Promise.all([
    db.userWords.toArray(),
    db.cards.toArray(),
    db.reviewEvents.toArray(),
    ensureProfile(),
    db.localRequests.toArray(),
    db.packs.toArray(),
    db.dailyPlans.toArray(),
    db.assessmentSessions.toArray(),
  ]);

  return {
    kind: "vocab-coach-backup",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    contentRefs: packs
      .filter((pack) => pack.status === "installed")
      .map((pack) => ({ packId: pack.packId, version: pack.version })),
    userWords,
    cards,
    reviewEvents,
    profile,
    localRequests,
    dailyPlans,
    assessmentSessions,
  };
}

export function previewBackup(data: unknown): { ok: true; backup: BackupFile } | { ok: false; error: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "This file is not a backup." };
  const file = data as BackupFile;
  if (file.kind !== "vocab-coach-backup" || (file.version !== 1 && file.version !== 2)) {
    return { ok: false, error: "This backup format is not supported." };
  }
  if (!Array.isArray(file.userWords) || !Array.isArray(file.cards) || !Array.isArray(file.reviewEvents)) {
    return { ok: false, error: "The backup is missing learning records." };
  }
  return { ok: true, backup: file };
}

export async function restoreBackup(file: BackupFile): Promise<void> {
  const profile = normalizeProfile({ ...defaultProfile(), ...file.profile, id: "profile" as const });
  const userWords = file.userWords.map((word) => normalizeUserWord(word));
  const reviewEvents = file.reviewEvents.map((event) => normalizeReviewEvent(event, profile.timezone));
  await db.transaction(
    "rw",
    [db.userWords, db.cards, db.reviewEvents, db.profile, db.localRequests, db.dailyPlans, db.assessmentSessions],
    async () => {
      await db.userWords.clear();
      await db.cards.clear();
      await db.reviewEvents.clear();
      await db.localRequests.clear();
      await db.dailyPlans.clear();
      await db.assessmentSessions.clear();
      await db.userWords.bulkPut(userWords);
      await db.cards.bulkPut(file.cards);
      await db.reviewEvents.bulkPut(reviewEvents);
      await db.localRequests.bulkPut(file.localRequests ?? []);
      await db.dailyPlans.bulkPut(file.dailyPlans ?? []);
      await db.assessmentSessions.bulkPut(file.assessmentSessions ?? []);
      await db.profile.put(profile);
    },
  );
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
