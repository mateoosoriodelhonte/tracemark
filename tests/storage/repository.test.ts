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
});
