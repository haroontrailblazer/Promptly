import { describe, expect, it } from 'vitest';
import { words, meaningfulWords } from '../../src/analyzer/text';

describe('text utils', () => {
  it('splits words on whitespace', () => {
    expect(words('  write a   blog post\nabout cats ')).toEqual([
      'write', 'a', 'blog', 'post', 'about', 'cats',
    ]);
  });

  it('drops stopwords and punctuation, lowercases', () => {
    expect(meaningfulWords('Please can you Make a Website!')).toEqual(['make', 'website']);
  });

  it('keeps technical tokens like next.js and c++', () => {
    expect(meaningfulWords('use next.js and c++')).toEqual(['use', 'next.js', 'c++']);
  });
});
