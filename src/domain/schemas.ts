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
