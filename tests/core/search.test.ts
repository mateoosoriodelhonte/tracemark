import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SearchService } from '../../src/core/search';
import { openTraceMarkDatabase, type TraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import {
  ARCHIVED_COLLECTION_ID,
  COLLECTION_ID,
  makeCollection,
  makeHighlight,
} from '../helpers/fixtures';
import { uniqueDatabaseName } from '../helpers/database';

let database: TraceMarkDatabase;
let repository: ResearchRepository;
let search: SearchService;
let databaseName: string;

beforeEach(async () => {
  databaseName = uniqueDatabaseName();
  database = await openTraceMarkDatabase(databaseName);
  repository = new ResearchRepository(database);
  search = new SearchService(repository);

  await repository.putCollection(makeCollection());
  await repository.putCollection(
    makeCollection({
      id: ARCHIVED_COLLECTION_ID,
      name: 'Archived Notes',
      normalizedName: 'archived notes',
      status: 'archived',
    }),
  );
  await repository.putHighlight(makeHighlight());
  await repository.putHighlight(
    makeHighlight({
      id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
      quote: 'Databases use durable indexes.',
      title: 'Storage Primer',
      collectionId: ARCHIVED_COLLECTION_ID,
      tags: ['databases'],
      note: 'Read after the retrieval paper.',
      searchText:
        'databases use durable indexes storage primer example com read after the retrieval paper databases archived notes',
      searchTokens: [
        'databases',
        'use',
        'durable',
        'indexes',
        'storage',
        'primer',
        'example',
        'com',
        'read',
        'after',
        'the',
        'retrieval',
        'paper',
        'archived',
        'notes',
      ],
      createdAt: '2026-08-23T06:00:00.000Z',
      updatedAt: '2026-08-23T06:00:00.000Z',
    }),
  );
});

afterEach(async () => {
  database.close();
  await Dexie.delete(databaseName);
});

describe('SearchService', () => {
  test('searches quotation, note, tags, and collection while excluding archives by default', async () => {
    expect((await search.run({ query: 'retrieval' })).map(({ title }) => title)).toEqual([
      'Example Article',
    ]);
    expect(
      (await search.run({ query: 'retrieval', includeArchived: true })).map(({ title }) => title),
    ).toEqual(['Example Article', 'Storage Primer']);
    expect((await search.run({ query: 'rag research' })).map(({ title }) => title)).toEqual([
      'Example Article',
    ]);
  });

  test('composes collection and tag filters', async () => {
    expect(
      (
        await search.run({
          query: '',
          collectionId: COLLECTION_ID,
          tag: 'Retrieval',
        })
      ).map(({ title }) => title),
    ).toEqual(['Example Article']);
    expect(await search.run({ query: '', collectionId: COLLECTION_ID, tag: 'databases' })).toEqual(
      [],
    );
  });

  test('returns recent active research for an empty query', async () => {
    expect((await search.run({ query: '' })).map(({ title }) => title)).toEqual([
      'Example Article',
    ]);
  });
});
