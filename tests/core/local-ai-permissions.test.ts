import { describe, expect, test, vi } from 'vitest';
import { createLocalAIPermissionManager } from '../../src/core/local-ai-permissions';

const ollamaOrigin = 'http://127.0.0.1:11434/*';

function permissionApi(
  granted: { origins?: string[]; permissions?: string[]; data_collection?: string[] } = {
    origins: [],
    permissions: [],
  },
) {
  return {
    getAll: vi.fn().mockResolvedValue(granted),
    contains: vi.fn().mockResolvedValue(granted.origins?.includes(ollamaOrigin) ?? false),
    request: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
  };
}

describe('local AI browser permissions', () => {
  test('Chromium requests only the optional Ollama origin', async () => {
    const api = permissionApi();
    const manager = createLocalAIPermissionManager(api, false);

    await expect(manager.request()).resolves.toBe('granted');

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request).toHaveBeenCalledWith({ origins: [ollamaOrigin] });
    expect(api.getAll).not.toHaveBeenCalled();
    expect(api.contains).toHaveBeenCalledWith({ origins: [ollamaOrigin] });
  });

  test('Firefox fails closed when data-collection consent cannot be feature-detected', async () => {
    const api = permissionApi({ origins: [], permissions: [] });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('unsupported');

    expect(api.request).not.toHaveBeenCalled();
  });

  test('Firefox requests website content and origin grants separately', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('granted');

    expect(api.request.mock.calls).toEqual([
      [{ data_collection: ['websiteContent'] }],
      [{ origins: [ollamaOrigin] }],
    ]);
  });

  test('Firefox rolls back newly granted website consent when origin access is denied', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('denied');

    expect(api.remove).toHaveBeenCalledOnce();
    expect(api.remove).toHaveBeenCalledWith({ data_collection: ['websiteContent'] });
  });

  test('Firefox retains a failed denial rollback for an explicit retry', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    api.remove.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('denied');
    await expect(manager.rollbackRequest()).resolves.toBe(true);

    expect(api.remove).toHaveBeenCalledTimes(2);
    expect(api.remove).toHaveBeenLastCalledWith({ data_collection: ['websiteContent'] });
  });

  test('a new enable attempt cannot erase an outstanding failed rollback', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    api.remove.mockResolvedValue(false);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('denied');
    await expect(manager.request()).resolves.toBe('cleanup-required');

    expect(api.request).toHaveBeenCalledTimes(2);
    expect(api.remove).toHaveBeenCalledOnce();
  });

  test('a new manager detects residual Firefox consent while local AI is disabled', async () => {
    const api = permissionApi({
      origins: [],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.hasAny()).resolves.toBe(true);

    expect(api.remove).not.toHaveBeenCalled();
  });

  test('Firefox preserves pre-existing website consent when origin access is denied', async () => {
    const api = permissionApi({
      origins: [],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    api.request.mockResolvedValue(false);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('denied');

    expect(api.remove).not.toHaveBeenCalled();
  });

  test('rollback after a downstream failure removes only grants acquired by this request', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.request()).resolves.toBe('granted');
    await expect(manager.rollbackRequest()).resolves.toBe(true);

    expect(api.request).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });

  test('Firefox rejects use after website-content consent is revoked externally', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: [],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.has()).resolves.toBe(false);

    expect(api.contains).toHaveBeenCalledWith({ origins: [ollamaOrigin] });
  });

  test('Firefox removes the origin and data grant with separate calls', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.remove()).resolves.toBe(true);

    expect(api.remove.mock.calls).toEqual([
      [{ origins: [ollamaOrigin] }],
      [{ data_collection: ['websiteContent'] }],
    ]);
  });

  test('Firefox still removes website consent when origin removal fails', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    api.remove
      .mockRejectedValueOnce(new Error('origin removal failed'))
      .mockResolvedValueOnce(true);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.remove()).resolves.toBe(false);

    expect(api.remove.mock.calls).toEqual([
      [{ origins: [ollamaOrigin] }],
      [{ data_collection: ['websiteContent'] }],
    ]);
  });

  test('reports removal failure when the browser grant cannot be inspected', async () => {
    const api = permissionApi();
    api.contains.mockRejectedValue(new Error('permission API failed'));
    const manager = createLocalAIPermissionManager(api, false);

    await expect(manager.remove()).resolves.toBe(false);

    expect(api.remove).not.toHaveBeenCalled();
  });
});
