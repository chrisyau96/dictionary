export interface PackCatalogItem {
  packId: string;
  folder: string;
}

export const PACK_CATALOG: PackCatalogItem[] = [{ packId: "chris-1000", folder: "chris-1000" }];
export const REQUIRED_PACK_ID = "chris-1000";
const DISMISS_KEY = "vocab-pack-update-dismissed";

export interface PackOffer {
  packId: string;
  name: string;
  installedVersion: string | null;
  availableVersion: string;
  status: "missing" | "stale" | "current";
}

export interface PackUpdateSummary {
  offers: PackOffer[];
  pending: PackOffer[];
  allCurrent: boolean;
}

export function summarizePackOffers(offers: PackOffer[]): PackUpdateSummary {
  const pending = offers.filter((item) => item.status !== "current");
  return {
    offers,
    pending,
    allCurrent: offers.length > 0 && pending.length === 0,
  };
}

export function readDismissedPacks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function dismissPackUpdates(pending: PackOffer[]): void {
  const next = readDismissedPacks();
  for (const item of pending) next[item.packId] = item.availableVersion;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
}

export function packBannerDismissed(pending: PackOffer[]): boolean {
  if (!pending.length) return true;
  const dismissed = readDismissedPacks();
  return pending.every((item) => dismissed[item.packId] === item.availableVersion);
}
