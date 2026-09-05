import { useState } from "react";
import { playPackAudio, speakFallback } from "../audio/playback";

export function AudioButton({
  pronunciationId,
  fallbackText,
  allowed,
  label,
}: {
  pronunciationId: string;
  fallbackText: string;
  allowed: boolean;
  label?: string;
}) {
  const [note, setNote] = useState("");
  if (!allowed) return null;
  const name = label ?? `Play pronunciation of ${fallbackText}`;

  return (
    <span className="audio-wrap">
      <button
        type="button"
        className="speaker-btn"
        aria-label={name}
        title={name}
        onClick={async () => {
          const result = await playPackAudio(pronunciationId);
          if (result === "missing") {
            const ok = speakFallback(fallbackText);
            setNote(ok ? "Pack audio missing; device voice used." : "No audio available.");
          } else {
            setNote("");
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M3.5 9.5v5h3.2L12 19.2V4.8L6.7 9.5H3.5zm12.2 1.1a3.2 3.2 0 0 1 0 2.8l-1.3-.7a1.7 1.7 0 0 0 0-1.4l1.3-.7zm2.6-2.3a6.2 6.2 0 0 1 0 7.4l-1.25-.8a4.7 4.7 0 0 0 0-5.8l1.25-.8z"
          />
        </svg>
      </button>
      {note ? <span className="tiny">{note}</span> : null}
    </span>
  );
}
