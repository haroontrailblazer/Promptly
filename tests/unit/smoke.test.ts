import { describe, expect, it } from 'vitest';
import { ALLOWED_MATCHES } from '../../src/adapters/hosts';

describe('scaffold', () => {
  it('has an https-only allowlist', () => {
    expect(ALLOWED_MATCHES.length).toBeGreaterThan(20);
    expect(ALLOWED_MATCHES.every((m) => m.startsWith('https://'))).toBe(true);
  });
});
