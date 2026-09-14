export const COMMONNESS_SCALE_VERSION = "v1";

export function zipfToCommonness(zipf: number): number {
  const clamped = Math.min(1, Math.max(0, (zipf - 2.0) / 4.5));
  return Math.round(100 * clamped);
}

export function commonnessLabel(score: number | null): string {
  if (score === null) return "Not measured";
  if (score >= 85) return "Very common";
  if (score >= 60) return "Common";
  if (score >= 35) return "Useful";
  return "Less common";
}

/** 0–4 wifi-style bars. More bars means the word is more common. */
export function frequencyBarCount(score: number | null): 0 | 1 | 2 | 3 | 4 {
  if (score === null) return 0;
  if (score >= 75) return 4;
  if (score >= 50) return 3;
  if (score >= 25) return 2;
  return 1;
}

export function frequencyBarLabel(score: number | null): string {
  const bars = frequencyBarCount(score);
  if (bars === 0) return "Frequency not measured";
  const common = commonnessLabel(score);
  return `${common}. ${bars} of 4 bars. More bars means more common.`;
}
