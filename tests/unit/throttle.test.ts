import { describe, expect, it, vi } from 'vitest';
import { throttle } from '../../src/shared/throttle';

describe('throttle', () => {
  it('runs immediately, then at most once per window, with a trailing call', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t();
    t();
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2); // trailing call fired
    vi.useRealTimers();
  });
});
