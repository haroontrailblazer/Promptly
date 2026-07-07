import { describe, expect, it } from 'vitest';
import { diffParts } from '../../src/overlay/diff';

describe('diffParts', () => {
  it('marks insertions and deletions', () => {
    const parts = diffParts('make website', 'Act as an engineer.\n\nmake website');
    expect(parts.some((p) => p.op === 1 && p.text.includes('Act as an engineer'))).toBe(true);
    expect(parts.some((p) => p.op === 0 && p.text.includes('make website'))).toBe(true);
  });

  it('returns a single equal part for identical strings', () => {
    expect(diffParts('same', 'same')).toEqual([{ op: 0, text: 'same' }]);
  });
});
