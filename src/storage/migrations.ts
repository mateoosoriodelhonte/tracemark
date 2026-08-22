import type { Transaction } from 'dexie';
import {
  CURRENT_SCHEMA_VERSION,
  INBOX_COLLECTION_ID,
  MAX_NOTE_LENGTH,
  MAX_QUOTE_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from '../domain/constants';
import type { Collection, Highlight } from '../domain/models';
import { CollectionSchema, HighlightSchema, IdSchema, TimestampSchema } from '../domain/schemas';
import { buildSearchDocument } from '../domain/search-document';
import { normalizeTags } from '../domain/tags';
import { normalizeSearchText, normalizeWhitespace } from '../domain/text';
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
  collectionNames: ReadonlyMap<string, string> = new Map(),
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
    const requestedCollectionId = IdSchema.safeParse(input.collectionId).success
      ? (input.collectionId as string)
      : INBOX_COLLECTION_ID;
    const collectionId = collectionNames.has(requestedCollectionId)
      ? requestedCollectionId
      : INBOX_COLLECTION_ID;
    const collectionName = collectionNames.get(collectionId) ?? 'Inbox';
    const note = optionalBoundedString(input, 'note', MAX_NOTE_LENGTH) ?? '';
    const tags = legacyTags(input);
    const search = buildSearchDocument({ quote, title, hostname, note, tags }, collectionName);

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

export function migrateLegacyCollection(
  input: unknown,
  dependencies: MigrationDependencies,
): Collection {
  try {
    if (!isRecord(input)) throw new MigrationError('Legacy collection is not an object');

    const id = IdSchema.parse(input.id);
    if (id === INBOX_COLLECTION_ID) {
      const now = dependencies.now();
      return CollectionSchema.parse({
        id,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        name: 'Inbox',
        normalizedName: 'inbox',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (typeof input.name !== 'string') throw new MigrationError('Invalid legacy collection name');
    const name = normalizeWhitespace(input.name);
    if (name.length === 0 || name.length > 120) {
      throw new MigrationError('Invalid legacy collection name');
    }

    const rawCreatedAt = input.createdAt;
    const createdAt = TimestampSchema.safeParse(rawCreatedAt).success
      ? (rawCreatedAt as string)
      : dependencies.now();

    return CollectionSchema.parse({
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name,
      normalizedName: normalizeSearchText(name),
      status: input.archived === true ? 'archived' : 'active',
      createdAt,
      updatedAt: createdAt,
    });
  } catch (error) {
    throw new MigrationError('Cannot migrate legacy collection', { cause: error });
  }
}

function assertUniqueCollectionNames(collections: Collection[]): void {
  const normalizedNames = new Set<string>();

  for (const collection of collections) {
    if (
      (collection.normalizedName === 'inbox' && collection.id !== INBOX_COLLECTION_ID) ||
      normalizedNames.has(collection.normalizedName)
    ) {
      throw new MigrationError('Conflicting legacy collection names');
    }
    normalizedNames.add(collection.normalizedName);
  }
}

export async function migrateVersionOne(
  transaction: Transaction,
  dependencies: MigrationDependencies,
): Promise<void> {
  const highlightsTable = transaction.table('highlights');
  const collectionsTable = transaction.table('collections');
  const [legacyHighlights, legacyCollections] = await Promise.all([
    highlightsTable.toArray(),
    collectionsTable.toArray(),
  ]);
  const migratedCollections = legacyCollections.map((collection) =>
    migrateLegacyCollection(collection, dependencies),
  );
  assertUniqueCollectionNames(migratedCollections);
  const collectionNames = new Map<string, string>([
    [INBOX_COLLECTION_ID, 'Inbox'],
    ...migratedCollections.map((collection) => [collection.id, collection.name] as const),
  ]);
  const migratedHighlights = legacyHighlights.map((highlight) =>
    migrateLegacyHighlight(highlight, dependencies, collectionNames),
  );

  await Promise.all([highlightsTable.clear(), collectionsTable.clear()]);
  if (migratedCollections.length > 0) await collectionsTable.bulkAdd(migratedCollections);
  if (migratedHighlights.length > 0) await highlightsTable.bulkAdd(migratedHighlights);
}
