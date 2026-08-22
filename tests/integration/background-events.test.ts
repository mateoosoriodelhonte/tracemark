import { describe, expect, test, vi } from 'vitest';
import { CAPTURE_MENU_ID, createBackgroundHandlers } from '../../src/core/background-controller';

describe('background browser events', () => {
  test('installs a selection-only context menu', () => {
    const createSelectionMenu = vi.fn();
    const handlers = createBackgroundHandlers({
      createSelectionMenu,
      saveTabSelection: vi.fn(),
      routeMessage: vi.fn(),
    });

    handlers.installed();

    expect(createSelectionMenu).toHaveBeenCalledWith({
      id: CAPTURE_MENU_ID,
      title: 'Save selection to TraceMark',
      contexts: ['selection'],
    });
  });

  test('routes context-menu frame and keyboard gestures to quick-save', async () => {
    const saveTabSelection = vi.fn().mockResolvedValue(undefined);
    const handlers = createBackgroundHandlers({
      createSelectionMenu: vi.fn(),
      saveTabSelection,
      routeMessage: vi.fn(),
    });

    await handlers.contextMenuClicked({ menuItemId: CAPTURE_MENU_ID, frameId: 8 }, { id: 42 });
    await handlers.command('save-selection', { id: 43 });

    expect(saveTabSelection).toHaveBeenNthCalledWith(1, 42, 8);
    expect(saveTabSelection).toHaveBeenNthCalledWith(2, 43);
  });

  test('ignores unrelated events and forwards runtime messages without mutation', async () => {
    const saveTabSelection = vi.fn();
    const routeMessage = vi.fn().mockResolvedValue({ ok: false, code: 'INVALID_MESSAGE' });
    const handlers = createBackgroundHandlers({
      createSelectionMenu: vi.fn(),
      saveTabSelection,
      routeMessage,
    });
    const message = { type: 'capture.current' };
    const sender = { id: 'tracemark' };

    await handlers.contextMenuClicked({ menuItemId: 'someone-else' }, { id: 42 });
    await handlers.command('other-command', { id: 42 });
    await expect(handlers.message(message, sender)).resolves.toEqual({
      ok: false,
      code: 'INVALID_MESSAGE',
    });

    expect(saveTabSelection).not.toHaveBeenCalled();
    expect(routeMessage).toHaveBeenCalledWith(message, sender);
  });
});
