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

export function tokenizeSearch(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const tokens = normalized.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  return [...new Set(tokens)];
}
