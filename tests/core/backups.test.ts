import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BackupService } from '../../src/core/backups';
import type { Settings } from '../../src/domain/models';
import { BackupEnvelopeSchema } from '../../src/domain/schemas';
import { openTraceMarkDatabase, type TraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import { uniqueDatabaseName } from '../helpers/database';
import { INBOX_ID, makeCollection, makeHighlight } from '../helpers/fixtures';

class MemoryPreferences {
  constructor(private settings: Settings) {}

  async get(): Promise<Settings> {
    return structuredClone(this.settings);
  }

  async set(input: unknown): Promise<Settings> {
    this.settings = input as Settings;
    return structuredClone(this.settings);
  }
}

const fixedNow = '2026-08-22T06:00:00.000Z';
const defaultSettings: Settings = {
  id: 'settings',
  schemaVersion: 1,
  theme: 'dark',
  ai: { provider: 'none', model: 'llama3.2' },
};
const generatedHighlightId = '0e567f4f-22cf-4630-87cb-6cf94fe7eb3d';
const generatedAiId = '3a80e81a-4b11-464c-a329-a6ae7498a61d';

let database: TraceMarkDatabase;
let repository: ResearchRepository;
let preferences: MemoryPreferences;
let service: BackupService;
let databaseName: string;

beforeEach(async () => {
  databaseName = uniqueDatabaseName();
  database = await openTraceMarkDatabase(databaseName, { now: () => fixedNow });
  repository = new ResearchRepository(database);
  preferences = new MemoryPreferences(defaultSettings);
  const generatedIds = [generatedHighlightId, generatedAiId];
  service = new BackupService(repository, preferences, {
    now: () => fixedNow,
    createId: () => generatedIds.shift() ?? crypto.randomUUID(),
  });
});

afterEach(async () => {
  database.close();
  await Dexie.delete(databaseName);
});

describe('BackupService', () => {
  test('round-trips a strict versioned JSON backup without importing device preferences', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());

    const exported = await service.exportJson();
    expect(exported).toMatchObject({
      format: 'json',
      filename: 'tracemark-backup-2026-08-22.json',
    });

    await database.highlights.clear();
    await database.collections.clear();
    await preferences.set({ ...defaultSettings, theme: 'light' });
    const first = await service.importJson(exported.content, true);
    const second = await service.importJson(exported.content, true);

    expect(first.created).toEqual({ collections: 2, highlights: 1, aiResults: 0 });
    expect(second.skipped).toEqual({ collections: 2, highlights: 1, aiResults: 0 });
    expect(await repository.listCollections()).toHaveLength(2);
    expect(await repository.listHighlights()).toEqual([makeHighlight()]);
    expect(await preferences.get()).toEqual({ ...defaultSettings, theme: 'light' });
  });

  test('round-trips structured suggested tags in persisted AI results', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const aiResult = {
      id: generatedAiId,
      schemaVersion: 1,
      kind: 'tags' as const,
      provider: 'ollama' as const,
      sourceHighlightIds: [makeHighlight().id],
      content: 'retrieval, evidence',
      suggestedTags: ['retrieval', 'evidence'],
      createdAt: fixedNow,
    };
    await repository.putAIResult(aiResult);
    const exported = await service.exportJson();

    await database.aiResults.clear();
    await database.highlights.clear();
    await database.collections.clear();
    await service.importJson(exported.content, true);

    expect(await repository.listAIResults()).toEqual([aiResult]);
  });

  test('exports an importable backup after deleting a highlight with dependent AI results', async () => {
    await repository.putCollection(makeCollection());
    const deletedHighlight = makeHighlight();
    const retainedHighlight = makeHighlight({
      id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
      quote: 'Retained research remains available after another quotation is deleted.',
      createdAt: '2026-08-23T06:00:00.000Z',
      updatedAt: '2026-08-23T06:00:00.000Z',
    });
    await repository.putHighlight(deletedHighlight);
    await repository.putHighlight(retainedHighlight);
    await repository.putAIResult({
      id: generatedAiId,
      schemaVersion: 1,
      kind: 'overview',
      provider: 'ollama',
      sourceHighlightIds: [deletedHighlight.id, retainedHighlight.id],
      content: 'This result depends on the quotation that will be deleted.',
      createdAt: fixedNow,
    });
    const retainedAiResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1 as const,
      kind: 'summary' as const,
      provider: 'ollama' as const,
      sourceHighlightIds: [retainedHighlight.id],
      content: 'This result only depends on retained research.',
      createdAt: '2026-08-23T06:00:00.000Z',
    };
    await repository.putAIResult(retainedAiResult);

    await repository.deleteHighlight(deletedHighlight.id);
    const exported = await service.exportJson();

    expect((await repository.listAIResults()).map(({ id }) => id)).toEqual([retainedAiResult.id]);
    await database.aiResults.clear();
    await database.highlights.clear();
    await database.collections.clear();
    await expect(service.importJson(exported.content, true)).resolves.toMatchObject({
      highlights: 1,
      aiResults: 1,
    });
    expect(await repository.listAIResults()).toEqual([retainedAiResult]);
  });

  test('keeps structurally different suggested-tag arrays as distinct AI results', async () => {
    await repository.putCollection(makeCollection());
    const highlight = makeHighlight();
    await repository.putHighlight(highlight);
    const exported = await service.exportJson();
    const envelope = BackupEnvelopeSchema.parse(JSON.parse(exported.content));
    const importedResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1 as const,
      kind: 'tags' as const,
      provider: 'ollama' as const,
      sourceHighlightIds: [highlight.id],
      content: 'Shared rendered content.',
      suggestedTags: ['a,b'],
      createdAt: '2026-08-23T06:00:00.000Z',
    };
    envelope.aiResults.push(importedResult);
    await repository.putAIResult({
      ...importedResult,
      id: generatedAiId,
      suggestedTags: ['a', 'b'],
      createdAt: fixedNow,
    });

    const result = await service.importJson(JSON.stringify(envelope), true);

    expect(result.created.aiResults).toBe(1);
    expect((await repository.listAIResults()).map(({ suggestedTags }) => suggestedTags)).toEqual(
      expect.arrayContaining([['a', 'b'], ['a,b']]),
    );
  });

  test('keeps different source-highlight orders as distinct AI results', async () => {
    await repository.putCollection(makeCollection());
    const firstHighlight = makeHighlight();
    const secondHighlight = makeHighlight({
      id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
      quote: 'A second source makes result ordering observable.',
      createdAt: '2026-08-23T06:00:00.000Z',
      updatedAt: '2026-08-23T06:00:00.000Z',
    });
    await repository.putHighlight(firstHighlight);
    await repository.putHighlight(secondHighlight);
    const exported = await service.exportJson();
    const envelope = BackupEnvelopeSchema.parse(JSON.parse(exported.content));
    const importedResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1 as const,
      kind: 'overview' as const,
      provider: 'ollama' as const,
      sourceHighlightIds: [secondHighlight.id, firstHighlight.id],
      content: 'Shared content whose source order changes its meaning.',
      createdAt: '2026-08-23T06:00:00.000Z',
    };
    envelope.aiResults.push(importedResult);
    await repository.putAIResult({
      ...importedResult,
      id: generatedAiId,
      sourceHighlightIds: [firstHighlight.id, secondHighlight.id],
      createdAt: fixedNow,
    });

    const result = await service.importJson(JSON.stringify(envelope), true);

    expect(result.created.aiResults).toBe(1);
    expect(
      (await repository.listAIResults()).map(({ sourceHighlightIds }) => sourceHighlightIds),
    ).toEqual(
      expect.arrayContaining([
        [firstHighlight.id, secondHighlight.id],
        [secondHighlight.id, firstHighlight.id],
      ]),
    );
  });

  test('rejects non-normalized duplicate suggested tags in backup input', async () => {
    await repository.putCollection(makeCollection());
    const highlight = makeHighlight();
    await repository.putHighlight(highlight);
    await repository.putAIResult({
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1,
      kind: 'tags',
      provider: 'ollama',
      sourceHighlightIds: [highlight.id],
      content: 'rag',
      suggestedTags: ['rag'],
      createdAt: fixedNow,
    });
    const before = await service.exportJson();
    const envelope = BackupEnvelopeSchema.parse(JSON.parse(before.content));
    const importedResult = envelope.aiResults[0];
    if (importedResult === undefined) throw new Error('Fixture backup has no AI result');
    importedResult.suggestedTags = ['#RAG', 'rag'];

    await expect(service.importJson(JSON.stringify(envelope), true)).rejects.toThrow(
      'backup data is invalid',
    );
    expect(await service.exportJson()).toEqual(before);
  });

  test('preserves unrelated local research and resolves conflicting IDs without duplicates', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const exported = await service.exportJson();

    await database.highlights.clear();
    await database.collections.clear();
    const localCollection = makeCollection({
      id: 'ba58f047-ea9f-492f-b624-12f86dad44fa',
    });
    const conflictingLocal = makeHighlight({
      quote: 'Local research with a colliding stable ID.',
      collectionId: localCollection.id,
      searchText: 'local research colliding stable id rag research',
      searchTokens: ['local', 'research', 'colliding', 'stable', 'id', 'rag'],
    });
    await repository.putCollection({
      ...makeCollection({ id: INBOX_ID, name: 'Inbox', normalizedName: 'inbox' }),
    });
    await repository.putCollection(localCollection);
    await repository.putHighlight(conflictingLocal);

    const first = await service.importJson(exported.content, true);
    const second = await service.importJson(exported.content, true);
    const highlights = await repository.listHighlights();

    expect(first.regenerated).toEqual({ collections: 0, highlights: 1, aiResults: 0 });
    expect(second.skipped.highlights).toBe(1);
    expect(highlights).toHaveLength(2);
    expect(highlights).toContainEqual(conflictingLocal);
    expect(highlights).toContainEqual(
      expect.objectContaining({ id: generatedHighlightId, quote: makeHighlight().quote }),
    );
  });

  test('does not overwrite a newer local edit with an older identity-matching backup record', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const exported = await service.exportJson();
    const newer = makeHighlight({
      note: 'A newer local annotation.',
      updatedAt: '2026-08-23T06:00:00.000Z',
    });
    await repository.putHighlight(newer);

    const result = await service.importJson(exported.content, true);

    expect(result.skipped.highlights).toBe(1);
    expect(await repository.getHighlight(newer.id)).toEqual(newer);
  });

  test('normalizes imported entities and rebuilds every derived search/provenance field', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const exported = await service.exportJson();
    const envelope = BackupEnvelopeSchema.parse(JSON.parse(exported.content));
    const importedCollection = envelope.collections.find(({ id }) => id === makeCollection().id);
    const importedHighlight = envelope.highlights[0];
    if (importedCollection === undefined || importedHighlight === undefined) {
      throw new Error('Fixture backup is incomplete');
    }
    importedCollection.name = '  Retrieval   Notes  ';
    importedCollection.normalizedName = 'attacker supplied';
    importedHighlight.title = '  Example   Article  ';
    importedHighlight.tags = ['#RAG', 'rag'];
    importedHighlight.hostname = 'evil.test';
    importedHighlight.canonicalUrl = 'https://evil.test/canonical';
    importedHighlight.searchText = 'attacker supplied';
    importedHighlight.searchTokens = ['attacker'];

    await database.highlights.clear();
    await database.collections.clear();
    await service.importJson(JSON.stringify(envelope), true);

    expect(await repository.getCollection(importedCollection.id)).toMatchObject({
      name: 'Retrieval Notes',
      normalizedName: 'retrieval notes',
    });
    const normalizedHighlight = await repository.getHighlight(importedHighlight.id);
    expect(normalizedHighlight).toMatchObject({
      title: 'Example Article',
      hostname: 'example.com',
      tags: ['rag'],
      searchText: expect.stringContaining('retrieval notes'),
      searchTokens: expect.arrayContaining(['retrieval', 'notes']),
    });
    expect(normalizedHighlight?.canonicalUrl).toBeUndefined();
  });

  test('exports IndexedDB records from one readonly snapshot', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const transaction = vi.spyOn(database, 'transaction');

    const exported = await service.exportJson();
    const envelope = BackupEnvelopeSchema.parse(JSON.parse(exported.content));
    const collectionIds = new Set(envelope.collections.map(({ id }) => id));

    expect(transaction.mock.calls.some(([mode]) => mode === 'r')).toBe(true);
    expect(envelope.highlights.every(({ collectionId }) => collectionIds.has(collectionId))).toBe(
      true,
    );
  });

  test('rejects malformed or referentially invalid input before changing local research', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const before = await service.exportJson();
    const parsed = JSON.parse(before.content) as Record<string, unknown>;
    parsed.collections = [
      {
        ...makeCollection(),
        id: INBOX_ID,
        name: 'Inbox',
        normalizedName: 'inbox',
      },
    ];

    await expect(service.importJson(JSON.stringify(parsed), true)).rejects.toThrow(
      'unknown collection',
    );
    await expect(service.importJson('{"format":"tracemark-backup"}', true)).rejects.toThrow(
      'invalid',
    );
    expect(await service.exportJson()).toEqual(before);
  });

  test('rolls back earlier merge writes when a later write fails', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(makeHighlight());
    const backup = await service.exportJson();

    await database.highlights.clear();
    await database.collections.clear();
    await repository.putCollection({
      ...makeCollection({ id: INBOX_ID, name: 'Inbox', normalizedName: 'inbox' }),
    });
    const beforeCollections = await repository.listCollections();
    const addHighlight = vi
      .spyOn(database.highlights, 'add')
      .mockRejectedValueOnce(new Error('injected write failure'));

    await expect(service.importJson(backup.content, true)).rejects.toThrow(
      'could not merge this backup',
    );

    expect(addHighlight).toHaveBeenCalledOnce();
    expect(await repository.listCollections()).toEqual(beforeCollections);
    expect(await repository.listHighlights()).toEqual([]);
  });

  test('requires explicit confirmation before merging local data', async () => {
    const exported = await service.exportJson();

    await expect(service.importJson(exported.content, false)).rejects.toThrow('confirmation');
  });

  test('exports readable Markdown while keeping hostile content literal', async () => {
    await repository.putCollection(makeCollection());
    await repository.putHighlight(
      makeHighlight({
        quote: '<img src=x onerror=alert(1)>',
        title: 'Evidence [draft]',
        note: '<script>alert(1)</script>',
        url: 'https://example.com/research_(draft)!x',
        canonicalUrl: 'https://example.com/research_(draft)!x',
      }),
    );

    const exported = await service.exportMarkdown(makeCollection().id);

    expect(exported).toMatchObject({
      format: 'markdown',
      filename: 'tracemark-rag-research-2026-08-22.md',
    });
    expect(exported.content).toContain('> &lt;img src=x onerror=alert\\(1\\)&gt;');
    expect(exported.content).toContain('My note:\n&lt;script&gt;alert\\(1\\)&lt;/script&gt;');
    expect(exported.content).toContain(
      'Source: [Evidence \\[draft\\]](https://example.com/research_%28draft%29!x)',
    );
    expect(exported.content).toContain('Saved: August 22, 2026');
    expect(exported.content).not.toMatch(/<(?:img|script)\b/iu);
  });
});
