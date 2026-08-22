import { normalizeWhitespace } from './text';

export interface TextQuoteSelector {
  exact: string;
  prefix: string;
  suffix: string;
}

export type AnchorMatch =
  { status: 'found'; start: number; end: number } | { status: 'ambiguous' | 'not-found' };

const MINIMUM_CONTEXT_MARGIN = 4;

function commonPrefixLength(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let index = 0;
  while (index < length && left[index] === right[index]) index += 1;
  return index;
}

function commonSuffixLength(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  let count = 0;
  while (count < length && left[left.length - count - 1] === right[right.length - count - 1]) {
    count += 1;
  }
  return count;
}

export function findAnchor(inputText: string, selector: TextQuoteSelector): AnchorMatch {
  const text = normalizeWhitespace(inputText);
  const exact = normalizeWhitespace(selector.exact);
  if (exact.length === 0) return { status: 'not-found' };

  const candidates: number[] = [];
  let offset = 0;
  while (offset <= text.length - exact.length) {
    const match = text.indexOf(exact, offset);
    if (match === -1) break;
    candidates.push(match);
    offset = match + 1;
  }

  if (candidates.length === 0) return { status: 'not-found' };
  if (candidates.length === 1) {
    const start = candidates[0];
    if (start === undefined) return { status: 'not-found' };
    return { status: 'found', start, end: start + exact.length };
  }

  const prefix = normalizeWhitespace(selector.prefix);
  const suffix = normalizeWhitespace(selector.suffix);
  const ranked = candidates
    .map((start) => {
      const before = text.slice(0, start).trimEnd();
      const after = text.slice(start + exact.length).trimStart();
      return {
        start,
        score: commonSuffixLength(before, prefix) + commonPrefixLength(after, suffix),
      };
    })
    .sort((left, right) => right.score - left.score || left.start - right.start);
  const [winner, runnerUp] = ranked;
  if (
    winner === undefined ||
    runnerUp === undefined ||
    winner.score === 0 ||
    winner.score - runnerUp.score < MINIMUM_CONTEXT_MARGIN
  ) {
    return { status: 'ambiguous' };
  }

  return { status: 'found', start: winner.start, end: winner.start + exact.length };
}
