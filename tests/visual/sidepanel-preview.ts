import { mount } from 'svelte';
import type { MessageRequest, MessageResponse } from '../../src/messaging/protocol';
import App from '../../src/entrypoints/sidepanel/App.svelte';
import type { Collection, Highlight, Settings } from '../../src/domain/models';

const inbox: Collection = {
  id: '00000000-0000-4000-8000-000000000001',
  schemaVersion: 1,
  name: 'Inbox',
  normalizedName: 'inbox',
  status: 'active',
  createdAt: '2026-08-22T06:00:00.000Z',
  updatedAt: '2026-08-22T06:00:00.000Z',
};
const collection: Collection = {
  ...inbox,
  id: '8e6469f9-77ab-41dd-9df6-618c4821f15b',
  name: 'RAG Research',
  normalizedName: 'rag research',
};
const settings: Settings = {
  id: 'settings',
  schemaVersion: 1,
  theme: 'system',
  ai: { provider: 'ollama', model: 'llama3.2' },
};
const research: Highlight[] = [
  {
    id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
    schemaVersion: 1,
    quote: 'Retrieval quality matters more than raw context-window size.',
    prefix: 'The evidence suggests ',
    suffix: ' This changes evaluation.',
    title: 'Evaluating Retrieval Systems',
    url: 'https://example.com/retrieval',
    canonicalUrl: 'https://example.com/retrieval',
    hostname: 'example.com',
    collectionId: collection.id,
    tags: ['rag', 'retrieval'],
    note: 'Compare this claim with the primary benchmark methodology.',
    searchText: 'retrieval quality rag research benchmark',
    searchTokens: ['retrieval', 'quality', 'rag', 'research', 'benchmark'],
    createdAt: '2026-08-22T06:00:00.000Z',
    updatedAt: '2026-08-22T06:00:00.000Z',
  },
  {
    id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
    schemaVersion: 1,
    quote:
      'A durable research trail records the claim, the surrounding context, and where it came from.',
    prefix: 'For knowledge work, ',
    suffix: ' That trail should remain portable.',
    title: 'Notes on Evidence and Provenance',
    url: 'https://example.org/evidence',
    hostname: 'example.org',
    collectionId: inbox.id,
    tags: ['evidence', 'provenance'],
    note: '',
    searchText: 'durable research trail evidence provenance inbox',
    searchTokens: ['durable', 'research', 'trail', 'evidence', 'provenance', 'inbox'],
    createdAt: '2026-08-21T06:00:00.000Z',
    updatedAt: '2026-08-21T06:00:00.000Z',
  },
];

async function request(message: MessageRequest): Promise<MessageResponse> {
  switch (message.type) {
    case 'settings.get':
      return { ok: true, data: settings };
    case 'settings.theme.set':
      settings.theme = message.theme;
      return { ok: true, data: settings };
    case 'settings.ai.set':
      settings.ai = { provider: message.provider, model: message.model };
      return { ok: true, data: settings };
    case 'ai.run':
      return {
        ok: true,
        data: {
          id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
          schemaVersion: 1,
          kind: message.kind,
          provider: 'ollama',
          sourceHighlightIds: message.sourceHighlightIds,
          content:
            message.kind === 'tags'
              ? 'retrieval, evidence, evaluation'
              : 'The selected notes emphasize preserving provenance while evaluating retrieval quality.',
          ...(message.kind === 'tags'
            ? { suggestedTags: ['retrieval', 'evidence', 'evaluation'] }
            : {}),
          createdAt: '2026-08-22T18:00:00.000Z',
        },
      };
    case 'collections.list':
      return { ok: true, data: [inbox, collection] };
    case 'research.search':
      return { ok: true, data: research };
    case 'tags.list':
      return { ok: true, data: ['evidence', 'provenance', 'rag', 'retrieval'] };
    case 'highlights.recent':
      return { ok: true, data: research.slice(0, message.limit) };
    case 'highlights.update':
      return { ok: true, data: { ...research[0]!, ...message.input } };
    case 'collections.create':
    case 'collections.rename':
    case 'collections.archive':
      return { ok: true, data: collection };
    case 'highlights.delete':
    case 'collections.delete':
      return { ok: true, data: { status: 'deleted' } };
    case 'anchors.apply':
      return { ok: true, data: { status: 'marked', count: 1 } };
    case 'backups.export':
      return {
        ok: true,
        data: { format: message.format, filename: 'tracemark-preview.json', content: '{}' },
      };
    case 'backups.import':
      return {
        ok: true,
        data: {
          collections: 2,
          highlights: 2,
          aiResults: 0,
          created: { collections: 1, highlights: 2, aiResults: 0 },
          updated: { collections: 0, highlights: 0, aiResults: 0 },
          skipped: { collections: 1, highlights: 0, aiResults: 0 },
          regenerated: { collections: 0, highlights: 0, aiResults: 0 },
          rejected: { collections: 0, highlights: 0, aiResults: 0 },
        },
      };
    case 'capture.current':
      return { ok: false, code: 'NO_SELECTION', message: 'No selection' };
    case 'highlights.create':
      return { ok: true, data: research[0]! };
  }
}

mount(App, {
  target: document.getElementById('app')!,
  props: {
    request,
    requestOllamaPermission: async () => true,
    removeOllamaPermission: async () => true,
  },
});
