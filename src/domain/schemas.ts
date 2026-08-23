import { z } from 'zod';
import {
  CURRENT_SCHEMA_VERSION,
  MAX_CONTEXT_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_QUOTE_LENGTH,
  MAX_SEARCH_TEXT_LENGTH,
  MAX_SEARCH_TOKEN_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TITLE_LENGTH,
} from './constants';
import { safeSourceUrl } from './urls';

z.config({ jitless: true });

const NonBlankString = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, 'Must contain visible text');

export const IdSchema = z.uuid();
export const TimestampSchema = z.iso.datetime({ offset: true });
export const WebUrlSchema = z
  .string()
  .max(8_192)
  .refine((value) => safeSourceUrl(value) === value, 'Must be a normalized HTTP(S) URL');
export const TagSchema = NonBlankString(MAX_TAG_LENGTH);

export const TextAssistanceSchema = z
  .object({
    content: NonBlankString(100_000),
  })
  .strict();

export const TagAssistanceSchema = z
  .object({
    tags: z.array(TagSchema).min(1).max(MAX_TAGS),
  })
  .strict();

export const OllamaChatResponseSchema = z
  .object({
    message: z
      .object({
        role: z.literal('assistant'),
        content: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const HighlightSchema = z
  .object({
    id: IdSchema,
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    quote: NonBlankString(MAX_QUOTE_LENGTH),
    prefix: z.string().max(MAX_CONTEXT_LENGTH),
    suffix: z.string().max(MAX_CONTEXT_LENGTH),
    heading: z.string().max(MAX_TITLE_LENGTH).optional(),
    context: z.string().max(MAX_CONTEXT_LENGTH).optional(),
    title: NonBlankString(MAX_TITLE_LENGTH),
    url: WebUrlSchema,
    canonicalUrl: WebUrlSchema.optional(),
    hostname: NonBlankString(253),
    collectionId: IdSchema,
    tags: z.array(TagSchema).max(MAX_TAGS),
    note: z.string().max(MAX_NOTE_LENGTH),
    searchText: z.string().max(MAX_SEARCH_TEXT_LENGTH),
    searchTokens: z.array(NonBlankString(MAX_SEARCH_TOKEN_LENGTH)).max(10_000),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const CollectionSchema = z
  .object({
    id: IdSchema,
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    name: NonBlankString(120),
    normalizedName: NonBlankString(120),
    status: z.enum(['active', 'archived']),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

export const SettingsSchema = z
  .object({
    id: z.literal('settings'),
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    theme: z.enum(['system', 'light', 'dark']),
    ai: z
      .object({
        provider: z.enum(['none', 'ollama']),
        model: z.string().max(200),
      })
      .strict(),
  })
  .strict();

export const AIResultSchema = z
  .object({
    id: IdSchema,
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    kind: z.enum(['summary', 'explanation', 'tags', 'overview']),
    provider: z.literal('ollama'),
    sourceHighlightIds: z.array(IdSchema).min(1).max(500),
    content: z.string().min(1).max(100_000),
    createdAt: TimestampSchema,
  })
  .strict();

export const CaptureResultSchema = z
  .object({
    quote: NonBlankString(MAX_QUOTE_LENGTH),
    prefix: z.string().max(MAX_CONTEXT_LENGTH),
    suffix: z.string().max(MAX_CONTEXT_LENGTH),
    heading: z.string().max(MAX_TITLE_LENGTH).optional(),
    context: z.string().max(MAX_CONTEXT_LENGTH).optional(),
    title: NonBlankString(MAX_TITLE_LENGTH),
    url: WebUrlSchema,
    canonicalUrl: WebUrlSchema.optional(),
  })
  .strict();

export const CapturePageResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('captured'), value: CaptureResultSchema }).strict(),
  z.object({ status: z.literal('no-selection') }).strict(),
  z.object({ status: z.literal('unsupported') }).strict(),
  z.object({ status: z.literal('invalid-selection') }).strict(),
]);

export const TextQuoteSelectorSchema = z
  .object({
    exact: NonBlankString(MAX_QUOTE_LENGTH),
    prefix: z.string().max(MAX_CONTEXT_LENGTH),
    suffix: z.string().max(MAX_CONTEXT_LENGTH),
  })
  .strict();

export const AnchorCommandSchema = z
  .object({
    type: z.literal('tracemark.anchor.apply'),
    selector: TextQuoteSelectorSchema,
  })
  .strict();

export const AnchorReadyResultSchema = z.object({ status: z.literal('ready') }).strict();

export const AnchorRuntimeResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('marked'), count: z.number().int().min(1).max(500) }).strict(),
  z.object({ status: z.literal('ambiguous') }).strict(),
  z.object({ status: z.literal('not-found') }).strict(),
  z.object({ status: z.literal('unsupported') }).strict(),
]);

export const BackupEnvelopeSchema = z
  .object({
    format: z.literal('tracemark-backup'),
    version: z.literal(1),
    exportedAt: TimestampSchema,
    collections: z.array(CollectionSchema).max(10_000),
    highlights: z.array(HighlightSchema).max(100_000),
    aiResults: z.array(AIResultSchema).max(100_000),
    settings: SettingsSchema,
  })
  .strict();

export const BackupExportSchema = z
  .object({
    format: z.enum(['json', 'markdown']),
    filename: z.string().min(1).max(240),
    content: z.string().max(20_000_000),
  })
  .strict();

export const BackupEntityCountsSchema = z
  .object({
    collections: z.number().int().min(0).max(10_000),
    highlights: z.number().int().min(0).max(100_000),
    aiResults: z.number().int().min(0).max(100_000),
  })
  .strict();

export const BackupImportResultSchema = z
  .object({
    collections: z.number().int().min(1).max(10_000),
    highlights: z.number().int().min(0).max(100_000),
    aiResults: z.number().int().min(0).max(100_000),
    created: BackupEntityCountsSchema,
    updated: BackupEntityCountsSchema,
    skipped: BackupEntityCountsSchema,
    regenerated: BackupEntityCountsSchema,
    rejected: BackupEntityCountsSchema,
  })
  .strict();
