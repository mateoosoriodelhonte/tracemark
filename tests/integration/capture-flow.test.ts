import { describe, expect, test, vi } from 'vitest';
import { INBOX_COLLECTION_ID } from '../../src/domain/constants';
import { createCaptureActions } from '../../src/core/capture';

describe('gesture-driven quick save', () => {
  test('saves a context-menu selection to Inbox with no fabricated annotations', async () => {
    const capture = {
      quote: 'Exact quote',
      prefix: 'Before ',
      suffix: ' after',
      heading: 'Evidence',
      title: 'Article',
      url: 'https://example.com/article',
    };
    const captureTab = vi.fn().mockResolvedValue(capture);
    const create = vi.fn().mockResolvedValue({ id: 'saved-highlight' });
    const actions = createCaptureActions({ captureTab }, { create });

    await expect(actions.saveTabSelection(42, 7)).resolves.toEqual({ id: 'saved-highlight' });
    expect(captureTab).toHaveBeenCalledWith(42, 7);
    expect(create).toHaveBeenCalledWith({
      ...capture,
      collectionId: INBOX_COLLECTION_ID,
      tags: [],
      note: '',
    });
  });
});
