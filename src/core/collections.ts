import { CURRENT_SCHEMA_VERSION, INBOX_COLLECTION_ID } from '../domain/constants';
import type { Collection } from '../domain/models';
import { CollectionSchema } from '../domain/schemas';
import { buildSearchDocument } from '../domain/search-document';
import { normalizeSearchText, normalizeWhitespace } from '../domain/text';
import type { ResearchRepository } from '../storage/repository';

export interface CollectionServiceDependencies {
  now: () => string;
  createId: () => string;
}

export interface ListCollectionOptions {
  includeArchived?: boolean;
}

export class CollectionService {
  constructor(
    private readonly repository: ResearchRepository,
    private readonly dependencies: CollectionServiceDependencies,
  ) {}

  async create(inputName: string): Promise<Collection> {
    const name = normalizeWhitespace(inputName);
    const normalizedName = normalizeSearchText(name);
    if (name.length === 0) throw new Error('Collection name is required');

    return this.repository.database.transaction(
      'rw',
      this.repository.database.collections,
      async () => {
        const existing = await this.repository.database.collections
          .where('normalizedName')
          .equals(normalizedName)
          .first();
        if (existing !== undefined) throw new Error('A collection with this name already exists');

        const now = this.dependencies.now();
        return this.repository.putCollection({
          id: this.dependencies.createId(),
          schemaVersion: CURRENT_SCHEMA_VERSION,
          name,
          normalizedName,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      },
    );
  }

  async rename(id: string, inputName: string): Promise<Collection> {
    if (id === INBOX_COLLECTION_ID) throw new Error('Inbox cannot be renamed');
    const name = normalizeWhitespace(inputName);
    const normalizedName = normalizeSearchText(name);
    if (name.length === 0) throw new Error('Collection name is required');

    return this.repository.database.transaction(
      'rw',
      this.repository.database.collections,
      this.repository.database.highlights,
      async () => {
        const collection = await this.requiredCollection(id);
        const conflict = await this.repository.database.collections
          .where('normalizedName')
          .equals(normalizedName)
          .first();
        if (conflict !== undefined && conflict.id !== id) {
          throw new Error('A collection with this name already exists');
        }

        const updatedAt = this.dependencies.now();
        const updated = CollectionSchema.parse({ ...collection, name, normalizedName, updatedAt });
        await this.repository.database.collections.put(updated);
        await this.refreshSearchDocuments(id, name, updatedAt);
        return updated;
      },
    );
  }

  async archive(id: string, archived: boolean): Promise<Collection> {
    if (id === INBOX_COLLECTION_ID) throw new Error('Inbox cannot be archived');
    const collection = await this.requiredCollection(id);
    return this.repository.putCollection({
      ...collection,
      status: archived ? 'archived' : 'active',
      updatedAt: this.dependencies.now(),
    });
  }

  async remove(id: string, confirmed: boolean): Promise<void> {
    if (!confirmed) throw new Error('Collection deletion requires explicit confirmation');
    if (id === INBOX_COLLECTION_ID) throw new Error('Inbox cannot be deleted');

    await this.repository.database.transaction(
      'rw',
      this.repository.database.collections,
      this.repository.database.highlights,
      async () => {
        await this.requiredCollection(id);
        await this.requiredCollection(INBOX_COLLECTION_ID);
        const updatedAt = this.dependencies.now();
        const highlights = await this.repository.database.highlights
          .where('collectionId')
          .equals(id)
          .toArray();

        for (const highlight of highlights) {
          const search = buildSearchDocument(
            {
              quote: highlight.quote,
              title: highlight.title,
              hostname: highlight.hostname,
              note: highlight.note,
              tags: highlight.tags,
            },
            'Inbox',
          );
          await this.repository.putHighlight({
            ...highlight,
            collectionId: INBOX_COLLECTION_ID,
            ...search,
            updatedAt,
          });
        }

        await this.repository.database.collections.delete(id);
      },
    );
  }

  async list(options: ListCollectionOptions = {}): Promise<Collection[]> {
    const collections = (await this.repository.listCollections()).filter(
      (collection) => options.includeArchived || collection.status === 'active',
    );

    return collections.sort((left, right) => {
      if (left.id === INBOX_COLLECTION_ID) return -1;
      if (right.id === INBOX_COLLECTION_ID) return 1;
      return left.name.localeCompare(right.name);
    });
  }

  private async requiredCollection(id: string): Promise<Collection> {
    const collection = await this.repository.getCollection(id);
    if (collection === undefined) throw new Error('Collection not found');
    return collection;
  }

  private async refreshSearchDocuments(
    collectionId: string,
    collectionName: string,
    updatedAt: string,
  ): Promise<void> {
    const highlights = await this.repository.database.highlights
      .where('collectionId')
      .equals(collectionId)
      .toArray();

    for (const highlight of highlights) {
      const search = buildSearchDocument(
        {
          quote: highlight.quote,
          title: highlight.title,
          hostname: highlight.hostname,
          note: highlight.note,
          tags: highlight.tags,
        },
        collectionName,
      );
      await this.repository.putHighlight({ ...highlight, ...search, updatedAt });
    }
  }
}
