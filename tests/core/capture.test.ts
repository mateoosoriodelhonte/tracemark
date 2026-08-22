import { describe, expect, test, vi } from 'vitest';
import { CaptureService } from '../../src/core/capture';

const captured = {
  status: 'captured' as const,
  value: {
    quote: 'Exact quote',
    prefix: 'Before ',
    suffix: ' after',
    title: 'Article',
    url: 'https://example.com/article',
  },
};

describe('CaptureService', () => {
  test('executes the runtime-only capture script in an explicitly selected child frame', async () => {
    const executeScript = vi.fn().mockResolvedValue([{ frameId: 7, result: captured }]);
    const service = new CaptureService({ executeScript, queryActiveTabs: vi.fn() });

    await expect(service.captureTab(42, 7)).resolves.toEqual(captured.value);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42, frameIds: [7] },
      files: ['/content-scripts/capture.js'],
    });
  });

  test('targets only the top frame when the initiating gesture has no frame identifier', async () => {
    const executeScript = vi.fn().mockResolvedValue([{ frameId: 0, result: captured }]);
    const service = new CaptureService({ executeScript, queryActiveTabs: vi.fn() });

    await expect(service.captureTab(42)).resolves.toEqual(captured.value);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ['/content-scripts/capture.js'],
    });
  });

  test('returns typed errors for empty selections, malformed script results, and blocked pages', async () => {
    const noSelection = new CaptureService({
      executeScript: vi
        .fn()
        .mockResolvedValue([{ frameId: 0, result: { status: 'no-selection' } }]),
      queryActiveTabs: vi.fn(),
    });
    await expect(noSelection.captureTab(1)).rejects.toMatchObject({
      code: 'NO_SELECTION',
    });

    const malformed = new CaptureService({
      executeScript: vi.fn().mockResolvedValue([{ frameId: 0, result: { quote: '<script>' } }]),
      queryActiveTabs: vi.fn(),
    });
    await expect(malformed.captureTab(1)).rejects.toMatchObject({
      code: 'INVALID_CAPTURE',
    });

    const blocked = new CaptureService({
      executeScript: vi.fn().mockRejectedValue(new Error('Cannot access a chrome:// URL')),
      queryActiveTabs: vi.fn(),
    });
    await expect(blocked.captureTab(1)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PAGE',
    });
  });

  test('captures the active tab only when a valid tab identifier is available', async () => {
    const executeScript = vi.fn().mockResolvedValue([{ frameId: 0, result: captured }]);
    const service = new CaptureService({
      executeScript,
      queryActiveTabs: vi.fn().mockResolvedValue([{ id: 91 }]),
    });

    await expect(service.captureActiveTab()).resolves.toEqual(captured.value);
  });
});
