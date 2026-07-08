import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  openaiImprove,
  ollamaImprove,
  improveWithBestProvider,
} from '../../src/background/providers';
import { NO_PROVIDER } from '../../src/shared/messages';
import { DEFAULT_SETTINGS } from '../../src/shared/types';

afterEach(() => vi.unstubAllGlobals());

describe('openaiImprove', () => {
  it('POSTs to chat completions with a bearer token and returns the rewrite', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'better prompt' } }] }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await openaiImprove('make website', { ...DEFAULT_SETTINGS, openaiKey: 'sk-x' });
    expect(out).toBe('better prompt');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-x');
    expect(JSON.parse(init.body as string).model).toBe('gpt-4o-mini');
  });

  it('throws without a key', async () => {
    await expect(openaiImprove('x', DEFAULT_SETTINGS)).rejects.toThrow(/key/i);
  });
});

describe('ollamaImprove', () => {
  it('detects the first installed model, then chats with it', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/api/tags')
        ? new Response(JSON.stringify({ models: [{ name: 'llama3.2' }] }), { status: 200 })
        : new Response(JSON.stringify({ message: { content: 'ollama prompt' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await ollamaImprove('make website', { ...DEFAULT_SETTINGS, ollamaEnabled: true });
    expect(out).toBe('ollama prompt');
    const chatCall = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(chatCall[0]).toBe('http://localhost:11434/api/chat');
    expect(JSON.parse(chatCall[1].body as string).model).toBe('llama3.2');
  });

  it('reports a helpful error when Ollama has no models', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ models: [] }), { status: 200 })),
    );
    await expect(ollamaImprove('x', { ...DEFAULT_SETTINGS, ollamaEnabled: true })).rejects.toThrow(
      /no models/i,
    );
  });
});

describe('improveWithBestProvider', () => {
  it('throws NO_PROVIDER when nothing is configured', async () => {
    await expect(improveWithBestProvider('x', DEFAULT_SETTINGS)).rejects.toThrow(NO_PROVIDER);
  });

  it('prefers Anthropic over OpenAI when both keys exist', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'anthropic wins' }] }), {
          status: 200,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await improveWithBestProvider('x', {
      ...DEFAULT_SETTINGS,
      cloudEnabled: true,
      apiKey: 'a',
      openaiKey: 'b',
    });
    expect(out).toBe('anthropic wins');
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.anthropic.com/v1/messages',
    );
  });

  it('uses Ollama when only the local toggle is on', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('/api/tags')
        ? new Response(JSON.stringify({ models: [{ name: 'phi3' }] }), { status: 200 })
        : new Response(JSON.stringify({ message: { content: 'local rewrite' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const out = await improveWithBestProvider('x', { ...DEFAULT_SETTINGS, ollamaEnabled: true });
    expect(out).toBe('local rewrite');
  });
});
