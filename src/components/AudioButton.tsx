import { useState, type SVGProps } from "react";
import { playPackAudio, SLOW_RATE, speakFallback } from "../audio/playback";

function SpeakerGlyph({ slow, ...props }: SVGProps<SVGSVGElement> & { slow?: boolean }) {
  if (slow) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" {...props}>
        <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14.3" cy="12.2" r="5.05" />
          <path d="M14.3 12.2c0-1.65-1.15-2.65-2.5-2.65" />
          <path d="M5.5 17.45h7.5c1.15 0 1.75-.6 1.75-1.4 0-1.45-1.75-2.35-3.55-2.05" />
          <path d="M8.75 13.55 6.55 8.85" />
          <path d="M10.15 13.3 9.45 8.35" />
        </g>
        <circle cx="6.4" cy="8.5" r=".75" fill="currentColor" />
        <circle cx="9.25" cy="8" r=".7" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" d="M3.4 9.4v5.2h3.1L11.6 19V5L6.5 9.4H3.4z" />
      <path
        fill="currentColor"
        d="M14.7 10.4a2.6 2.6 0 0 1 0 3.2l-1.2-.7a1.3 1.3 0 0 0 0-1.8l1.2-.7zm2.5-2.1a5.4 5.4 0 0 1 0 8.4l-1.15-.85a4 4 0 0 0 0-6.7l1.15-.85z"
      />
    </svg>
  );
}

export function AudioButton({
  pronunciationId,
  fallbackText,
  allowed,
  label,
  slow = false,
}: {
  pronunciationId: string;
  fallbackText: string;
  allowed: boolean;
  label?: string;
  slow?: boolean;
}) {
  const [note, setNote] = useState("");
  if (!allowed) return null;
  const rate = slow ? SLOW_RATE : 1;
  const name = label ?? (slow ? `Play slower pronunciation of ${fallbackText}` : `Play pronunciation of ${fallbackText}`);

  return (
    <button
      type="button"
      className={`speaker-btn${slow ? " is-slow" : ""}`}
      aria-label={name}
      title={name}
      onClick={async (event) => {
        event.stopPropagation();
        const result = await playPackAudio(pronunciationId, rate);
        if (result === "missing") {
          const ok = speakFallback(fallbackText, slow ? 0.62 : 0.96);
          setNote(ok ? "Pack audio missing; device voice used." : "No audio available.");
        } else {
          setNote("");
        }
      }}
    >
      <SpeakerGlyph slow={slow} />
      {note ? <span className="sr-only">{note}</span> : null}
    </button>
  );
}

export function PronunciationButtons({
  pronunciationId,
  fallbackText,
  allowed,
}: {
  pronunciationId: string;
  fallbackText: string;
  allowed: boolean;
}) {
  if (!allowed) return null;
  return (
    <span className="audio-wrap" onClick={(event) => event.stopPropagation()}>
      <AudioButton pronunciationId={pronunciationId} fallbackText={fallbackText} allowed />
      <AudioButton pronunciationId={pronunciationId} fallbackText={fallbackText} allowed slow />
    </span>
  );
}
