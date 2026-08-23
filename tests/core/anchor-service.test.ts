import { describe, expect, test, vi } from 'vitest';
import { AnchorService } from '../../src/core/anchor';
import { makeHighlight } from '../helpers/fixtures';

describe('AnchorService', () => {
  test('validates the active source before injecting and sends only a TextQuote selector', async () => {
    const executeScript = vi.fn().mockResolvedValue([{ frameId: 0, result: { status: 'ready' } }]);
    const sendMessage = vi.fn().mockResolvedValue({ status: 'marked', count: 1 });
    const service = new AnchorService({
      queryActiveTabs: vi
        .fn()
        .mockResolvedValue([{ id: 42, url: 'https://example.com/article#section' }]),
      executeScript,
      sendMessage,
    });
    const highlight = makeHighlight();

    await expect(service.apply(highlight)).resolves.toEqual({ status: 'marked', count: 1 });
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ['/content-scripts/anchor.js'],
    });
    expect(sendMessage).toHaveBeenCalledWith(
      42,
      {
        type: 'tracemark.anchor.apply',
        selector: {
          exact: highlight.quote,
          prefix: highlight.prefix,
          suffix: highlight.suffix,
        },
      },
      { frameId: 0 },
    );
  });

  test('refuses to inject on a different source page', async () => {
    const executeScript = vi.fn();
    const service = new AnchorService({
      queryActiveTabs: vi.fn().mockResolvedValue([{ id: 42, url: 'https://other.example/' }]),
      executeScript,
      sendMessage: vi.fn(),
    });

    await expect(service.apply(makeHighlight())).rejects.toMatchObject({
      code: 'WRONG_PAGE',
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  test('turns a fresh-tab injection denial into actionable activeTab recovery guidance', async () => {
    const service = new AnchorService({
      queryActiveTabs: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/article' }]),
      executeScript: vi.fn().mockRejectedValue(new Error('Missing host permission')),
      sendMessage: vi.fn(),
    });

    await expect(service.apply(makeHighlight())).rejects.toMatchObject({
      code: 'UNSUPPORTED_PAGE',
      message:
        'TraceMark cannot access this fresh tab yet. Invoke the TraceMark toolbar action or press Alt+Shift+S on this tab, then retry Mark on page. Browser-protected pages cannot be highlighted.',
    });
  });

  test('guides a fresh tab whose URL is hidden until activeTab is granted', async () => {
    const executeScript = vi.fn();
    const service = new AnchorService({
      queryActiveTabs: vi.fn().mockResolvedValue([{ id: 42 }]),
      executeScript,
      sendMessage: vi.fn(),
    });

    await expect(service.apply(makeHighlight())).rejects.toMatchObject({
      code: 'UNSUPPORTED_PAGE',
      message:
        'TraceMark cannot access this fresh tab yet. Invoke the TraceMark toolbar action or press Alt+Shift+S on this tab, then retry Mark on page. Browser-protected pages cannot be highlighted.',
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  test('rejects malformed content-script results at the privileged boundary', async () => {
    const service = new AnchorService({
      queryActiveTabs: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/article' }]),
      executeScript: vi.fn().mockResolvedValue([{ frameId: 0, result: { status: 'ready' } }]),
      sendMessage: vi.fn().mockResolvedValue({ status: 'marked', count: 'all' }),
    });

    await expect(service.apply(makeHighlight())).rejects.toMatchObject({
      code: 'INVALID_ANCHOR_RESULT',
    });
  });
});
