import { MAX_SEARCH_TOKEN_LENGTH } from './constants';

export function normalizeWhitespace(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}-]+/gu, ' ')
    .replace(/-{2,}/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const tokens = normalized.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  return [...new Set(tokens)];
}

export function tokenizeSearch(value: string): string[] {
  return [
    ...new Set(tokenizeSearchText(value).map((token) => token.slice(0, MAX_SEARCH_TOKEN_LENGTH))),
  ];
}
