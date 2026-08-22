import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { HighlightService } from '../../src/core/highlights';
import { INBOX_COLLECTION_ID } from '../../src/domain/constants';
import { openTraceMarkDatabase, type TraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import { makeCollection } from '../helpers/fixtures';
import { uniqueDatabaseName } from '../helpers/database';

const createdId = '6f3f6066-69e2-48c0-9d55-f273a22a830e';
const fixedNow = '2026-08-22T06:00:00.000Z';
let database: TraceMarkDatabase;
let repository: ResearchRepository;
let service: HighlightService;
let databaseName: string;

beforeEach(async () => {
  databaseName = uniqueDatabaseName();
  database = await openTraceMarkDatabase(databaseName, { now: () => fixedNow });
  repository = new ResearchRepository(database);
  service = new HighlightService(repository, {
    now: () => fixedNow,
    createId: () => createdId,
  });
});

afterEach(async () => {
  database.close();
  await Dexie.delete(databaseName);
});

describe('HighlightService', () => {
  test('creates a verbatim quotation with normalized provenance and tags', async () => {
    const quote = '  Retrieval quality\nmatters.  ';
    const highlight = await service.create({
      quote,
      prefix: 'Before ',
      suffix: ' after.',
      title: '  Example   Article ',
      url: 'https://user:pass@example.com/article?q=rag#section',
      canonicalUrl: '/canonical#heading',
      collectionId: INBOX_COLLECTION_ID,
      tags: [' RAG ', 'rag', '#Retrieval'],
      note: 'My exact note.',
    });

    expect(highlight).toMatchObject({
      id: createdId,
      quote,
      title: 'Example Article',
      url: 'https://example.com/article?q=rag',
      canonicalUrl: 'https://example.com/canonical',
      hostname: 'example.com',
      collectionId: INBOX_COLLECTION_ID,
      tags: ['rag', 'retrieval'],
      note: 'My exact note.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });
    expect(highlight.searchTokens).toEqual(
      expect.arrayContaining(['retrieval', 'quality', 'example', 'article', 'inbox']),
    );
  });

  test('rejects missing collections and unsafe source URLs', async () => {
    const input = {
      quote: 'Exact quote',
      prefix: '',
      suffix: '',
      title: 'Article',
      url: 'https://example.com/article',
      collectionId: '8e6469f9-77ab-41dd-9df6-618c4821f15b',
      tags: [],
      note: '',
    };

    await expect(service.create(input)).rejects.toThrow('Collection not found');
    await expect(
      service.create({ ...input, collectionId: INBOX_COLLECTION_ID, url: 'javascript:alert(1)' }),
    ).rejects.toThrow('Unsupported source URL');
  });

  test('stores quotations containing long identifiers without creating oversized index keys', async () => {
    const longIdentifier = 'x'.repeat(500);

    const highlight = await service.create({
      quote: `Identifier ${longIdentifier} is part of the source.`,
      prefix: '',
      suffix: '',
      title: 'Long identifiers',
      url: 'https://example.com/article',
      collectionId: INBOX_COLLECTION_ID,
      tags: [],
      note: '',
    });

    expect(highlight.quote).toContain(longIdentifier);
    expect(Math.max(...highlight.searchTokens.map((token) => token.length))).toBe(256);
  });

  test('updates notes, tags, and collection-derived search fields', async () => {
    await repository.putCollection(makeCollection());
    await service.create({
      quote: 'Exact quote',
      prefix: '',
      suffix: '',
      title: 'Article',
      url: 'https://example.com/article',
      collectionId: INBOX_COLLECTION_ID,
      tags: [],
      note: '',
    });

    const updated = await service.update(createdId, {
      collectionId: makeCollection().id,
      tags: [' Databases ', 'databases'],
      note: 'Connect to storage research.',
    });

    expect(updated).toMatchObject({
      collectionId: makeCollection().id,
      tags: ['databases'],
      note: 'Connect to storage research.',
    });
    expect(updated.searchText).toContain('rag research');
    expect(updated.searchTokens).toContain('storage');
  });

  test('deletes a single saved highlight', async () => {
    await service.create({
      quote: 'Exact quote',
      prefix: '',
      suffix: '',
      title: 'Article',
      url: 'https://example.com/article',
      collectionId: INBOX_COLLECTION_ID,
      tags: [],
      note: '',
    });

    await service.remove(createdId);
    expect(await repository.getHighlight(createdId)).toBeUndefined();
  });
});
