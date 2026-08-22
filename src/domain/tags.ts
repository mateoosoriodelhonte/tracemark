import { MAX_TAGS } from './constants';
import { normalizeWhitespace } from './text';

export function normalizeTags(values: readonly string[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const tag = normalizeWhitespace(value).replace(/^#+/u, '').toLocaleLowerCase('en-US');
    if (tag.length === 0 || seen.has(tag)) continue;

    seen.add(tag);
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }

  return tags;
}
