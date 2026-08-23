export type SchemaVersion = 1;

export type CollectionStatus = 'active' | 'archived';
export type ThemePreference = 'system' | 'light' | 'dark';
export type AIProviderName = 'none' | 'ollama';
export type AIResultKind = 'summary' | 'explanation' | 'tags' | 'overview';
export type AIProviderErrorCode =
  'AI_DISABLED' | 'AI_UNAVAILABLE' | 'AI_MODEL_UNAVAILABLE' | 'AI_TIMEOUT' | 'AI_INVALID_OUTPUT';

export interface Highlight {
  id: string;
  schemaVersion: SchemaVersion;
  quote: string;
  prefix: string;
  suffix: string;
  heading?: string;
  context?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  hostname: string;
  collectionId: string;
  tags: string[];
  note: string;
  searchText: string;
  searchTokens: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  schemaVersion: SchemaVersion;
  name: string;
  normalizedName: string;
  status: CollectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: 'settings';
  schemaVersion: SchemaVersion;
  theme: ThemePreference;
  ai: {
    provider: AIProviderName;
    model: string;
  };
}

export interface AIResult {
  id: string;
  schemaVersion: SchemaVersion;
  kind: AIResultKind;
  provider: 'ollama';
  sourceHighlightIds: string[];
  content: string;
  createdAt: string;
}

export interface CaptureResult {
  quote: string;
  prefix: string;
  suffix: string;
  heading?: string;
  context?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
}

export type SearchableHighlight = Pick<Highlight, 'quote' | 'title' | 'hostname' | 'note' | 'tags'>;
