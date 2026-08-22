import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CollectionService } from '../../src/core/collections';
import { INBOX_COLLECTION_ID } from '../../src/domain/constants';
import { openTraceMarkDatabase, type TraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import { makeHighlight } from '../helpers/fixtures';
import { uniqueDatabaseName } from '../helpers/database';

const createdId = '8e6469f9-77ab-41dd-9df6-618c4821f15b';
const fixedNow = '2026-08-22T06:00:00.000Z';
let database: TraceMarkDatabase;
let repository: ResearchRepository;
let service: CollectionService;
let databaseName: string;

beforeEach(async () => {
  databaseName = uniqueDatabaseName();
  database = await openTraceMarkDatabase(databaseName, { now: () => fixedNow });
  repository = new ResearchRepository(database);
  service = new CollectionService(repository, {
    now: () => fixedNow,
    createId: () => createdId,
  });
});

afterEach(async () => {
  database.close();
  await Dexie.delete(databaseName);
});

describe('CollectionService', () => {
  test('creates normalized case-insensitively unique collections', async () => {
    const collection = await service.create('  RAG   Research  ');

    expect(collection).toMatchObject({
      id: createdId,
      name: 'RAG Research',
      normalizedName: 'rag research',
      status: 'active',
    });
    await expect(service.create('rag research')).rejects.toThrow('already exists');
  });

  test('renames a collection and refreshes affected search documents atomically', async () => {
    await service.create('RAG Research');
    await repository.putHighlight(makeHighlight({ collectionId: createdId }));

    await service.rename(createdId, 'Retrieval Notes');

    expect(await repository.getCollection(createdId)).toMatchObject({
      name: 'Retrieval Notes',
      normalizedName: 'retrieval notes',
    });
    expect((await repository.getHighlight(makeHighlight().id))?.searchText).toContain(
      'retrieval notes',
    );
    expect((await repository.getHighlight(makeHighlight().id))?.searchText).not.toContain(
      'rag research',
    );
  });

  test('requires confirmation and moves content to Inbox before deletion', async () => {
    await service.create('RAG Research');
    await repository.putHighlight(makeHighlight({ collectionId: createdId }));

    await expect(service.remove(createdId, false)).rejects.toThrow('confirmation');
    await service.remove(createdId, true);

    expect(await repository.getCollection(createdId)).toBeUndefined();
    expect(await repository.getHighlight(makeHighlight().id)).toMatchObject({
      collectionId: INBOX_COLLECTION_ID,
    });
    expect((await repository.getHighlight(makeHighlight().id))?.searchText).toContain('inbox');
  });

  test('protects Inbox and supports archive filtering', async () => {
    await service.create('RAG Research');
    await service.archive(createdId, true);

    expect((await service.list()).map(({ name }) => name)).toEqual(['Inbox']);
    expect((await service.list({ includeArchived: true })).map(({ name }) => name)).toEqual([
      'Inbox',
      'RAG Research',
    ]);
    await expect(service.remove(INBOX_COLLECTION_ID, true)).rejects.toThrow('Inbox');
  });
});
