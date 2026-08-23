import { describe, expect, test, vi } from 'vitest';
import { AIAssistanceError } from '../../src/core/ai-assistance';
import { createMessageRouter } from '../../src/messaging/router';

const capture = {
  quote: 'Exact quote',
  prefix: 'Before ',
  suffix: ' after',
  title: 'Article',
  url: 'https://example.com/article',
};

const selectedHighlightId = '6f3f6066-69e2-48c0-9d55-f273a22a830e';

const aiResult = {
  id: '3a80e81a-4b11-464c-a329-a6ae7498a61d',
  schemaVersion: 1 as const,
  kind: 'summary' as const,
  provider: 'ollama' as const,
  sourceHighlightIds: [selectedHighlightId],
  content: 'A concise summary.',
  createdAt: '2026-08-22T06:00:00.000Z',
};

function services() {
  return {
    capture: { captureActiveTab: vi.fn().mockResolvedValue(capture) },
    highlights: {
      create: vi.fn(),
      get: vi.fn(),
      recent: vi.fn().mockResolvedValue([]),
      tags: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      remove: vi.fn(),
    },
    collections: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
    },
    anchors: { apply: vi.fn() },
    search: { run: vi.fn().mockResolvedValue([]) },
    preferences: { get: vi.fn(), set: vi.fn() },
    backups: { exportJson: vi.fn(), exportMarkdown: vi.fn(), importJson: vi.fn() },
    ai: { run: vi.fn().mockResolvedValue(aiResult) },
  };
}

describe('message router', () => {
  test('rejects messages from another extension before dispatch', async () => {
    const dependencies = services();
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router({ type: 'capture.current' }, { id: 'other-extension' }),
    ).resolves.toMatchObject({ ok: false, code: 'UNTRUSTED_SENDER' });
    expect(dependencies.capture.captureActiveTab).not.toHaveBeenCalled();
  });

  test('rejects unknown operations and extra properties', async () => {
    const router = createMessageRouter(services(), 'tracemark-extension');

    await expect(
      router({ type: 'deleteEverything' }, { id: 'tracemark-extension' }),
    ).resolves.toMatchObject({ ok: false, code: 'INVALID_MESSAGE' });
    await expect(
      router({ type: 'capture.current', method: '__proto__' }, { id: 'tracemark-extension' }),
    ).resolves.toMatchObject({ ok: false, code: 'INVALID_MESSAGE' });
  });

  test('returns schema-validated capture data for an internal request', async () => {
    const router = createMessageRouter(services(), 'tracemark-extension');

    await expect(
      router({ type: 'capture.current' }, { id: 'tracemark-extension' }),
    ).resolves.toEqual({ ok: true, data: capture });
  });

  test('loads the requested highlight before applying an anchor', async () => {
    const dependencies = services();
    const highlight = {
      id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
      schemaVersion: 1 as const,
      quote: 'Exact quote',
      prefix: 'Before ',
      suffix: ' after',
      title: 'Article',
      url: 'https://example.com/article',
      hostname: 'example.com',
      collectionId: '00000000-0000-4000-8000-000000000001',
      tags: [],
      note: '',
      searchText: 'exact quote article example com inbox',
      searchTokens: ['exact', 'quote', 'article', 'example', 'com', 'inbox'],
      createdAt: '2026-08-22T06:00:00.000Z',
      updatedAt: '2026-08-22T06:00:00.000Z',
    };
    dependencies.highlights.get.mockResolvedValue(highlight);
    dependencies.anchors.apply.mockResolvedValue({ status: 'ambiguous' });
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router({ type: 'anchors.apply', highlightId: highlight.id }, { id: 'tracemark-extension' }),
    ).resolves.toEqual({ ok: true, data: { status: 'ambiguous' } });
    expect(dependencies.anchors.apply).toHaveBeenCalledWith(highlight);
  });

  test('validates and dispatches search and editing requests', async () => {
    const dependencies = services();
    const updated = {
      id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
      schemaVersion: 1 as const,
      quote: 'Exact quote',
      prefix: 'Before ',
      suffix: ' after',
      title: 'Article',
      url: 'https://example.com/article',
      hostname: 'example.com',
      collectionId: '00000000-0000-4000-8000-000000000001',
      tags: ['evidence'],
      note: 'Review this.',
      searchText: 'exact quote article example com evidence review this inbox',
      searchTokens: ['exact', 'quote', 'article', 'example', 'com', 'evidence', 'review', 'this'],
      createdAt: '2026-08-22T06:00:00.000Z',
      updatedAt: '2026-08-22T06:00:00.000Z',
    };
    dependencies.highlights.update.mockResolvedValue(updated);
    dependencies.search.run.mockResolvedValue([updated]);
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router(
        {
          type: 'research.search',
          input: { query: 'evidence', tag: 'evidence', includeArchived: false },
        },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toEqual({ ok: true, data: [updated] });
    expect(dependencies.search.run).toHaveBeenCalledWith({
      query: 'evidence',
      tag: 'evidence',
      includeArchived: false,
    });

    await expect(
      router(
        {
          type: 'highlights.update',
          highlightId: updated.id,
          input: { tags: ['evidence'], note: 'Review this.' },
        },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toEqual({ ok: true, data: updated });
  });

  test('routes bounded UI projections without loading the full highlight library', async () => {
    const dependencies = services();
    dependencies.highlights.recent.mockResolvedValue([]);
    dependencies.highlights.tags.mockResolvedValue(['evidence', 'retrieval']);
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router({ type: 'highlights.recent', limit: 3 }, { id: 'tracemark-extension' }),
    ).resolves.toEqual({ ok: true, data: [] });
    await expect(
      router({ type: 'tags.list', limit: 500 }, { id: 'tracemark-extension' }),
    ).resolves.toEqual({ ok: true, data: ['evidence', 'retrieval'] });
    expect(dependencies.highlights.recent).toHaveBeenCalledWith(3);
    expect(dependencies.highlights.tags).toHaveBeenCalledWith(500);
  });

  test('requires typed import confirmation and routes backup export/import', async () => {
    const dependencies = services();
    const backup = {
      format: 'json' as const,
      filename: 'tracemark-backup-2026-08-22.json',
      content: '{"format":"tracemark-backup"}',
    };
    dependencies.backups.exportJson.mockResolvedValue(backup);
    const importResult = {
      collections: 1,
      highlights: 0,
      aiResults: 0,
      created: { collections: 0, highlights: 0, aiResults: 0 },
      updated: { collections: 0, highlights: 0, aiResults: 0 },
      skipped: { collections: 1, highlights: 0, aiResults: 0 },
      regenerated: { collections: 0, highlights: 0, aiResults: 0 },
      rejected: { collections: 0, highlights: 0, aiResults: 0 },
    };
    dependencies.backups.importJson.mockResolvedValue(importResult);
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router({ type: 'backups.export', format: 'json' }, { id: 'tracemark-extension' }),
    ).resolves.toEqual({ ok: true, data: backup });
    await expect(
      router(
        { type: 'backups.import', content: backup.content, confirmed: false },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toMatchObject({ ok: false, code: 'INVALID_MESSAGE' });
    await expect(
      router(
        { type: 'backups.import', content: backup.content, confirmed: true },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toEqual({
      ok: true,
      data: importResult,
    });
  });

  test('updates AI settings without changing the saved theme', async () => {
    const dependencies = services();
    const settings = {
      id: 'settings' as const,
      schemaVersion: 1 as const,
      theme: 'dark' as const,
      ai: { provider: 'none' as const, model: 'llama3.2' },
    };
    const updated = {
      ...settings,
      ai: { provider: 'ollama' as const, model: 'llama3.2:latest' },
    };
    dependencies.preferences.get.mockResolvedValue(settings);
    dependencies.preferences.set.mockResolvedValue(updated);
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router(
        { type: 'settings.ai.set', provider: 'ollama', model: 'llama3.2:latest' },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toEqual({ ok: true, data: updated });

    expect(dependencies.preferences.set).toHaveBeenCalledWith(updated);
  });

  test('runs an allowed AI task for exactly the selected highlights', async () => {
    const dependencies = services();
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router(
        { type: 'ai.run', kind: 'summary', sourceHighlightIds: [selectedHighlightId] },
        { id: 'tracemark-extension' },
      ),
    ).resolves.toEqual({ ok: true, data: aiResult });

    expect(dependencies.ai.run).toHaveBeenCalledWith('summary', [selectedHighlightId]);
  });

  test('rejects malformed AI requests before dispatch', async () => {
    const dependencies = services();
    const router = createMessageRouter(dependencies, 'tracemark-extension');
    const tooManyIds = Array.from(
      { length: 21 },
      (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    );

    for (const message of [
      { type: 'ai.run', kind: 'summary', sourceHighlightIds: [] },
      {
        type: 'ai.run',
        kind: 'summary',
        sourceHighlightIds: [selectedHighlightId, selectedHighlightId],
      },
      { type: 'ai.run', kind: 'summary', sourceHighlightIds: tooManyIds },
      { type: 'ai.run', kind: 'summary', sourceHighlightIds: ['not-an-id'] },
      { type: 'ai.run', kind: 'summary', sourceHighlightIds: [selectedHighlightId], extra: true },
      { type: 'settings.ai.set', provider: 'ollama', model: '   ' },
      { type: 'settings.ai.set', provider: 'ollama', model: '<script>alert(1)</script>' },
      { type: 'settings.ai.set', provider: 'ollama', model: 'llama3.2', extra: true },
    ]) {
      await expect(router(message, { id: 'tracemark-extension' })).resolves.toMatchObject({
        ok: false,
        code: 'INVALID_MESSAGE',
      });
    }

    expect(dependencies.ai.run).not.toHaveBeenCalled();
    expect(dependencies.preferences.get).not.toHaveBeenCalled();
    expect(dependencies.preferences.set).not.toHaveBeenCalled();
  });

  test('rejects untrusted AI requests before dispatch', async () => {
    const dependencies = services();
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    await expect(
      router(
        { type: 'ai.run', kind: 'summary', sourceHighlightIds: [selectedHighlightId] },
        { id: 'other-extension' },
      ),
    ).resolves.toMatchObject({ ok: false, code: 'UNTRUSTED_SENDER' });

    expect(dependencies.ai.run).not.toHaveBeenCalled();
  });

  test.each([
    'AI_DISABLED',
    'AI_PERMISSION_REQUIRED',
    'AI_UNAVAILABLE',
    'AI_MODEL_UNAVAILABLE',
    'AI_TIMEOUT',
    'AI_INVALID_OUTPUT',
    'NOT_FOUND',
  ] as const)('maps %s to a safe typed response', async (code) => {
    const dependencies = services();
    dependencies.ai.run.mockRejectedValue(new AIAssistanceError(code, 'untrusted provider detail'));
    const router = createMessageRouter(dependencies, 'tracemark-extension');

    const response = await router(
      { type: 'ai.run', kind: 'summary', sourceHighlightIds: [selectedHighlightId] },
      { id: 'tracemark-extension' },
    );

    expect(response).toMatchObject({ ok: false, code });
    expect(response).not.toMatchObject({ message: 'untrusted provider detail' });
  });
});
