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
    highlights: { create: vi.fn(), list: vi.fn().mockResolvedValue([]) },
    collections: { list: vi.fn().mockResolvedValue([]) },
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
});
