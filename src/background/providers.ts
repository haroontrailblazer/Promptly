import type { Settings } from '../shared/types';
import { NO_PROVIDER } from '../shared/messages';
import { cloudImprove, buildSystemPrompt } from './cloud';

export async function openaiImprove(
  prompt: string,
  settings: Settings,
  instruction?: string,
): Promise<string> {
  if (!settings.openaiKey) throw new Error('No OpenAI key configured');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${settings.openaiKey}`,
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: buildSystemPrompt(instruction) },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

const OLLAMA = 'http://localhost:11434';

export async function ollamaImprove(
  prompt: string,
  settings: Settings,
  instruction?: string,
): Promise<string> {
  let model = settings.ollamaModel;
  if (!model) {
    const tags = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!tags.ok) throw new Error('Ollama is not reachable on localhost:11434');
    const data = (await tags.json()) as { models?: { name: string }[] };
    model = data.models?.[0]?.name;
    if (!model) throw new Error('Ollama is running but has no models installed');
  }
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: buildSystemPrompt(instruction) },
        { role: 'user', content: prompt },
      ],
    }),
    // Local models can be slow to first-load; give them room.
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) throw new Error('Empty response from Ollama');
  return text;
}

/**
 * Provider priority: Anthropic key → OpenAI key → local Ollama.
 * Remote providers additionally require the cloudEnabled opt-in; Ollama only
 * its own toggle (localhost — nothing leaves the machine).
 * Throws NO_PROVIDER when nothing is configured.
 */
export async function improveWithBestProvider(
  prompt: string,
  settings: Settings,
  instruction?: string,
): Promise<string> {
  if (settings.cloudEnabled && settings.apiKey) return cloudImprove(prompt, settings, instruction);
  if (settings.cloudEnabled && settings.openaiKey) {
    return openaiImprove(prompt, settings, instruction);
  }
  if (settings.ollamaEnabled) return ollamaImprove(prompt, settings, instruction);
  throw new Error(NO_PROVIDER);
}
