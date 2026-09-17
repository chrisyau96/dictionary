import type { SVGProps } from "react";

function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false" {...props} />
  );
}

export function TodayIcon() {
  return (
    <Icon>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M8 2v6m8-6v6M4 11h16m-11 4h6" />
    </Icon>
  );
}

export function DictionaryIcon() {
  return (
    <Icon>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </Icon>
  );
}

export function WordsIcon() {
  return (
    <Icon>
      <path d="M6 3h12v19l-6-4-6 4z" />
    </Icon>
  );
}

export function ProgressIcon() {
  return (
    <Icon>
      <path d="M4 20V4m0 16h17M8 16v-4m5 4V8m5 8V5" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}

export function BackIcon() {
  return (
    <Icon>
      <path d="M15 5 8 12l7 7" />
    </Icon>
  );
}
