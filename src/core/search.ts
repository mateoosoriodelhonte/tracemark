import type { Highlight } from '../domain/models';
import { normalizeTags } from '../domain/tags';
import { normalizeSearchText, tokenizeSearch } from '../domain/text';
import type { ResearchRepository } from '../storage/repository';

export interface SearchQuery {
  query: string;
  collectionId?: string;
  tag?: string;
  includeArchived?: boolean;
  limit?: number;
}

export class SearchService {
  constructor(private readonly repository: ResearchRepository) {}

  async run(input: SearchQuery): Promise<Highlight[]> {
    const query = normalizeSearchText(input.query);
    const tokens = tokenizeSearch(query);
    const [firstToken] = tokens;
    const normalizedTag = input.tag === undefined ? undefined : normalizeTags([input.tag])[0];
    const collections = await this.repository.listCollections();
    const visibleCollectionIds = new Set(
      collections
        .filter((collection) => input.includeArchived || collection.status === 'active')
        .map(({ id }) => id),
    );

    const candidates =
      firstToken === undefined
        ? await this.repository.listHighlights()
        : await this.repository.database.highlights
            .where('searchTokens')
            .equals(firstToken)
            .toArray();

    const filtered = candidates.filter((highlight) => {
      if (!visibleCollectionIds.has(highlight.collectionId)) return false;
      if (input.collectionId !== undefined && highlight.collectionId !== input.collectionId) {
        return false;
      }
      if (normalizedTag !== undefined && !highlight.tags.includes(normalizedTag)) return false;
      return tokens.every((token) => highlight.searchTokens.includes(token));
    });

    const ranked = filtered
      .map((highlight) => ({ highlight, score: this.score(highlight, query) }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.highlight.createdAt.localeCompare(left.highlight.createdAt),
      )
      .map(({ highlight }) => highlight);

    return ranked.slice(0, Math.min(Math.max(input.limit ?? 100, 1), 500));
  }

  private score(highlight: Highlight, query: string): number {
    if (query.length === 0) return 0;

    let score = 0;
    if (normalizeSearchText(highlight.quote).includes(query)) score += 8;
    if (normalizeSearchText(highlight.title).includes(query)) score += 5;
    if (normalizeSearchText(highlight.note).includes(query)) score += 3;
    if (highlight.tags.some((tag) => normalizeSearchText(tag).includes(query))) score += 2;
    if (highlight.searchText.includes(query)) score += 1;
    return score;
  }
}
