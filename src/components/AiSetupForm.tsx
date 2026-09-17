import { useEffect, useState } from "react";
import { loadProviderModels, type CatalogModel } from "../ai/catalog";
import { clearApiKey, loadAiConfig, loadApiKey, saveAiConfig, saveApiKey } from "../ai/storage";
import { AI_PROVIDERS, FALLBACK_MODELS, type AiProviderId } from "../ai/types";

export function AiSetupForm({
  onReady,
  compact = false,
}: {
  onReady?: () => void;
  compact?: boolean;
}) {
  const [provider, setProvider] = useState<AiProviderId>("google");
  const [model, setModel] = useState(FALLBACK_MODELS.google[0].id);
  const [models, setModels] = useState<CatalogModel[]>(
    FALLBACK_MODELS.google.map((item) => ({ ...item, reasoning: false })),
  );
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    void (async () => {
      const config = await loadAiConfig();
      const nextProvider = config?.provider ?? "google";
      setProvider(nextProvider);
      const list = await loadProviderModels(nextProvider);
      setModels(list);
      setModel(config?.model && list.some((item) => item.id === config.model) ? config.model : list[0]?.id ?? FALLBACK_MODELS[nextProvider][0].id);
      const key = await loadApiKey(nextProvider);
      setApiKey("");
      setHasKey(Boolean(key));
      setSaved(key ? "A key is saved on this device." : "");
    })();
  }, []);

  async function changeProvider(next: AiProviderId) {
    setProvider(next);
    const list = await loadProviderModels(next);
    setModels(list);
    const config = await loadAiConfig();
    setModel(config?.provider === next && config.model && list.some((item) => item.id === config.model) ? config.model : list[0]?.id ?? FALLBACK_MODELS[next][0].id);
    const key = await loadApiKey(next);
    setApiKey("");
    setHasKey(Boolean(key));
    setSaved(key ? "A key is saved on this device." : "");
    setNote("");
  }

  async function save() {
    const key = apiKey.trim() || (await loadApiKey(provider));
    if (!key) {
      setNote("Paste an API key to use this provider.");
      return;
    }
    setBusy(true);
    if (apiKey.trim()) await saveApiKey(provider, apiKey.trim());
    const recent = (await loadAiConfig())?.recentPrompts ?? [];
    await saveAiConfig({ provider, model, recentPrompts: recent });
    setSaved("Saved on this device only.");
    setHasKey(true);
    setApiKey("");
    setNote("");
    setBusy(false);
    onReady?.();
  }

  return (
    <div className={compact ? "stack tight" : "stack"}>
      <div className="provider-row" role="group" aria-label="AI provider">
        {AI_PROVIDERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={provider === item.id ? "chip active" : "chip"}
            onClick={() => void changeProvider(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <label>
        Default model
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          {models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {/mini|nano|flash|lite|small|ministral|nemo/i.test(`${item.id} ${item.name}`) || !item.reasoning ? " · fast" : " · slower"}
            </option>
          ))}
        </select>
      </label>
      <p className="tiny helper-copy">Short list of fast, low-reasoning models from models.dev. It refreshes when new models appear.</p>
      <label>
        API key
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={AI_PROVIDERS.find((item) => item.id === provider)?.keyHint}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      {saved ? <p className="tiny">{saved}</p> : null}
      <p className="tiny helper-copy">
        The key stays in this browser. It is sent only to the provider you pick, never to this app’s server. Gemini usually works in
        the phone browser; some other providers block in-page calls.
      </p>
      <button type="button" className="primary block" disabled={busy} onClick={() => void save()}>
        Save AI setup
      </button>
      {!compact && hasKey ? (
        <button
          type="button"
          className="ghost block"
          onClick={async () => {
            await clearApiKey(provider);
            setHasKey(false);
            setSaved("");
            setApiKey("");
            setNote("API key removed from this device.");
          }}
        >
          Remove saved API key
        </button>
      ) : null}
      {note ? <p className="tiny">{note}</p> : null}
    </div>
  );
}
