import { DictionaryIcon, ProgressIcon, TodayIcon, WordsIcon } from "./icons";
import { go } from "../router";

export function TabBar({ current }: { current: "today" | "dictionary" | "words" | "progress" }) {
  return (
    <nav className="tabs" aria-label="Main">
      <button type="button" className={current === "today" ? "active" : ""} onClick={() => go({ name: "today" })}>
        <TodayIcon />
        Today
      </button>
      <button type="button" className={current === "dictionary" ? "active" : ""} onClick={() => go({ name: "dictionary", q: "" })}>
        <DictionaryIcon />
        Dictionary
      </button>
      <button type="button" className={current === "words" ? "active" : ""} onClick={() => go({ name: "words" })}>
        <WordsIcon />
        My Words
      </button>
      <button type="button" className={current === "progress" ? "active" : ""} onClick={() => go({ name: "progress" })}>
        <ProgressIcon />
        Progress
      </button>
    </nav>
  );
}
