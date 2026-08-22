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
    highlights: { create: vi.fn(), get: vi.fn(), list: vi.fn().mockResolvedValue([]) },
    collections: { list: vi.fn().mockResolvedValue([]) },
    anchors: { apply: vi.fn() },
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
});
