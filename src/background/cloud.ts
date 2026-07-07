import type { Settings } from '../shared/types';

const SYSTEM_PROMPT =
  'You improve prompts that users are about to send to an AI model. Rewrite the ' +
  "user's prompt to be clear, complete, specific, and well structured. Preserve the " +
  "user's intent, facts, and language. Add structure (role, context, constraints, " +
  'output format, numbered steps) only where it helps. Do not answer the prompt. ' +
  'Return ONLY the rewritten prompt text, with no preamble or explanation.';

export async function cloudImprove(prompt: string, settings: Settings): Promise<string> {
  if (!settings.apiKey) throw new Error('No API key configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      // Extension service workers send an Origin header; the API requires this
      // explicit opt-in for browser-originated BYO-key requests.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 1024,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((b) => b.type === 'text')?.text?.trim();
  if (!text) throw new Error('Empty response from the API');
  return text;
}
