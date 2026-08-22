import type { Collection, Highlight } from '../domain/models';
import { CollectionSchema, HighlightSchema } from '../domain/schemas';
import type { TraceMarkDatabase } from './database';

export class ResearchRepository {
  constructor(readonly database: TraceMarkDatabase) {}

  async putHighlight(input: unknown): Promise<Highlight> {
    const highlight = HighlightSchema.parse(input);
    await this.database.highlights.put(highlight);
    return HighlightSchema.parse(highlight);
  }

  async getHighlight(id: string): Promise<Highlight | undefined> {
    const highlight = await this.database.highlights.get(id);
    return highlight === undefined ? undefined : HighlightSchema.parse(highlight);
  }

  async listHighlights(): Promise<Highlight[]> {
    const highlights = await this.database.highlights.orderBy('createdAt').reverse().toArray();
    return highlights.map((highlight) => HighlightSchema.parse(highlight));
  }

  async deleteHighlight(id: string): Promise<void> {
    await this.database.highlights.delete(id);
  }

  async putCollection(input: unknown): Promise<Collection> {
    const collection = CollectionSchema.parse(input);
    await this.database.collections.put(collection);
    return CollectionSchema.parse(collection);
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const collection = await this.database.collections.get(id);
    return collection === undefined ? undefined : CollectionSchema.parse(collection);
  }

  async listCollections(): Promise<Collection[]> {
    const collections = await this.database.collections.toArray();
    return collections.map((collection) => CollectionSchema.parse(collection));
  }
}
