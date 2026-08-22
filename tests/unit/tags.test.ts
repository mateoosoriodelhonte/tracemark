import { describe, expect, test } from 'vitest';
import { MAX_TAGS } from '../../src/domain/constants';
import { normalizeTags } from '../../src/domain/tags';

describe('tag normalization', () => {
  test('trims, lowercases, removes a leading hash, and deduplicates', () => {
    expect(normalizeTags([' RAG ', 'rag', '#Retrieval', '', '  system-design  '])).toEqual([
      'rag',
      'retrieval',
      'system-design',
    ]);
  });

  test('keeps hostile-looking input as inert text for later rendering', () => {
    expect(normalizeTags(['<IMG ONERROR=alert(1)>'])).toEqual(['<img onerror=alert(1)>']);
  });

  test('bounds the number of tags while preserving first-seen order', () => {
    const input = Array.from({ length: MAX_TAGS + 3 }, (_, index) => `tag-${index}`);

    expect(normalizeTags(input)).toEqual(input.slice(0, MAX_TAGS));
  });
});
