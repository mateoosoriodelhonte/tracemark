import type { Collection, Highlight } from '../domain/models';
import { AnchorError } from '../core/anchor';
import type { AnchorService } from '../core/anchor';
import { CaptureError } from '../core/capture';
import type { CaptureService } from '../core/capture';
import type { CreateHighlightInput } from '../core/highlights';
import type { CollectionService } from '../core/collections';
import { RequestSchema, ResponseSchema, type MessageResponse } from './protocol';

export interface MessageSenderLike {
  id?: string;
}

export interface RouterServices {
  capture: Pick<CaptureService, 'captureActiveTab'>;
  highlights: {
    create(input: CreateHighlightInput): Promise<Highlight>;
    get(id: string): Promise<Highlight | undefined>;
    list(): Promise<Highlight[]>;
  };
  collections: Pick<CollectionService, 'list'> | { list(): Promise<Collection[]> };
  anchors: Pick<AnchorService, 'apply'>;
}

type ErrorCode = Extract<MessageResponse, { ok: false }>['code'];

function errorResponse(code: ErrorCode, message: string): MessageResponse {
  return ResponseSchema.parse({ ok: false, code, message });
}

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
        case 'highlights.list':
          return ResponseSchema.parse({ ok: true, data: await services.highlights.list() });
        case 'collections.list':
          return ResponseSchema.parse({ ok: true, data: await services.collections.list() });
        case 'anchors.apply': {
          const highlight = await services.highlights.get(request.data.highlightId);
          if (highlight === undefined) {
            return errorResponse('NOT_FOUND', 'The saved highlight does not exist');
          }
          return ResponseSchema.parse({ ok: true, data: await services.anchors.apply(highlight) });
        }
      }
    } catch (error) {
      if (error instanceof CaptureError) return errorResponse(error.code, error.message);
      if (error instanceof AnchorError) return errorResponse(error.code, error.message);
      return errorResponse('INTERNAL_ERROR', 'TraceMark could not complete the request');
    }
  };
}
