import { describe, expect, it } from "vitest";
import { packBannerDismissed, summarizePackOffers, type PackOffer } from "./packs";

function offer(extra: Partial<PackOffer> = {}): PackOffer {
  return {
    packId: "chris-1000",
    name: "Chris Workplace 1000",
    installedVersion: "1.3.0",
    availableVersion: "1.4.0",
    status: "stale",
    ...extra,
  };
}

describe("offline pack updates", () => {
  it("accumulates several pack adds into one pending list", () => {
    const summary = summarizePackOffers([
      offer(),
      offer({ packId: "extra-200", name: "Extra", installedVersion: null, status: "missing", availableVersion: "1.0.0" }),
    ]);
    expect(summary.allCurrent).toBe(false);
    expect(summary.pending).toHaveLength(2);
  });

  it("keeps common-5000 in the same pending list as the workplace pack", () => {
    const summary = summarizePackOffers([
      offer({ installedVersion: "1.4.0", availableVersion: "1.4.0", status: "current" }),
      offer({ packId: "common-5000", name: "Common English 5000", installedVersion: null, status: "missing", availableVersion: "1.0.0" }),
    ]);
    expect(summary.allCurrent).toBe(false);
    expect(summary.pending).toEqual([
      expect.objectContaining({ packId: "common-5000", status: "missing" }),
    ]);
  });

  it("treats matching installed versions as newest", () => {
    const summary = summarizePackOffers([
      offer({ installedVersion: "1.4.0", availableVersion: "1.4.0", status: "current" }),
    ]);
    expect(summary.allCurrent).toBe(true);
    expect(summary.pending).toHaveLength(0);
  });

  it("only hides the banner after every pending version is dismissed", () => {
    const pending = [
      offer(),
      offer({ packId: "extra-200", availableVersion: "1.0.0", status: "missing", installedVersion: null }),
    ];
    localStorage.setItem("vocab-pack-update-dismissed", JSON.stringify({ "chris-1000": "1.4.0" }));
    expect(packBannerDismissed(pending)).toBe(false);
    localStorage.setItem(
      "vocab-pack-update-dismissed",
      JSON.stringify({ "chris-1000": "1.4.0", "extra-200": "1.0.0" }),
    );
    expect(packBannerDismissed(pending)).toBe(true);
  });
});
