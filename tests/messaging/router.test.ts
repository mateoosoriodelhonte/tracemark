import { describe, expect, test, vi } from 'vitest';
import { createMessageRouter } from '../../src/messaging/router';

const capture = {
  quote: 'Exact quote',
  prefix: 'Before ',
  suffix: ' after',
  title: 'Article',
  url: 'https://example.com/article',
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
});
