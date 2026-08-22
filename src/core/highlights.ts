import { CURRENT_SCHEMA_VERSION } from '../domain/constants';
import type { Highlight } from '../domain/models';
import { buildSearchDocument } from '../domain/search-document';
import { normalizeTags } from '../domain/tags';
import { normalizeWhitespace } from '../domain/text';
import { safeCanonicalUrl, safeSourceUrl } from '../domain/urls';
import type { ResearchRepository } from '../storage/repository';

export interface CreateHighlightInput {
  quote: string;
  prefix: string;
  suffix: string;
  heading?: string;
  context?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  collectionId: string;
  tags: readonly string[];
  note: string;
}

export interface UpdateHighlightInput {
  collectionId?: string;
  tags?: readonly string[];
  note?: string;
}

export interface HighlightServiceDependencies {
  now: () => string;
  createId: () => string;
}

export class HighlightService {
  constructor(
    private readonly repository: ResearchRepository,
    private readonly dependencies: HighlightServiceDependencies,
  ) {}

  async create(input: CreateHighlightInput): Promise<Highlight> {
    const url = safeSourceUrl(input.url);
    if (url === undefined) throw new Error('Unsupported source URL');
    const collection = await this.repository.getCollection(input.collectionId);
    if (collection === undefined) throw new Error('Collection not found');

    const title = normalizeWhitespace(input.title);
    const hostname = new URL(url).hostname;
    const tags = normalizeTags(input.tags);
    const canonicalUrl =
      input.canonicalUrl === undefined ? undefined : safeCanonicalUrl(input.canonicalUrl, url);
    const search = buildSearchDocument(
      { quote: input.quote, title, hostname, note: input.note, tags },
      collection.name,
    );
    const now = this.dependencies.now();

    return this.repository.putHighlight({
      id: this.dependencies.createId(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      quote: input.quote,
      prefix: input.prefix,
      suffix: input.suffix,
      ...(input.heading === undefined ? {} : { heading: input.heading }),
      ...(input.context === undefined ? {} : { context: input.context }),
      title,
      url,
      ...(canonicalUrl === undefined ? {} : { canonicalUrl }),
      hostname,
      collectionId: collection.id,
      tags,
      note: input.note,
      ...search,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(id: string, input: UpdateHighlightInput): Promise<Highlight> {
    const highlight = await this.repository.getHighlight(id);
    if (highlight === undefined) throw new Error('Highlight not found');

    const collectionId = input.collectionId ?? highlight.collectionId;
    const collection = await this.repository.getCollection(collectionId);
    if (collection === undefined) throw new Error('Collection not found');
    const tags = input.tags === undefined ? highlight.tags : normalizeTags(input.tags);
    const note = input.note ?? highlight.note;
    const search = buildSearchDocument(
      {
        quote: highlight.quote,
        title: highlight.title,
        hostname: highlight.hostname,
        note,
        tags,
      },
      collection.name,
    );

    return this.repository.putHighlight({
      ...highlight,
      collectionId,
      tags,
      note,
      ...search,
      updatedAt: this.dependencies.now(),
    });
  }

  async remove(id: string): Promise<void> {
    if ((await this.repository.getHighlight(id)) === undefined)
      throw new Error('Highlight not found');
    await this.repository.deleteHighlight(id);
  }

  async get(id: string): Promise<Highlight | undefined> {
    return this.repository.getHighlight(id);
  }

  async recent(limit: number): Promise<Highlight[]> {
    return this.repository.listRecentHighlights(limit);
  }

  async tags(limit: number): Promise<string[]> {
    return this.repository.listTags(limit);
  }
}
