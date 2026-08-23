import Dexie from 'dexie';
import { afterEach, describe, expect, test } from 'vitest';
import { openTraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import { makeCollection, makeHighlight } from '../helpers/fixtures';
import { uniqueDatabaseName } from '../helpers/database';

const databaseNames: string[] = [];

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

async function createRepository(): Promise<ResearchRepository> {
  const name = uniqueDatabaseName();
  databaseNames.push(name);
  const database = await openTraceMarkDatabase(name);
  return new ResearchRepository(database);
}

describe('ResearchRepository', () => {
  test('validates records before writing and returns immutable copies', async () => {
    const repository = await createRepository();
    await repository.putCollection(makeCollection());
    const source = makeHighlight();

    await repository.putHighlight(source);
    source.tags.push('mutated-after-save');

    expect(await repository.getHighlight(source.id)).toMatchObject({
      quote: 'Retrieval quality matters more than raw context-window size.',
      tags: ['rag', 'retrieval'],
    });
    await expect(
      repository.putHighlight({ ...makeHighlight(), url: 'javascript:alert(1)' }),
    ).rejects.toThrow();
  });

  test('lists highlights newest first', async () => {
    const repository = await createRepository();
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    await repository.putHighlight(
      makeHighlight({
        id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
        createdAt: '2026-08-23T06:00:00.000Z',
        updatedAt: '2026-08-23T06:00:00.000Z',
      }),
    );

    expect((await repository.listHighlights()).map(({ id }) => id)).toEqual([
      '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
      '6f3f6066-69e2-48c0-9d55-f273a22a830e',
    ]);
  });

  test('returns bounded recent highlights and a bounded distinct tag projection', async () => {
    const repository = await createRepository();
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    await repository.putHighlight(
      makeHighlight({
        id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
        tags: ['evidence', 'retrieval'],
        createdAt: '2026-08-23T06:00:00.000Z',
        updatedAt: '2026-08-23T06:00:00.000Z',
      }),
    );

    expect((await repository.listRecentHighlights(1)).map(({ id }) => id)).toEqual([
      '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
    ]);
    expect(await repository.listTags(2)).toEqual(['evidence', 'rag']);
  });

  test('validates AI results before writing and returns immutable validated records', async () => {
    const repository = await createRepository();
    const result = {
      id: '3a80e81a-4b11-464c-a329-a6ae7498a61d',
      schemaVersion: 1,
      kind: 'tags' as const,
      provider: 'ollama' as const,
      sourceHighlightIds: [makeHighlight().id],
      content: 'retrieval, evidence',
      suggestedTags: ['retrieval', 'evidence'],
      createdAt: '2026-08-22T06:00:00.000Z',
    };

    await repository.putAIResult(result);
    result.suggestedTags.push('mutated-after-save');

    expect(await repository.listAIResults()).toEqual([
      {
        ...result,
        suggestedTags: ['retrieval', 'evidence'],
      },
    ]);
    await expect(repository.putAIResult({ ...result, content: '' })).rejects.toThrow();
  });

  test.each([
    ['non-normalized', ['#Retrieval']],
    ['duplicate', ['retrieval', 'retrieval']],
  ])('rejects %s persisted suggested tags', async (_, suggestedTags) => {
    const repository = await createRepository();

    await expect(
      repository.putAIResult({
        id: '3a80e81a-4b11-464c-a329-a6ae7498a61d',
        schemaVersion: 1,
        kind: 'tags',
        provider: 'ollama',
        sourceHighlightIds: [makeHighlight().id],
        content: 'retrieval',
        suggestedTags,
        createdAt: '2026-08-22T06:00:00.000Z',
      }),
    ).rejects.toThrow();
    expect(await repository.listAIResults()).toEqual([]);
  });
});
