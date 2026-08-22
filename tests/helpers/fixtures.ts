import type { Collection, Highlight } from '../../src/domain/models';

export const INBOX_ID = '00000000-0000-4000-8000-000000000001';
export const COLLECTION_ID = '8e6469f9-77ab-41dd-9df6-618c4821f15b';
export const ARCHIVED_COLLECTION_ID = 'ba58f047-ea9f-492f-b624-12f86dad44fa';
export const HIGHLIGHT_ID = '6f3f6066-69e2-48c0-9d55-f273a22a830e';

export function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: COLLECTION_ID,
    schemaVersion: 1,
    name: 'RAG Research',
    normalizedName: 'rag research',
    status: 'active',
    createdAt: '2026-08-22T06:00:00.000Z',
    updatedAt: '2026-08-22T06:00:00.000Z',
    ...overrides,
  };
}

export function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: HIGHLIGHT_ID,
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
    collectionId: COLLECTION_ID,
    tags: ['rag', 'retrieval'],
    note: 'Relates to hybrid evaluation.',
    searchText:
      'retrieval quality matters more than raw context-window size example article example com relates to hybrid evaluation rag retrieval rag research',
    searchTokens: [
      'retrieval',
      'quality',
      'matters',
      'more',
      'than',
      'raw',
      'context-window',
      'size',
      'example',
      'article',
      'com',
      'relates',
      'to',
      'hybrid',
      'evaluation',
      'rag',
      'research',
    ],
    createdAt: '2026-08-22T06:00:00.000Z',
    updatedAt: '2026-08-22T06:00:00.000Z',
    ...overrides,
  };
}
