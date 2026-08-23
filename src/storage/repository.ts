import type { AIResult, Collection, Highlight } from '../domain/models';
import { AIResultSchema, CollectionSchema, HighlightSchema, TagSchema } from '../domain/schemas';
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

  async listRecentHighlights(limit: number): Promise<Highlight[]> {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 10);
    const highlights = await this.database.highlights
      .orderBy('createdAt')
      .reverse()
      .limit(boundedLimit)
      .toArray();
    return highlights.map((highlight) => HighlightSchema.parse(highlight));
  }

  async listTags(limit: number): Promise<string[]> {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
    const keys = await this.database.highlights.orderBy('tags').limit(boundedLimit).uniqueKeys();
    return keys.map((key) => TagSchema.parse(key));
  }

  async putAIResult(input: unknown): Promise<AIResult> {
    const result = AIResultSchema.parse(input);
    await this.database.aiResults.put(result);
    return AIResultSchema.parse(result);
  }

  async listAIResults(): Promise<AIResult[]> {
    const results = await this.database.aiResults.orderBy('createdAt').reverse().toArray();
    return results.map((result) => AIResultSchema.parse(result));
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
