import Dexie, { type EntityTable } from 'dexie';
import { CURRENT_SCHEMA_VERSION, INBOX_COLLECTION_ID } from '../domain/constants';
import type { AIResult, Collection, Highlight } from '../domain/models';
import { migrateVersionOne, type MigrationDependencies } from './migrations';

const DATABASE_VERSION = 2;

const versionOneStores = {
  highlights: '&id, createdAt',
  collections: '&id, name',
};

const versionTwoStores = {
  highlights: '&id, collectionId, hostname, createdAt, updatedAt, *tags, *searchTokens',
  collections: '&id, &normalizedName, status, createdAt, updatedAt',
  aiResults: '&id, kind, createdAt, *sourceHighlightIds',
};

const defaultDependencies: MigrationDependencies = {
  now: () => new Date().toISOString(),
};

export class TraceMarkDatabase extends Dexie {
  highlights!: EntityTable<Highlight, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  aiResults!: EntityTable<AIResult, 'id'>;

  constructor(name = 'tracemark', dependencies: MigrationDependencies = defaultDependencies) {
    super(name);

    this.version(1).stores(versionOneStores);
    this.version(DATABASE_VERSION)
      .stores(versionTwoStores)
      .upgrade((transaction) => migrateVersionOne(transaction, dependencies));
  }
}

export async function openTraceMarkDatabase(
  name = 'tracemark',
  dependencies: MigrationDependencies = defaultDependencies,
): Promise<TraceMarkDatabase> {
  const database = new TraceMarkDatabase(name, dependencies);
  await database.open();

  await database.transaction('rw', database.collections, async () => {
    if ((await database.collections.get(INBOX_COLLECTION_ID)) !== undefined) return;

    const now = dependencies.now();
    await database.collections.add({
      id: INBOX_COLLECTION_ID,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name: 'Inbox',
      normalizedName: 'inbox',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  });

  return database;
}
