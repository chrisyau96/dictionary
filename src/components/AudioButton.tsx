import { useState } from "react";
import { playPackAudio, speakFallback } from "../audio/playback";

export function AudioButton({
  pronunciationId,
  fallbackText,
  allowed,
}: {
  pronunciationId: string;
  fallbackText: string;
  allowed: boolean;
}) {
  const [note, setNote] = useState("");
  if (!allowed) return null;

  return (
    <span className="audio-wrap">
      <button
        type="button"
        className="audio-btn"
        aria-label="Play pronunciation"
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
        Listen
      </button>
      {note ? <span className="tiny"> {note}</span> : null}
    </span>
  );
}
