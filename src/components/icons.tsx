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

export function PencilIcon() {
  return (
    <Icon strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

export function ListBulletIcon() {
  return (
    <Icon strokeLinecap="round">
      <circle cx="5" cy="7" r="1.15" fill="currentColor" />
      <circle cx="5" cy="12" r="1.15" fill="currentColor" />
      <circle cx="5" cy="17" r="1.15" fill="currentColor" />
      <path d="M9 7h11M9 12h11M9 17h11" />
    </Icon>
  );
}

export function ListNumberIcon() {
  return (
    <Icon strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 7h10M10 12h10M10 17h10" />
      <path d="M5.2 6.2V10M4 10h2.4M4.4 14.2c.4-.6 1.2-.8 1.8-.4.5.3.6.9.3 1.3L4 18.2h2.6" />
    </Icon>
  );
}

export function IndentIncreaseIcon() {
  return (
    <Icon strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M13 12h8M3 18h18" />
      <path d="M3 9v6l4.5-3Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IndentDecreaseIcon() {
  return (
    <Icon strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M13 12h8M3 18h18" />
      <path d="M8 9v6L3.5 12Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function AiSparkles() {
  return (
    <svg className="ai-fab-sparkles" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path fill="#ffe27a" d="M54.2 6.4 56.4 12.6 62.6 14.8 56.4 17 54.2 23.2 52 17 45.8 14.8 52 12.6Z" />
      <path fill="#7af0ff" d="M8.2 42.2 9.7 46.2 13.7 47.7 9.7 49.2 8.2 53.2 6.7 49.2 2.7 47.7 6.7 46.2Z" />
      <path fill="#ff8ad8" d="M57.4 40.6 58.6 43.6 61.6 44.8 58.6 46 57.4 49 56.2 46 53.2 44.8 56.2 43.6Z" />
      <path fill="#b9a6ff" d="M14.8 8.4 15.7 10.8 18.1 11.7 15.7 12.6 14.8 15 13.9 12.6 11.5 11.7 13.9 10.8Z" />
    </svg>
  );
}
