import { z } from 'zod';
import type { AIResult, Collection, Highlight, Settings } from '../domain/models';
import {
  AIResultSchema,
  AnchorRuntimeResultSchema,
  BackupExportSchema,
  BackupImportResultSchema,
  CaptureResultSchema,
  CollectionSchema,
  HighlightSchema,
  IdSchema,
  SettingsSchema,
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

export const UpdateHighlightRequestSchema = z
  .object({
    type: z.literal('highlights.update'),
    highlightId: IdSchema,
    input: z
      .object({
        collectionId: IdSchema.optional(),
        tags: z.array(TagSchema).max(MAX_TAGS).optional(),
        note: z.string().max(MAX_NOTE_LENGTH).optional(),
      })
      .strict()
      .refine((input) => Object.keys(input).length > 0, 'At least one field is required'),
  })
  .strict();

export const SearchQuerySchema = z
  .object({
    query: z.string().max(2_000),
    collectionId: IdSchema.optional(),
    tag: TagSchema.optional(),
    includeArchived: z.boolean().optional(),
  })
  .strict();

export const DeleteResultSchema = z.object({ status: z.literal('deleted') }).strict();
export const TagListSchema = z
  .array(TagSchema)
  .max(500)
  .refine((tags) => new Set(tags).size === tags.length, 'Tags must be distinct');

export const ModelNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9._:/-]+$/u, 'Model names contain unsupported characters');

export const SourceHighlightIdsSchema = z
  .array(IdSchema)
  .min(1)
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, 'Source highlight IDs must be distinct');

export const RequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('capture.current') }).strict(),
  CreateHighlightRequestSchema,
  UpdateHighlightRequestSchema,
  z
    .object({
      type: z.literal('highlights.delete'),
      highlightId: IdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({ type: z.literal('highlights.recent'), limit: z.number().int().min(1).max(10) })
    .strict(),
  z.object({ type: z.literal('tags.list'), limit: z.number().int().min(1).max(500) }).strict(),
  z.object({ type: z.literal('research.search'), input: SearchQuerySchema }).strict(),
  z
    .object({ type: z.literal('collections.list'), includeArchived: z.boolean().optional() })
    .strict(),
  z.object({ type: z.literal('collections.create'), name: z.string().max(120) }).strict(),
  z
    .object({
      type: z.literal('collections.rename'),
      collectionId: IdSchema,
      name: z.string().max(120),
    })
    .strict(),
  z
    .object({
      type: z.literal('collections.archive'),
      collectionId: IdSchema,
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal('collections.delete'),
      collectionId: IdSchema,
      confirmed: z.literal(true),
    })
    .strict(),
  z.object({ type: z.literal('anchors.apply'), highlightId: IdSchema }).strict(),
  z.object({ type: z.literal('settings.get') }).strict(),
  z
    .object({ type: z.literal('settings.theme.set'), theme: z.enum(['system', 'light', 'dark']) })
    .strict(),
  z
    .object({
      type: z.literal('settings.ai.set'),
      provider: z.enum(['none', 'ollama']),
      model: ModelNameSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('ai.run'),
      kind: z.enum(['summary', 'explanation', 'tags', 'overview']),
      sourceHighlightIds: SourceHighlightIdsSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('backups.export'),
      format: z.enum(['json', 'markdown']),
      collectionId: IdSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('backups.import'),
      content: z.string().max(20_000_000),
      confirmed: z.literal(true),
    })
    .strict(),
]);

export const ErrorCodeSchema = z.enum([
  'INVALID_MESSAGE',
  'UNTRUSTED_SENDER',
  'NO_SELECTION',
  'UNSUPPORTED_PAGE',
  'INVALID_CAPTURE',
  'MULTIPLE_SELECTIONS',
  'NO_ACTIVE_TAB',
  'WRONG_PAGE',
  'INVALID_ANCHOR_RESULT',
  'NOT_FOUND',
  'INVALID_BACKUP',
  'AI_DISABLED',
  'AI_PERMISSION_REQUIRED',
  'AI_UNAVAILABLE',
  'AI_MODEL_UNAVAILABLE',
  'AI_TIMEOUT',
  'AI_INVALID_OUTPUT',
  'INTERNAL_ERROR',
]);

export const ResponseSchema = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      data: z.union([
        CaptureResultSchema,
        HighlightSchema,
        CollectionSchema,
        z.array(HighlightSchema),
        z.array(CollectionSchema),
        TagListSchema,
        AnchorRuntimeResultSchema,
        SettingsSchema,
        BackupExportSchema,
        BackupImportResultSchema,
        DeleteResultSchema,
        AIResultSchema,
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
  | Highlight
  | Highlight[]
  | string[]
  | Collection[]
  | Collection
  | Settings
  | AIResult
  | z.infer<typeof CaptureResultSchema>
  | z.infer<typeof AnchorRuntimeResultSchema>
  | z.infer<typeof BackupExportSchema>
  | z.infer<typeof BackupImportResultSchema>
  | z.infer<typeof DeleteResultSchema>;
