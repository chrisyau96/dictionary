import { completeChat } from "../ai/client";
import { noteIsEmpty, toSafeHtml } from "../ai/html";
import { hasAiReady, loadAiConfig, loadApiKey, saveAiConfig } from "../ai/storage";
import { DEFAULT_AI_PROMPTS, formatAiNote, rememberCommand, suggestedCommands } from "../ai/types";
import { go } from "../router";
import { appendWordNote } from "../study/session";
import { AiSetupForm } from "./AiSetupForm";
import { RefreshIcon, SettingsIcon } from "./icons";
import { RichTextEditor } from "./RichText";
import { useEffect, useMemo, useRef, useState } from "react";

const AI_FAIL = "An error occurred. Please try again.";
const NO_FINDINGS = "<p>No findings.</p>";

export function AiDialog({
  word,
  senseId,
  entryId,
  onClose,
  onNoted,
}: {
  word: string;
  senseId: string;
  entryId: string;
  onClose: () => void;
  onNoted?: () => void;
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [ask, setAsk] = useState("");
  const [command, setCommand] = useState("Ask");
  const [answerHtml, setAnswerHtml] = useState("");
  const [answerTick, setAnswerTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      setReady(await hasAiReady());
      const config = await loadAiConfig();
      setRecent(config?.recentPrompts ?? []);
    })();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chips = useMemo(() => suggestedCommands(recent), [recent]);

  function openSettings() {
    onClose();
    go({ name: "settings", focus: "ai" });
  }

  function scrollToAnswer() {
    window.requestAnimationFrame(() => {
      answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function send(nextAsk: string, nextCommand: string) {
    if (!ready) return;
    const question = nextAsk.trim();
    if (!question) return;
    const config = await loadAiConfig();
    if (!config) {
      setReady(false);
      return;
    }
    const apiKey = await loadApiKey(config.provider);
    setBusy(true);
    setError("");
    setSavedNote(false);
    setCommand(nextCommand);
    setAsk(question);
    scrollToAnswer();
    try {
      const text = await completeChat({
        provider: config.provider,
        model: config.model,
        apiKey,
        word,
        ask: question,
      });
      const html = toSafeHtml(text);
      setAnswerHtml(noteIsEmpty(html) ? NO_FINDINGS : html);
      setAnswerTick((tick) => tick + 1);
      const nextRecent = rememberCommand(config.recentPrompts, nextCommand);
      await saveAiConfig({ ...config, recentPrompts: nextRecent });
      setRecent(nextRecent);
      scrollToAnswer();
    } catch {
      setError(AI_FAIL);
      setAnswerHtml("");
    } finally {
      setBusy(false);
    }
  }

  function pickChip(label: string) {
    const preset = DEFAULT_AI_PROMPTS.find((item) => item.label === label);
    void send(preset?.ask ?? label, preset?.label ?? label);
  }

  const showAnswer = busy || Boolean(answerHtml) || Boolean(error);
  const canRefresh = !busy && Boolean(ask.trim()) && (Boolean(answerHtml) || Boolean(error));

  return (
    <div className="ai-overlay" role="dialog" aria-modal="true" aria-label={`AI for ${word}`} onClick={onClose}>
      <div className="ai-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="row">
          <div>
            <p className="example-index">AI</p>
            <h2 className="ai-word">{word}</h2>
          </div>
          <div className="ai-sheet-actions">
            {ready ? (
              <button
                type="button"
                className="icon-btn ai-header-gear"
                aria-label="Open API settings"
                onClick={openSettings}
              >
                <SettingsIcon />
              </button>
            ) : null}
            <button type="button" className="text-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        {ready === null ? <p className="muted">Opening AI…</p> : null}
        {ready === false ? (
          <div className="ai-inline-setup">
            <p className="example-index">Connect AI</p>
            <p className="tiny helper-copy">Only this helper needs a key. Learning records stay on this device.</p>
            <AiSetupForm compact onReady={() => setReady(true)} />
          </div>
        ) : null}
        {ready ? (
          <>
        <div className="ai-chips">
          {chips.map((label) => (
            <button
              key={label}
              type="button"
              className="chip"
              disabled={busy}
              title={label}
              onClick={() => pickChip(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Ask
          <textarea
            rows={3}
            value={ask}
            placeholder={`Ask anything about “${word}”`}
            onChange={(event) => setAsk(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send(ask, ask.trim() || "Ask");
              }
            }}
          />
        </label>
        <button
          type="button"
          className="primary block"
          disabled={busy}
          onClick={() => void send(ask, ask.trim() || "Ask")}
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
        {showAnswer ? (
          <div className="ai-answer" ref={answerRef}>
            <div className="ai-answer-head">
              <p className="ai-edit-hint">
                {busy ? "Working on an answer" : error ? error : ""}
              </p>
              {canRefresh ? (
                <button
                  type="button"
                  className="icon-btn ai-refresh"
                  aria-label="Refresh answer"
                  onClick={() => void send(ask, command)}
                >
                  <RefreshIcon />
                </button>
              ) : null}
            </div>
            {busy ? (
              <div className="ai-loading" aria-busy="true" aria-live="polite">
                <span className="ai-skel" />
                <span className="ai-skel" />
                <span className="ai-skel is-short" />
                <p className="tiny">Thinking…</p>
              </div>
            ) : error ? null : (
              <RichTextEditor resetKey={`ans-${answerTick}`} value={answerHtml} onChange={setAnswerHtml} />
            )}
            {!busy && !error && answerHtml ? (
              <div className="ai-answer-actions">
                <button
                  type="button"
                  className={`primary block${savedNote ? " is-noted" : ""}`}
                  onClick={async () => {
                    await appendWordNote(senseId, entryId, formatAiNote(command, answerHtml));
                    setSavedNote(true);
                    onNoted?.();
                    window.setTimeout(() => setSavedNote(false), 1600);
                  }}
                >
                  {savedNote ? "Added ✓" : "Add to note"}
                </button>
              </div>
            ) : null}
            {savedNote ? <p className="tiny ai-note-signal">Added to your note.</p> : null}
          </div>
        ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
