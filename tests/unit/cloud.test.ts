import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudImprove } from '../../src/background/cloud';
import { DEFAULT_SETTINGS } from '../../src/shared/types';

const settings = { ...DEFAULT_SETTINGS, cloudEnabled: true, apiKey: 'sk-test' };

afterEach(() => vi.unstubAllGlobals());

describe('cloudImprove', () => {
  it('POSTs to the Anthropic Messages API and returns the rewritten text', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'improved prompt' }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await cloudImprove('make website', settings);
    expect(out).toBe('improved prompt');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('claude-sonnet-5');
    expect(body.messages[0].content).toBe('make website');
  });

  it('throws a readable error on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(cloudImprove('x', settings)).rejects.toThrow(/401/);
  });

  it('throws when no API key is set', async () => {
    await expect(cloudImprove('x', { ...settings, apiKey: undefined })).rejects.toThrow(/key/i);
  });
});
