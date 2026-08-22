import type { SearchableHighlight } from './models';
import { normalizeSearchText, tokenizeSearch } from './text';

export interface SearchDocument {
  searchText: string;
  searchTokens: string[];
}

export function buildSearchDocument(
  highlight: SearchableHighlight,
  collectionName: string,
): SearchDocument {
  const searchText = normalizeSearchText(
    [
      highlight.quote,
      highlight.title,
      highlight.hostname,
      highlight.note,
      ...highlight.tags,
      collectionName,
    ].join(' '),
  );

  return {
    searchText,
    searchTokens: tokenizeSearch(searchText),
  };
}
