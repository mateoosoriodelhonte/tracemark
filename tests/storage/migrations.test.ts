import Dexie from 'dexie';
import { afterEach, describe, expect, test } from 'vitest';
import { INBOX_COLLECTION_ID } from '../../src/domain/constants';
import { openTraceMarkDatabase, TraceMarkDatabase } from '../../src/storage/database';
import {
  createLegacyDatabase,
  readLegacyCollections,
  readLegacyHighlights,
  uniqueDatabaseName,
} from '../helpers/database';

const databaseNames: string[] = [];
const fixedNow = '2026-08-22T06:00:00.000Z';

function trackDatabase(): string {
  const name = uniqueDatabaseName();
  databaseNames.push(name);
  return name;
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe('TraceMark database migrations', () => {
  test('creates the current schema and Inbox on a fresh install', async () => {
    const database = await openTraceMarkDatabase(trackDatabase(), { now: () => fixedNow });

    expect(database.verno).toBe(2);
    expect(await database.collections.get(INBOX_COLLECTION_ID)).toMatchObject({
      id: INBOX_COLLECTION_ID,
      name: 'Inbox',
      normalizedName: 'inbox',
      status: 'active',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });
    database.close();
  });

  test('upgrades legacy highlights without changing the saved quotation', async () => {
    const name = trackDatabase();
    await createLegacyDatabase(name, [
      {
        id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
        text: ' Exact quote with intentional spaces ',
        sourceUrl: 'https://example.com/article#section',
        title: 'Legacy Article',
        createdAt: '2025-01-02T03:04:05.000Z',
        tags: [' RAG ', 'rag'],
      },
    ]);

    const database = await openTraceMarkDatabase(name, { now: () => fixedNow });
    const highlight = await database.highlights.get('6f3f6066-69e2-48c0-9d55-f273a22a830e');

    expect(highlight).toMatchObject({
      quote: ' Exact quote with intentional spaces ',
      schemaVersion: 1,
      url: 'https://example.com/article',
      hostname: 'example.com',
      collectionId: INBOX_COLLECTION_ID,
      tags: ['rag'],
      note: '',
      createdAt: '2025-01-02T03:04:05.000Z',
      updatedAt: '2025-01-02T03:04:05.000Z',
    });
    expect(highlight?.searchTokens).toContain('legacy');
    database.close();
  });

  test('migrates assigned collections and reindexes highlights with the collection name', async () => {
    const name = trackDatabase();
    const collectionId = '8e6469f9-77ab-41dd-9df6-618c4821f15b';
    await createLegacyDatabase(
      name,
      [
        {
          id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
          text: 'Exact quote',
          sourceUrl: 'https://example.com/article',
          collectionId,
          createdAt: '2025-01-02T03:04:05.000Z',
        },
      ],
      [
        {
          id: collectionId,
          name: '  RAG   Research  ',
          archived: true,
          createdAt: '2025-01-01T03:04:05.000Z',
        },
      ],
    );

    const database = await openTraceMarkDatabase(name, { now: () => fixedNow });

    expect(await database.collections.get(collectionId)).toEqual({
      id: collectionId,
      schemaVersion: 1,
      name: 'RAG Research',
      normalizedName: 'rag research',
      status: 'archived',
      createdAt: '2025-01-01T03:04:05.000Z',
      updatedAt: '2025-01-01T03:04:05.000Z',
    });
    expect(await database.highlights.get('6f3f6066-69e2-48c0-9d55-f273a22a830e')).toMatchObject({
      collectionId,
      searchText: expect.stringContaining('rag research'),
    });
    database.close();
  });

  test('aborts an invalid migration and leaves the legacy database intact', async () => {
    const name = trackDatabase();
    const legacy = {
      id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
      text: 'Do not lose me',
      sourceUrl: 'javascript:alert(1)',
      createdAt: '2025-01-02T03:04:05.000Z',
    };
    await createLegacyDatabase(name, [legacy]);

    const database = new TraceMarkDatabase(name, { now: () => fixedNow });
    await expect(database.open()).rejects.toThrow('Cannot migrate legacy highlight');
    database.close();

    expect(await readLegacyHighlights(name)).toEqual([legacy]);
  });

  test('aborts a malformed collection migration without modifying legacy stores', async () => {
    const name = trackDatabase();
    const malformedCollection = {
      id: 'not-a-uuid',
      name: 'Research',
      createdAt: '2025-01-01T03:04:05.000Z',
    };
    await createLegacyDatabase(name, [], [malformedCollection]);

    const database = new TraceMarkDatabase(name, { now: () => fixedNow });
    await expect(database.open()).rejects.toThrow('Cannot migrate legacy collection');
    database.close();

    expect(await readLegacyCollections(name)).toEqual([malformedCollection]);
  });
});
