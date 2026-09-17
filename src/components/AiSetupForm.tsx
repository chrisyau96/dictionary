import { useEffect, useState } from "react";
import { loadProviderModels, type CatalogModel } from "../ai/catalog";
import { clearApiKey, loadAiConfig, loadApiKey, maskedKey, saveAiConfig, saveApiKey } from "../ai/storage";
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
  const [mask, setMask] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [hasKey, setHasKey] = useState(false);

  async function hydrate(nextProvider: AiProviderId, keepModel?: string) {
    const list = await loadProviderModels(nextProvider);
    setModels(list);
    setModel(keepModel && list.some((item) => item.id === keepModel) ? keepModel : list[0]?.id ?? FALLBACK_MODELS[nextProvider][0].id);
    const key = await loadApiKey(nextProvider);
    setHasKey(Boolean(key));
    setMask(key ? await maskedKey(nextProvider) : "");
    setApiKey("");
    setSaved(key ? "A key is saved on this device." : "");
  }

  useEffect(() => {
    void (async () => {
      const config = await loadAiConfig();
      const nextProvider = config?.provider ?? "google";
      setProvider(nextProvider);
      await hydrate(nextProvider, config?.model);
    })();
  }, []);

  async function changeProvider(next: AiProviderId) {
    setProvider(next);
    setNote("");
    const config = await loadAiConfig();
    await hydrate(next, config?.provider === next ? config.model : undefined);
  }

  async function save() {
    const key = hasKey ? await loadApiKey(provider) : apiKey.trim();
    if (!key) {
      setNote("Paste an API key to use this provider.");
      return;
    }
    setBusy(true);
    if (!hasKey && apiKey.trim()) await saveApiKey(provider, apiKey.trim());
    const recent = (await loadAiConfig())?.recentPrompts ?? [];
    await saveAiConfig({ provider, model, recentPrompts: recent });
    setSaved("Saved on this device only.");
    setHasKey(true);
    setMask(await maskedKey(provider));
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
      <label className={hasKey ? "is-dimmed" : undefined}>
        API key
        <input
          type={hasKey ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          readOnly={hasKey}
          disabled={hasKey}
          tabIndex={hasKey ? -1 : undefined}
          placeholder={AI_PROVIDERS.find((item) => item.id === provider)?.keyHint}
          value={hasKey ? mask : apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      {hasKey ? (
        <p className="tiny helper-copy">A key is already saved for this provider. Remove it first if you need to paste a new one.</p>
      ) : null}
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
            setMask("");
            setSaved("");
            setApiKey("");
            setNote("API key removed from this device. You can paste a new one.");
          }}
        >
          Remove saved API key
        </button>
      ) : null}
      {note ? <p className="tiny">{note}</p> : null}
    </div>
  );
}
