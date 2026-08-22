import { describe, expect, test } from 'vitest';
import { buildSearchDocument } from '../../src/domain/search-document';

describe('search document derivation', () => {
  test('indexes quotation, provenance, note, tags, and collection locally', () => {
    const result = buildSearchDocument(
      {
        quote: 'Retrieval quality matters.',
        title: 'RAG Evaluation',
        hostname: 'research.example',
        note: 'Compare hybrid retrieval.',
        tags: ['rag', 'system-design'],
      },
      'Reading List',
    );

    expect(result.searchText).toBe(
      'retrieval quality matters rag evaluation research example compare hybrid retrieval rag system-design reading list',
    );
    expect(result.searchTokens).toEqual([
      'retrieval',
      'quality',
      'matters',
      'rag',
      'evaluation',
      'research',
      'example',
      'compare',
      'hybrid',
      'system-design',
      'reading',
      'list',
    ]);
  });
});
