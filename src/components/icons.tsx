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

export function AiMark() {
  return (
    <svg className="ai-fab-art" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M46.5 7.2 48.2 12.1 53.1 13.8 48.2 15.5 46.5 20.4 44.8 15.5 39.9 13.8 44.8 12.1Z"
      />
      <path fill="currentColor" d="M8.8 36.6 10.1 39.8 13.3 41.1 10.1 42.4 8.8 45.6 7.5 42.4 4.3 41.1 7.5 39.8Z" />
      <path fill="currentColor" d="M47.2 34.4 48.1 36.6 50.3 37.5 48.1 38.4 47.2 40.6 46.3 38.4 44.1 37.5 46.3 36.6Z" />
      <circle cx="27.5" cy="30" r="16.4" stroke="currentColor" strokeWidth="1.55" opacity="0.38" />
      <circle cx="21.5" cy="22.4" r="2.1" fill="currentColor" opacity="0.55" />
      <path
        fill="currentColor"
        d="M18.4 38.2 23.8 21.8h4.4l5.4 16.4h-3.5l-1-3.2H22.9l-1 3.2zm5.1-5.9h4.1l-2-6.4h-.1zM36.8 21.8h3.3v16.4h-3.3z"
      />
    </svg>
  );
}
