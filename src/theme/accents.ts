export type AccentId = "purple" | "indigo" | "blue" | "teal" | "green" | "orange" | "rose";

export interface AccentOption {
  id: AccentId;
  name: string;
  swatch: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "purple", name: "Purple", swatch: "#7c3aed" },
  { id: "indigo", name: "Indigo", swatch: "#4f46e5" },
  { id: "blue", name: "Blue", swatch: "#2563eb" },
  { id: "teal", name: "Teal", swatch: "#0f766e" },
  { id: "green", name: "Green", swatch: "#16a34a" },
  { id: "orange", name: "Orange", swatch: "#ea580c" },
  { id: "rose", name: "Rose", swatch: "#e11d48" },
];

export const DEFAULT_ACCENT: AccentId = "purple";

export function isAccentId(value: unknown): value is AccentId {
  return ACCENT_OPTIONS.some((item) => item.id === value);
}

export function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent;
  const option = ACCENT_OPTIONS.find((item) => item.id === accent) ?? ACCENT_OPTIONS[0];
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute("content", option.swatch);
}
