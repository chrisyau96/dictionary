import { useEffect, useMemo, useState } from "react";
import { completeChat } from "../ai/client";
import { toSafeHtml } from "../ai/html";
import { hasAiReady, loadAiConfig, loadApiKey, saveAiConfig } from "../ai/storage";
import { DEFAULT_AI_PROMPTS, formatAiNote, rememberCommand, suggestedCommands } from "../ai/types";
import { appendWordNote } from "../study/session";
import { AiSetupForm } from "./AiSetupForm";
import { PencilIcon, SettingsIcon } from "./icons";
import { RichTextEditor } from "./RichText";

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
  const [setupOpen, setSetupOpen] = useState(false);

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

  async function send(nextAsk: string, nextCommand: string) {
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
    setSetupOpen(false);
    setCommand(nextCommand);
    setAsk(question);
    try {
      const text = await completeChat({
        provider: config.provider,
        model: config.model,
        apiKey,
        word,
        ask: question,
      });
      setAnswerHtml(toSafeHtml(text));
      setAnswerTick((tick) => tick + 1);
      const nextRecent = rememberCommand(config.recentPrompts, nextCommand);
      await saveAiConfig({ ...config, recentPrompts: nextRecent });
      setRecent(nextRecent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get an answer.");
    } finally {
      setBusy(false);
    }
  }

  function pickChip(label: string) {
    const preset = DEFAULT_AI_PROMPTS.find((item) => item.label === label);
    void send(preset?.ask ?? label, preset?.label ?? label);
  }

  const showAnswer = busy || Boolean(answerHtml);

  return (
    <div className="ai-overlay" role="dialog" aria-modal="true" aria-label={`AI for ${word}`} onClick={onClose}>
      <div className="ai-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="row">
          <div>
            <p className="example-index">AI</p>
            <h2 className="ai-word">{word}</h2>
          </div>
          <div className="ai-sheet-actions">
            {ready && !showAnswer ? (
              <button
                type="button"
                className="icon-btn ai-answer-gear"
                aria-label="Change AI model or API key"
                aria-expanded={setupOpen}
                onClick={() => setSetupOpen((open) => !open)}
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
          <>
            <p className="muted">First time: pick a fast model and paste your own API key. It stays on this device.</p>
            <AiSetupForm onReady={() => setReady(true)} compact />
          </>
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
            {error ? <p className="tiny danger">{error}</p> : null}
            {setupOpen && !showAnswer ? (
              <div className="ai-inline-setup">
                <AiSetupForm
                  compact
                  onReady={() => {
                    setReady(true);
                    setSetupOpen(false);
                  }}
                />
              </div>
            ) : null}
            {showAnswer ? (
              <div className="ai-answer">
                <div className="ai-answer-head">
                  <p className="ai-edit-hint">
                    {busy ? (
                      "Working on an answer"
                    ) : (
                      <>
                        <PencilIcon />
                        You can edit this
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    className="icon-btn ai-answer-gear"
                    aria-label="Change AI model or API key"
                    aria-expanded={setupOpen}
                    onClick={() => setSetupOpen((open) => !open)}
                  >
                    <SettingsIcon />
                  </button>
                </div>
                {setupOpen ? (
                  <div className="ai-inline-setup">
                    <AiSetupForm
                      compact
                      onReady={() => {
                        setReady(true);
                        setSetupOpen(false);
                      }}
                    />
                  </div>
                ) : null}
                {busy ? (
                  <div className="ai-loading" aria-busy="true" aria-live="polite">
                    <span className="ai-skel" />
                    <span className="ai-skel" />
                    <span className="ai-skel is-short" />
                    <p className="tiny">Thinking…</p>
                  </div>
                ) : (
                  <RichTextEditor resetKey={`ans-${answerTick}`} value={answerHtml} onChange={setAnswerHtml} />
                )}
                {!busy && answerHtml ? (
                  <div className="split-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={async () => {
                        await appendWordNote(senseId, entryId, formatAiNote(command, answerHtml));
                        setSavedNote(true);
                        onNoted?.();
                      }}
                    >
                      Add to note
                    </button>
                    <button type="button" className="ghost" onClick={() => void send(ask, command)}>
                      Ask again
                    </button>
                  </div>
                ) : null}
                {savedNote ? <p className="tiny">Added to your note.</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
