import { z } from 'zod';
import type { Collection, Highlight } from '../domain/models';
import {
  CaptureResultSchema,
  CollectionSchema,
  HighlightSchema,
  IdSchema,
  TagSchema,
} from '../domain/schemas';
import { MAX_NOTE_LENGTH, MAX_TAGS } from '../domain/constants';

export const CreateHighlightRequestSchema = z
  .object({
    type: z.literal('highlights.create'),
    input: CaptureResultSchema.extend({
      collectionId: IdSchema,
      tags: z.array(TagSchema).max(MAX_TAGS),
      note: z.string().max(MAX_NOTE_LENGTH),
    }).strict(),
  })
  .strict();

export const RequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('capture.current') }).strict(),
  CreateHighlightRequestSchema,
  z.object({ type: z.literal('highlights.list') }).strict(),
  z.object({ type: z.literal('collections.list') }).strict(),
]);

export const ErrorCodeSchema = z.enum([
  'INVALID_MESSAGE',
  'UNTRUSTED_SENDER',
  'NO_SELECTION',
  'UNSUPPORTED_PAGE',
  'INVALID_CAPTURE',
  'MULTIPLE_SELECTIONS',
  'NO_ACTIVE_TAB',
  'INTERNAL_ERROR',
]);

export const ResponseSchema = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: z.union([
        CaptureResultSchema,
        HighlightSchema,
        z.array(HighlightSchema),
        z.array(CollectionSchema),
      ]),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: ErrorCodeSchema,
      message: z.string().max(500),
    })
    .strict(),
]);

export type MessageRequest = z.infer<typeof RequestSchema>;
export type MessageResponse = z.infer<typeof ResponseSchema>;
export type SuccessfulResponseData =
  Highlight | Highlight[] | Collection[] | z.infer<typeof CaptureResultSchema>;
