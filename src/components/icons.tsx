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
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8l1.6-1.6" />
    </Icon>
  );
}
