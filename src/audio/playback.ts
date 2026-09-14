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

function pickBritishVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const british = voices.filter((voice) => /en-GB/i.test(voice.lang));
  const preferred =
    british.find((voice) => /neural|natural|premium|enhanced|jenny|google uk/i.test(voice.name)) ??
    british[0] ??
    voices.find((voice) => /^en(-|_)GB/i.test(voice.lang)) ??
    voices.find((voice) => /^en/i.test(voice.lang));
  return preferred ?? null;
}

export function speakFallback(text: string): boolean {
  if (!("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.96;
  const voice = pickBritishVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
