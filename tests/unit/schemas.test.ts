import { describe, expect, test } from 'vitest';
import { MAX_TAG_LENGTH } from '../../src/domain/constants';
import { HighlightSchema } from '../../src/domain/schemas';

const validHighlight = {
  id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
  schemaVersion: 1,
  quote: 'Retrieval quality matters more than raw context-window size.',
  prefix: 'The evidence suggests ',
  suffix: ' This changes evaluation.',
  heading: 'Retrieval systems',
  context: 'The evidence suggests Retrieval quality matters more than raw context-window size.',
  title: 'Example Article',
  url: 'https://example.com/article',
  canonicalUrl: 'https://example.com/article',
  hostname: 'example.com',
  collectionId: '8e6469f9-77ab-41dd-9df6-618c4821f15b',
  tags: ['rag', 'retrieval'],
  note: 'Relates to hybrid retrieval evaluation.',
  searchText: 'retrieval quality example article example.com rag retrieval hybrid',
  searchTokens: ['retrieval', 'quality', 'example', 'article', 'example', 'com', 'rag', 'hybrid'],
  createdAt: '2026-08-22T06:00:00.000Z',
  updatedAt: '2026-08-22T06:00:00.000Z',
} as const;

describe('highlight schema', () => {
  test('accepts exact hostile-looking quotation text without rewriting it', () => {
    const quote = '<script>alert("research")</script>';

    expect(HighlightSchema.parse({ ...validHighlight, quote }).quote).toBe(quote);
  });

  test('rejects an empty quotation', () => {
    expect(() => HighlightSchema.parse({ ...validHighlight, quote: '   ' })).toThrow();
  });

  test('rejects unsafe source URLs and invalid timestamps', () => {
    expect(() =>
      HighlightSchema.parse({ ...validHighlight, url: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() => HighlightSchema.parse({ ...validHighlight, createdAt: 'yesterday' })).toThrow();
  });

  test('rejects overlong tags and unknown properties', () => {
    expect(() =>
      HighlightSchema.parse({ ...validHighlight, tags: ['x'.repeat(MAX_TAG_LENGTH + 1)] }),
    ).toThrow();
    expect(() => HighlightSchema.parse({ ...validHighlight, privileged: true })).toThrow();
  });
});
