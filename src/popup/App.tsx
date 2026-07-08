import { useEffect, useState } from 'react';
import type { Settings } from '../shared/types';
import { getSettings, patchSettings } from '../shared/storage';

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        try {
          setHost(new URL(tab.url).hostname);
        } catch {
          setHost(null);
        }
      }
    });
  }, []);

  if (!settings) return null;

  const patch = async (p: Partial<Settings>) => setSettings(await patchSettings(p));

  const toggleSite = async () => {
    if (!host) return;
    const disabled = settings.disabledSites.includes(host);
    await patch({
      disabledSites: disabled
        ? settings.disabledSites.filter((h) => h !== host)
        : [...settings.disabledSites, host],
    });
  };

  const toggleCloud = async (on: boolean) => {
    if (on) {
      const granted = await chrome.permissions.request({
        origins: ['https://api.anthropic.com/*', 'https://api.openai.com/*'],
      });
      if (!granted) return;
    }
    await patch({ cloudEnabled: on });
  };

  const toggleOllama = async (on: boolean) => {
    if (on) {
      const granted = await chrome.permissions.request({ origins: ['http://localhost/*'] });
      if (!granted) return;
      try {
        const res = await fetch('http://localhost:11434/api/tags', {
          signal: AbortSignal.timeout(1500),
        });
        const data = (await res.json()) as { models?: { name: string }[] };
        const names = (data.models ?? []).map((m) => m.name);
        setOllamaStatus(
          names.length
            ? `Detected — will use ${names[0]} (${names.length} model${names.length > 1 ? 's' : ''} installed)`
            : 'Ollama is running but has no models. Run: ollama pull llama3.2',
        );
      } catch {
        setOllamaStatus('Ollama not detected on localhost:11434 — is it running?');
      }
    } else {
      setOllamaStatus(null);
    }
    await patch({ ollamaEnabled: on });
  };

  const inputCls = 'w-full rounded border border-gray-300 px-2 py-1 dark:bg-gray-800';

  return (
    <div className="mx-auto w-80 p-4 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <h1 className="mb-3 text-base font-extrabold">Promptly</h1>

      <label className="mb-2 flex items-center justify-between">
        <span>Enabled</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => void patch({ enabled: e.target.checked })}
        />
      </label>

      {host && (
        <label className="mb-2 flex items-center justify-between">
          <span className="truncate pr-2">Active on {host}</span>
          <input
            type="checkbox"
            checked={!settings.disabledSites.includes(host)}
            onChange={() => void toggleSite()}
          />
        </label>
      )}

      <label className="mb-2 flex items-center justify-between">
        <span>Theme</span>
        <select
          className="rounded border border-gray-300 px-1 py-0.5 dark:bg-gray-800"
          value={settings.theme}
          onChange={(e) => void patch({ theme: e.target.value as Settings['theme'] })}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <hr className="my-3 border-gray-200 dark:border-gray-700" />
      <div className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
        AI rewriting
      </div>

      <label className="mb-2 flex items-center justify-between">
        <span>Remote AI (Anthropic / OpenAI)</span>
        <input
          type="checkbox"
          checked={settings.cloudEnabled}
          onChange={(e) => void toggleCloud(e.target.checked)}
        />
      </label>

      {settings.cloudEnabled && (
        <>
          <label className="mb-2 block">
            <span className="mb-1 block text-xs text-gray-500">
              Anthropic API key (stored locally)
            </span>
            <input
              type="password"
              className={inputCls}
              value={settings.apiKey ?? ''}
              placeholder="sk-ant-…"
              onChange={(e) => void patch({ apiKey: e.target.value || undefined })}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-xs text-gray-500">
              OpenAI API key (stored locally)
            </span>
            <input
              type="password"
              className={inputCls}
              value={settings.openaiKey ?? ''}
              placeholder="sk-…"
              onChange={(e) => void patch({ openaiKey: e.target.value || undefined })}
            />
          </label>
        </>
      )}

      <label className="mb-1 flex items-center justify-between">
        <span>Local Ollama (no key needed)</span>
        <input
          type="checkbox"
          checked={settings.ollamaEnabled}
          onChange={(e) => void toggleOllama(e.target.checked)}
        />
      </label>
      {ollamaStatus && <p className="mb-2 text-xs text-gray-500">{ollamaStatus}</p>}

      <p className="mt-2 text-xs text-gray-500">
        Priority: Anthropic → OpenAI → Ollama → built-in rewriter.
      </p>

      <p className="mt-3 text-xs text-gray-500">
        Shortcut: <kbd>Ctrl+Shift+P</kbd> toggles the card. Prompts never leave your machine unless
        remote AI is on and you click Improve — Ollama and the built-in rewriter are fully local.
      </p>
    </div>
  );
}
