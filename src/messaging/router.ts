import type { Highlight } from '../domain/models';
import { AIAssistanceError, type AIAssistanceService } from '../core/ai-assistance';
import { AnchorError } from '../core/anchor';
import type { AnchorService } from '../core/anchor';
import { BackupError, type BackupService } from '../core/backups';
import { CaptureError } from '../core/capture';
import type { CaptureService } from '../core/capture';
import type { CreateHighlightInput, UpdateHighlightInput } from '../core/highlights';
import type { CollectionService } from '../core/collections';
import type { SearchService } from '../core/search';
import type { PreferencesStore } from '../storage/preferences';
import { RequestSchema, ResponseSchema, type MessageResponse } from './protocol';

export interface MessageSenderLike {
  id?: string;
}

export interface RouterServices {
  capture: Pick<CaptureService, 'captureActiveTab'>;
  highlights: {
    create(input: CreateHighlightInput): Promise<Highlight>;
    get(id: string): Promise<Highlight | undefined>;
    recent(limit: number): Promise<Highlight[]>;
    tags(limit: number): Promise<string[]>;
    update(id: string, input: UpdateHighlightInput): Promise<Highlight>;
    remove(id: string): Promise<void>;
  };
  collections: Pick<CollectionService, 'list' | 'create' | 'rename' | 'archive' | 'remove'>;
  anchors: Pick<AnchorService, 'apply'>;
  search: Pick<SearchService, 'run'>;
  preferences: Pick<PreferencesStore, 'get' | 'set'>;
  backups: Pick<BackupService, 'exportJson' | 'exportMarkdown' | 'importJson'>;
  ai: Pick<AIAssistanceService, 'run'>;
}

type ErrorCode = Extract<MessageResponse, { ok: false }>['code'];

function errorResponse(code: ErrorCode, message: string): MessageResponse {
  return ResponseSchema.parse({ ok: false, code, message });
}

const AI_ERROR_MESSAGES = {
  AI_DISABLED: 'Local AI is disabled',
  AI_PERMISSION_REQUIRED: 'Local AI permission is required',
  AI_UNAVAILABLE: 'Local AI is unavailable',
  AI_MODEL_UNAVAILABLE: 'The selected local AI model is unavailable',
  AI_TIMEOUT: 'Local AI did not respond in time',
  AI_INVALID_OUTPUT: 'Local AI returned invalid output',
  NOT_FOUND: 'Selected research was not found',
} as const;

export function createMessageRouter(services: RouterServices, runtimeId: string) {
  return async (message: unknown, sender: MessageSenderLike): Promise<MessageResponse> => {
    if (sender.id !== runtimeId) {
      return errorResponse('UNTRUSTED_SENDER', 'The message sender is not TraceMark');
    }

    const request = RequestSchema.safeParse(message);
    if (!request.success) return errorResponse('INVALID_MESSAGE', 'The message is not valid');

    try {
      switch (request.data.type) {
        case 'capture.current':
          return ResponseSchema.parse({
            ok: true,
            data: await services.capture.captureActiveTab(),
          });
        case 'highlights.create':
          return ResponseSchema.parse({
            ok: true,
            data: await services.highlights.create(request.data.input),
          });
        case 'highlights.update':
          return ResponseSchema.parse({
            ok: true,
            data: await services.highlights.update(request.data.highlightId, request.data.input),
          });
        case 'highlights.delete':
          await services.highlights.remove(request.data.highlightId);
          return ResponseSchema.parse({ ok: true, data: { status: 'deleted' } });
        case 'highlights.recent':
          return ResponseSchema.parse({
            ok: true,
            data: await services.highlights.recent(request.data.limit),
          });
        case 'tags.list':
          return ResponseSchema.parse({
            ok: true,
            data: await services.highlights.tags(request.data.limit),
          });
        case 'research.search':
          return ResponseSchema.parse({
            ok: true,
            data: await services.search.run(request.data.input),
          });
        case 'collections.list':
          return ResponseSchema.parse({
            ok: true,
            data: await services.collections.list({
              includeArchived: request.data.includeArchived ?? false,
            }),
          });
        case 'collections.create':
          return ResponseSchema.parse({
            ok: true,
            data: await services.collections.create(request.data.name),
          });
        case 'collections.rename':
          return ResponseSchema.parse({
            ok: true,
            data: await services.collections.rename(request.data.collectionId, request.data.name),
          });
        case 'collections.archive':
          return ResponseSchema.parse({
            ok: true,
            data: await services.collections.archive(
              request.data.collectionId,
              request.data.archived,
            ),
          });
        case 'collections.delete':
          await services.collections.remove(request.data.collectionId, request.data.confirmed);
          return ResponseSchema.parse({ ok: true, data: { status: 'deleted' } });
        case 'anchors.apply': {
          const highlight = await services.highlights.get(request.data.highlightId);
          if (highlight === undefined) {
            return errorResponse('NOT_FOUND', 'The saved highlight does not exist');
          }
          return ResponseSchema.parse({ ok: true, data: await services.anchors.apply(highlight) });
        }
        case 'settings.get':
          return ResponseSchema.parse({ ok: true, data: await services.preferences.get() });
        case 'settings.theme.set': {
          const settings = await services.preferences.get();
          return ResponseSchema.parse({
            ok: true,
            data: await services.preferences.set({ ...settings, theme: request.data.theme }),
          });
        }
        case 'settings.ai.set': {
          const settings = await services.preferences.get();
          return ResponseSchema.parse({
            ok: true,
            data: await services.preferences.set({
              ...settings,
              ai: { provider: request.data.provider, model: request.data.model },
            }),
          });
        }
        case 'ai.run':
          return ResponseSchema.parse({
            ok: true,
            data: await services.ai.run(request.data.kind, request.data.sourceHighlightIds),
          });
        case 'backups.export':
          return ResponseSchema.parse({
            ok: true,
            data:
              request.data.format === 'json'
                ? await services.backups.exportJson()
                : await services.backups.exportMarkdown(request.data.collectionId),
          });
        case 'backups.import':
          return ResponseSchema.parse({
            ok: true,
            data: await services.backups.importJson(request.data.content, request.data.confirmed),
          });
      }
    } catch (error) {
      if (error instanceof CaptureError) return errorResponse(error.code, error.message);
      if (error instanceof AnchorError) return errorResponse(error.code, error.message);
      if (error instanceof BackupError) return errorResponse('INVALID_BACKUP', error.message);
      if (error instanceof AIAssistanceError) {
        return errorResponse(error.code, AI_ERROR_MESSAGES[error.code]);
      }
      return errorResponse('INTERNAL_ERROR', 'TraceMark could not complete the request');
    }
  };
}
