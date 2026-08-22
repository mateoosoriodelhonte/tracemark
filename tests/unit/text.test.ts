import { describe, expect, test } from 'vitest';
import { normalizeSearchText, normalizeWhitespace, tokenizeSearch } from '../../src/domain/text';

describe('text normalization', () => {
  test('collapses layout whitespace without interpreting markup', () => {
    expect(normalizeWhitespace('  Retrieval\n\tquality  <em>matters</em>  ')).toBe(
      'Retrieval quality <em>matters</em>',
    );
  });

  test('normalizes search text across case and accents', () => {
    expect(normalizeSearchText('  RÉTRIEVAL\nQuality  ')).toBe('retrieval quality');
  });

  test('tokenizes words, numbers, and hyphenated research terms', () => {
    expect(tokenizeSearch('RAG retrieval system-design RAG 2026')).toEqual([
      'rag',
      'retrieval',
      'system-design',
      '2026',
    ]);
  });
});
