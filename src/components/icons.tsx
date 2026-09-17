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

export function AiSparkles() {
  return (
    <svg className="ai-fab-sparkles" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M54.2 6.4 56.4 12.6 62.6 14.8 56.4 17 54.2 23.2 52 17 45.8 14.8 52 12.6Z" />
      <path fill="currentColor" d="M8.2 42.2 9.7 46.2 13.7 47.7 9.7 49.2 8.2 53.2 6.7 49.2 2.7 47.7 6.7 46.2Z" />
      <path fill="currentColor" d="M57.4 40.6 58.6 43.6 61.6 44.8 58.6 46 57.4 49 56.2 46 53.2 44.8 56.2 43.6Z" />
      <path fill="currentColor" d="M14.8 8.4 15.7 10.8 18.1 11.7 15.7 12.6 14.8 15 13.9 12.6 11.5 11.7 13.9 10.8Z" />
    </svg>
  );
}
