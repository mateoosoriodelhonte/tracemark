import { describe, expect, test, vi } from 'vitest';
import { createLocalAIPermissionManager } from '../../src/core/local-ai-permissions';

const ollamaOrigin = 'http://127.0.0.1:11434/*';
const firefoxDataCollection = ['websiteContent', 'browsingActivity'];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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
  test('Chromium requests the exact optional origin synchronously without inspecting grants first', async () => {
    const pending = deferred<boolean>();
    const api = permissionApi();
    api.request.mockReturnValueOnce(pending.promise);
    const manager = createLocalAIPermissionManager(api, false);

    const result = manager.requestOrigin();

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request).toHaveBeenCalledWith({ origins: [ollamaOrigin] });
    expect(api.contains).not.toHaveBeenCalled();
    expect(api.getAll).not.toHaveBeenCalled();
    pending.resolve(true);
    await expect(result).resolves.toBe('granted');
  });

  test('Firefox requests both optional data types synchronously before any inspection', async () => {
    const pending = deferred<boolean>();
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockReturnValueOnce(pending.promise);
    const manager = createLocalAIPermissionManager(api, true);

    const result = manager.requestDataCollection();

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request).toHaveBeenCalledWith({ data_collection: firefoxDataCollection });
    expect(api.contains).not.toHaveBeenCalled();
    expect(api.getAll).not.toHaveBeenCalled();
    pending.resolve(true);
    await expect(result).resolves.toBe('granted');
  });

  test('Firefox origin access requires a separate method call and a second synchronous request', async () => {
    const dataRequest = deferred<boolean>();
    const originRequest = deferred<boolean>();
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockReturnValueOnce(dataRequest.promise).mockReturnValueOnce(originRequest.promise);
    const manager = createLocalAIPermissionManager(api, true);

    const dataResult = manager.requestDataCollection();
    expect(api.request).toHaveBeenCalledTimes(1);
    dataRequest.resolve(true);
    await expect(dataResult).resolves.toBe('granted');
    expect(api.request).toHaveBeenCalledTimes(1);

    const originResult = manager.requestOrigin();
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(api.request).toHaveBeenLastCalledWith({ origins: [ollamaOrigin] });
    expect(api.contains).not.toHaveBeenCalled();
    expect(api.getAll).not.toHaveBeenCalled();
    originRequest.resolve(true);
    await expect(originResult).resolves.toBe('granted');
  });

  test('Firefox cannot request the origin before the explicit data-consent step', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.requestOrigin()).resolves.toBe('cleanup-required');

    expect(api.request).not.toHaveBeenCalled();
  });

  test('Firefox reports unsupported data consent when the browser rejects that request shape', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockRejectedValueOnce(new Error('Unexpected property data_collection'));
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.requestDataCollection()).resolves.toBe('unsupported');

    expect(api.request).toHaveBeenCalledWith({ data_collection: firefoxDataCollection });
  });

  test('Firefox denial leaves the second prompt unavailable and rollback removes nothing', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(false);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.requestDataCollection()).resolves.toBe('denied');
    await expect(manager.requestOrigin()).resolves.toBe('cleanup-required');
    await expect(manager.rollbackRequest()).resolves.toBe(true);

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.remove).not.toHaveBeenCalled();
  });

  test('Firefox rolls back both data types when the separately requested origin is denied', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.requestDataCollection()).resolves.toBe('granted');
    await expect(manager.requestOrigin()).resolves.toBe('denied');
    await expect(manager.rollbackRequest()).resolves.toBe(true);

    expect(api.remove).toHaveBeenCalledOnce();
    expect(api.remove).toHaveBeenCalledWith({ data_collection: firefoxDataCollection });
  });

  test('Firefox retains a failed rollback for an explicit cleanup retry', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.request.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    api.remove.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.requestDataCollection()).resolves.toBe('granted');
    await expect(manager.requestOrigin()).resolves.toBe('denied');
    await expect(manager.rollbackRequest()).resolves.toBe(false);
    await expect(manager.requestDataCollection()).resolves.toBe('cleanup-required');
    await expect(manager.rollbackRequest()).resolves.toBe(true);

    expect(api.remove).toHaveBeenCalledTimes(2);
    expect(api.request).toHaveBeenCalledTimes(2);
  });

  test('a reload detects partial Firefox consent and requires cleanup instead of continuing', async () => {
    const api = permissionApi({
      origins: [],
      permissions: [],
      data_collection: firefoxDataCollection,
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.hasAny()).resolves.toBe(true);
    await expect(manager.requestDataCollection()).resolves.toBe('cleanup-required');

    expect(api.request).not.toHaveBeenCalled();
  });

  test('Chromium reports unknown when origin permission inspection fails', async () => {
    const api = permissionApi();
    api.contains.mockRejectedValue(new Error('permission API failed'));
    const manager = createLocalAIPermissionManager(api, false);

    await expect(manager.hasAny()).rejects.toThrow('permission API failed');
  });

  test('Firefox reports unknown when origin permission inspection fails', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.contains.mockRejectedValue(new Error('origin inspection failed'));
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.hasAny()).rejects.toThrow('origin inspection failed');
    expect(api.getAll).not.toHaveBeenCalled();
  });

  test('Firefox reports unknown when data-consent inspection fails', async () => {
    const api = permissionApi({ origins: [], permissions: [], data_collection: [] });
    api.getAll.mockRejectedValue(new Error('data consent inspection failed'));
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.hasAny()).rejects.toThrow('data consent inspection failed');
  });

  test('a failed reconciliation blocks a later request from accepting an unknown residual grant', async () => {
    const api = permissionApi();
    api.contains.mockRejectedValueOnce(new Error('permission API failed'));
    const manager = createLocalAIPermissionManager(api, false);

    await expect(manager.hasAny()).rejects.toThrow('permission API failed');
    await expect(manager.requestOrigin()).resolves.toBe('cleanup-required');

    expect(api.request).not.toHaveBeenCalled();
  });

  test('unknown inspection can be cleaned up and a later request starts from a reset state', async () => {
    const api = permissionApi();
    api.contains
      .mockRejectedValueOnce(new Error('permission API failed'))
      .mockResolvedValueOnce(false);
    const manager = createLocalAIPermissionManager(api, false);

    await expect(manager.hasAny()).rejects.toThrow('permission API failed');
    await expect(manager.remove()).resolves.toBe(true);
    await expect(manager.requestOrigin()).resolves.toBe('granted');

    expect(api.request).toHaveBeenCalledOnce();
    expect(api.request).toHaveBeenCalledWith({ origins: [ollamaOrigin] });
  });

  test('Firefox rejects use when either declared data type is revoked externally', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: ['websiteContent'],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.has()).resolves.toBe(false);
  });

  test('Firefox removes the origin and both data types with separate calls', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: firefoxDataCollection,
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.remove()).resolves.toBe(true);

    expect(api.remove.mock.calls).toEqual([
      [{ origins: [ollamaOrigin] }],
      [{ data_collection: firefoxDataCollection }],
    ]);
  });

  test('Firefox removes both declared data types when only one residual type is visible', async () => {
    const api = permissionApi({
      origins: [],
      permissions: [],
      data_collection: ['browsingActivity'],
    });
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.remove()).resolves.toBe(true);

    expect(api.remove).toHaveBeenCalledWith({ data_collection: firefoxDataCollection });
  });

  test('Firefox still removes data consent when origin removal fails', async () => {
    const api = permissionApi({
      origins: [ollamaOrigin],
      permissions: [],
      data_collection: firefoxDataCollection,
    });
    api.remove
      .mockRejectedValueOnce(new Error('origin removal failed'))
      .mockResolvedValueOnce(true);
    const manager = createLocalAIPermissionManager(api, true);

    await expect(manager.remove()).resolves.toBe(false);

    expect(api.remove.mock.calls).toEqual([
      [{ origins: [ollamaOrigin] }],
      [{ data_collection: firefoxDataCollection }],
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
