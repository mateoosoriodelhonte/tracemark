import Dexie from 'dexie';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AIAssistanceError, AIAssistanceService } from '../../src/core/ai-assistance';
import { AIProviderError, type AIProvider } from '../../src/core/ai-provider';
import type { Settings } from '../../src/domain/models';
import { openTraceMarkDatabase } from '../../src/storage/database';
import { ResearchRepository } from '../../src/storage/repository';
import { uniqueDatabaseName } from '../helpers/database';
import { makeCollection, makeHighlight } from '../helpers/fixtures';

const databaseNames: string[] = [];
const createdAt = '2026-08-22T06:00:00.000Z';
const resultId = '3a80e81a-4b11-464c-a329-a6ae7498a61d';

const disabledSettings: Settings = {
  id: 'settings',
  schemaVersion: 1,
  theme: 'system',
  ai: { provider: 'none', model: 'llama3.2' },
};

const enabledSettings: Settings = {
  ...disabledSettings,
  ai: { provider: 'ollama', model: 'llama3.2' },
};

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

async function createRepository(): Promise<ResearchRepository> {
  const name = uniqueDatabaseName();
  databaseNames.push(name);
  return new ResearchRepository(await openTraceMarkDatabase(name));
}

function createProvider(): AIProvider {
  return {
    summarize: vi.fn().mockResolvedValue({ content: 'A concise summary.' }),
    explain: vi.fn().mockResolvedValue({ content: 'An explanation.' }),
    suggestTags: vi.fn().mockResolvedValue({ tags: ['retrieval'] }),
    overview: vi.fn().mockResolvedValue({ content: 'An overview.' }),
  };
}

function createService(
  repository: ResearchRepository,
  provider: AIProvider,
  settings: Settings,
  permissionGranted: boolean,
  permissionChecker = { contains: async () => permissionGranted },
  createId = () => resultId,
): AIAssistanceService {
  return new AIAssistanceService(
    repository,
    provider,
    { get: async () => settings },
    permissionChecker,
    {
      now: () => createdAt,
      createId,
    },
  );
}

describe('AIAssistanceService privacy gates', () => {
  test('rejects disabled local AI before checking permission or invoking a provider', async () => {
    const repository = await createRepository();
    const provider = createProvider();
    const permissionChecker = { contains: vi.fn().mockResolvedValue(false) };
    const service = createService(repository, provider, disabledSettings, false, permissionChecker);

    await expect(service.run('summary', [makeHighlight().id])).rejects.toMatchObject({
      code: 'AI_DISABLED',
    } satisfies Pick<AIAssistanceError, 'code'>);

    expect(provider.summarize).not.toHaveBeenCalled();
    expect(provider.explain).not.toHaveBeenCalled();
    expect(provider.suggestTags).not.toHaveBeenCalled();
    expect(provider.overview).not.toHaveBeenCalled();
    expect(permissionChecker.contains).not.toHaveBeenCalled();
  });

  test('rejects absent loopback permission before invoking a provider', async () => {
    const repository = await createRepository();
    const provider = createProvider();
    const permissionChecker = { contains: vi.fn().mockResolvedValue(false) };
    const service = createService(repository, provider, enabledSettings, false, permissionChecker);

    await expect(service.run('summary', [makeHighlight().id])).rejects.toMatchObject({
      code: 'AI_PERMISSION_REQUIRED',
    } satisfies Pick<AIAssistanceError, 'code'>);

    expect(provider.summarize).not.toHaveBeenCalled();
    expect(provider.explain).not.toHaveBeenCalled();
    expect(provider.suggestTags).not.toHaveBeenCalled();
    expect(provider.overview).not.toHaveBeenCalled();
    expect(permissionChecker.contains).toHaveBeenCalledWith({
      origins: ['http://127.0.0.1:11434/*'],
    });
  });

  test('rejects an unavailable selected highlight before invoking a provider', async () => {
    const repository = await createRepository();
    const provider = createProvider();
    const service = createService(repository, provider, enabledSettings, true);

    await expect(service.run('summary', [makeHighlight().id])).rejects.toMatchObject({
      code: 'NOT_FOUND',
    } satisfies Pick<AIAssistanceError, 'code'>);

    expect(provider.summarize).not.toHaveBeenCalled();
  });

  test.each([
    ['no selection', []],
    ['a duplicate selection', [makeHighlight().id, makeHighlight().id]],
    [
      'more than twenty selections',
      Array.from(
        { length: 21 },
        (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      ),
    ],
  ])('rejects %s before invoking a provider', async (_, sourceHighlightIds) => {
    const repository = await createRepository();
    const provider = createProvider();
    const service = createService(repository, provider, enabledSettings, true);

    await expect(service.run('summary', sourceHighlightIds)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    } satisfies Pick<AIAssistanceError, 'code'>);

    expect(provider.summarize).not.toHaveBeenCalled();
  });

  test('sends only the explicitly selected reduced research record to the provider', async () => {
    const repository = await createRepository();
    await repository.putCollection(makeCollection());
    const selected = makeHighlight();
    const unrelated = makeHighlight({
      id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
      quote: 'Unrelated research must not be sent.',
      createdAt: '2026-08-23T06:00:00.000Z',
      updatedAt: '2026-08-23T06:00:00.000Z',
    });
    await repository.putHighlight(selected);
    await repository.putHighlight(unrelated);
    const provider = createProvider();
    const service = createService(repository, provider, enabledSettings, true);

    await service.run('summary', [selected.id]);

    expect(provider.summarize).toHaveBeenCalledWith(
      {
        items: [
          {
            id: selected.id,
            quote: selected.quote,
            title: selected.title,
            url: selected.url,
            tags: selected.tags,
            note: selected.note,
          },
        ],
      },
      'llama3.2',
    );
  });
});

describe('AIAssistanceService results', () => {
  test.each([
    ['summary', 'A concise summary.', undefined],
    ['explanation', 'An explanation.', undefined],
    ['tags', 'retrieval', ['retrieval']],
    ['overview', 'An overview.', undefined],
  ] as const)(
    'stores a validated %s result for exactly the selected highlight',
    async (kind, content, suggestedTags) => {
      const repository = await createRepository();
      await repository.putCollection(makeCollection());
      const selected = makeHighlight();
      await repository.putHighlight(selected);
      const provider = createProvider();
      const service = createService(repository, provider, enabledSettings, true);

      const result = await service.run(kind, [selected.id]);

      expect(result).toEqual({
        id: resultId,
        schemaVersion: 1,
        kind,
        provider: 'ollama',
        sourceHighlightIds: [selected.id],
        content,
        ...(suggestedTags === undefined ? {} : { suggestedTags }),
        createdAt,
      });
      expect(await repository.listAIResults()).toEqual([result]);
    },
  );

  test('does not write a result when the provider rejects', async () => {
    const repository = await createRepository();
    await repository.putCollection(makeCollection());
    const selected = makeHighlight();
    await repository.putHighlight(selected);
    const provider = createProvider();
    provider.summarize = vi
      .fn()
      .mockRejectedValue(new AIProviderError('AI_UNAVAILABLE', 'Local AI is unavailable'));
    const service = createService(repository, provider, enabledSettings, true);

    await expect(service.run('summary', [selected.id])).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
    } satisfies Pick<AIAssistanceError, 'code'>);

    expect(await repository.listAIResults()).toEqual([]);
  });
});
