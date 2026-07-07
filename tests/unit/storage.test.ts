import { beforeEach, describe, expect, it } from 'vitest';
import { makeChromeStub } from './setup';
import { getSettings, patchSettings, onSettingsChanged } from '../../src/shared/storage';
import { DEFAULT_SETTINGS } from '../../src/shared/types';

beforeEach(() => {
  globalThis.chrome = makeChromeStub() as unknown as typeof chrome;
});

describe('settings storage', () => {
  it('returns defaults when storage is empty', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a patch over defaults and persists it', async () => {
    await patchSettings({ cloudEnabled: true, apiKey: 'sk-test' });
    const s = await getSettings();
    expect(s.cloudEnabled).toBe(true);
    expect(s.apiKey).toBe('sk-test');
    expect(s.enabled).toBe(true); // default preserved
  });

  it('notifies listeners with merged settings on change', async () => {
    const seen: unknown[] = [];
    onSettingsChanged((s) => seen.push(s));
    await patchSettings({ theme: 'dark' });
    expect(seen).toHaveLength(1);
    expect((seen[0] as { theme: string }).theme).toBe('dark');
    expect((seen[0] as { model: string }).model).toBe('claude-sonnet-5');
  });
});
