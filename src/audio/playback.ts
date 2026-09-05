import { db } from "../db/database";

let current: HTMLAudioElement | null = null;

export async function playPackAudio(pronunciationId: string): Promise<"pack" | "missing"> {
  const stored = await db.audioBlobs.get(pronunciationId);
  if (!stored) return "missing";
  const url = URL.createObjectURL(stored.blob);
  if (current) {
    current.pause();
    current.src = "";
  }
  const audio = new Audio(url);
  current = audio;
  await audio.play();
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  return "pack";
}

export function speakFallback(text: string): boolean {
  if (!("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
