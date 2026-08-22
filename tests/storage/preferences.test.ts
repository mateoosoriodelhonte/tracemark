import { describe, expect, test } from 'vitest';
import { PreferencesStore, type StorageArea } from '../../src/storage/preferences';

class MemoryStorage implements StorageArea {
  values: Record<string, unknown> = {};

  async get(key: string): Promise<Record<string, unknown>> {
    return { [key]: this.values[key] };
  }

  async set(values: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, values);
  }
}

describe('PreferencesStore', () => {
  test('returns private defaults when settings are absent or malformed', async () => {
    const storage = new MemoryStorage();
    const preferences = new PreferencesStore(storage);

    expect(await preferences.get()).toEqual({
      id: 'settings',
      schemaVersion: 1,
      theme: 'system',
      ai: { provider: 'none', model: 'llama3.2' },
    });

    storage.values.settings = { theme: 'neon', ai: { provider: 'cloud' } };
    expect(await preferences.get()).toEqual({
      id: 'settings',
      schemaVersion: 1,
      theme: 'system',
      ai: { provider: 'none', model: 'llama3.2' },
    });
  });

  test('validates before persisting explicit settings', async () => {
    const storage = new MemoryStorage();
    const preferences = new PreferencesStore(storage);
    const settings = {
      id: 'settings',
      schemaVersion: 1 as const,
      theme: 'dark' as const,
      ai: { provider: 'ollama' as const, model: 'qwen3:4b' },
    };

    await preferences.set(settings);
    expect(await preferences.get()).toEqual(settings);
    await expect(preferences.set({ ...settings, theme: 'neon' })).rejects.toThrow();
  });
});
