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
