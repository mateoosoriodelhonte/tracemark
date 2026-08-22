import { CURRENT_SCHEMA_VERSION } from '../domain/constants';
import type { Settings } from '../domain/models';
import { SettingsSchema } from '../domain/schemas';

const SETTINGS_KEY = 'settings';

export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_KEY,
  schemaVersion: CURRENT_SCHEMA_VERSION,
  theme: 'system',
  ai: {
    provider: 'none',
    model: 'llama3.2',
  },
};

export class PreferencesStore {
  constructor(private readonly storage: StorageArea) {}

  async get(): Promise<Settings> {
    const stored = (await this.storage.get(SETTINGS_KEY))[SETTINGS_KEY];
    const result = SettingsSchema.safeParse(stored);
    return SettingsSchema.parse(result.success ? result.data : DEFAULT_SETTINGS);
  }

  async set(input: unknown): Promise<Settings> {
    const settings = SettingsSchema.parse(input);
    await this.storage.set({ [SETTINGS_KEY]: settings });
    return SettingsSchema.parse(settings);
  }
}
