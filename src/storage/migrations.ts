import type { Transaction } from 'dexie';
import {
  CURRENT_SCHEMA_VERSION,
  INBOX_COLLECTION_ID,
  MAX_NOTE_LENGTH,
  MAX_QUOTE_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from '../domain/constants';
import type { Highlight } from '../domain/models';
import { HighlightSchema, IdSchema, TimestampSchema } from '../domain/schemas';
import { buildSearchDocument } from '../domain/search-document';
import { normalizeTags } from '../domain/tags';
import { safeSourceUrl } from '../domain/urls';

export interface MigrationDependencies {
  now: () => string;
}

export class MigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MigrationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalBoundedString(
  record: Record<string, unknown>,
  key: string,
  maximum: number,
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > maximum) {
    throw new MigrationError(`Invalid legacy ${key}`);
  }
  return value;
}

function legacyTags(record: Record<string, unknown>): string[] {
  const value = record.tags;
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
    throw new MigrationError('Invalid legacy tags');
  }

  const tags = normalizeTags(value as string[]);
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new MigrationError('Invalid legacy tag length');
  }
  return tags;
}

export function migrateLegacyHighlight(
  input: unknown,
  dependencies: MigrationDependencies,
): Highlight {
  try {
    if (!isRecord(input)) throw new MigrationError('Legacy highlight is not an object');

    const id = IdSchema.parse(input.id);
    const quote = input.text;
    if (typeof quote !== 'string' || quote.trim().length === 0 || quote.length > MAX_QUOTE_LENGTH) {
      throw new MigrationError('Invalid legacy quotation');
    }

    if (typeof input.sourceUrl !== 'string') throw new MigrationError('Invalid legacy source URL');
    const url = safeSourceUrl(input.sourceUrl);
    if (url === undefined) throw new MigrationError('Invalid legacy source URL');

    const hostname = new URL(url).hostname;
    const rawTitle = optionalBoundedString(input, 'title', MAX_TITLE_LENGTH);
    const title = rawTitle?.trim() ? rawTitle : hostname;
    const rawCreatedAt = input.createdAt;
    const createdAt = TimestampSchema.safeParse(rawCreatedAt).success
      ? (rawCreatedAt as string)
      : dependencies.now();
    const collectionId = IdSchema.safeParse(input.collectionId).success
      ? (input.collectionId as string)
      : INBOX_COLLECTION_ID;
    const note = optionalBoundedString(input, 'note', MAX_NOTE_LENGTH) ?? '';
    const tags = legacyTags(input);
    const search = buildSearchDocument({ quote, title, hostname, note, tags }, 'Inbox');

    return HighlightSchema.parse({
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      quote,
      prefix: '',
      suffix: '',
      title,
      url,
      hostname,
      collectionId,
      tags,
      note,
      ...search,
      createdAt,
      updatedAt: createdAt,
    });
  } catch (error) {
    if (error instanceof MigrationError && error.message.startsWith('Cannot migrate')) {
      throw error;
    }
    throw new MigrationError('Cannot migrate legacy highlight', { cause: error });
  }
}

export async function migrateVersionOne(
  transaction: Transaction,
  dependencies: MigrationDependencies,
): Promise<void> {
  const table = transaction.table('highlights');
  const legacyHighlights = await table.toArray();
  const migratedHighlights = legacyHighlights.map((highlight) =>
    migrateLegacyHighlight(highlight, dependencies),
  );

  await table.clear();
  if (migratedHighlights.length > 0) await table.bulkAdd(migratedHighlights);
}
