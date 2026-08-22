import { MAX_CONTEXT_LENGTH, MAX_TITLE_LENGTH } from './constants';
import type { CaptureResult } from './models';
import { CaptureResultSchema } from './schemas';
import { normalizeWhitespace } from './text';
import { safeCanonicalUrl, safeSourceUrl } from './urls';

export interface SelectionLike {
  readonly rangeCount: number;
  readonly isCollapsed: boolean;
  getRangeAt(index: number): Range;
  toString(): string;
}

export type CapturePageResult =
  | { status: 'captured'; value: CaptureResult }
  | { status: 'no-selection' | 'unsupported' | 'invalid-selection' };

const DOCUMENT_POSITION_FOLLOWING = 4;

function containingElement(node: Node): Element | undefined {
  return node.nodeType === node.ELEMENT_NODE
    ? (node as Element)
    : (node.parentElement ?? undefined);
}

function rangeContext(document: Document, range: Range): { prefix: string; suffix: string } {
  const root =
    containingElement(range.commonAncestorContainer)?.closest(
      'p, li, blockquote, pre, td, th, figcaption, article, section',
    ) ??
    document.body ??
    document.documentElement;
  if (root === null) return { prefix: '', suffix: '' };

  try {
    const before = document.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(root);
    after.setStart(range.endContainer, range.endOffset);
    return {
      prefix: before.toString().slice(-MAX_CONTEXT_LENGTH),
      suffix: after.toString().slice(0, MAX_CONTEXT_LENGTH),
    };
  } catch {
    return { prefix: '', suffix: '' };
  }
}

function nearestHeading(document: Document, range: Range): string | undefined {
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const preceding = headings.filter((heading) => {
    const position = heading.compareDocumentPosition(range.startContainer);
    return (position & DOCUMENT_POSITION_FOLLOWING) !== 0 || heading.contains(range.startContainer);
  });
  const value = normalizeWhitespace(preceding.at(-1)?.textContent ?? '').slice(0, MAX_TITLE_LENGTH);
  return value.length === 0 ? undefined : value;
}

function containingContext(range: Range): string | undefined {
  const element = containingElement(range.commonAncestorContainer)?.closest(
    'p, li, blockquote, pre, td, th, figcaption, article, section',
  );
  const value = normalizeWhitespace(element?.textContent ?? '').slice(0, MAX_CONTEXT_LENGTH);
  return value.length === 0 ? undefined : value;
}

export function captureDocumentSelection(
  document: Document,
  selection: SelectionLike | null = document.defaultView?.getSelection() ?? null,
): CapturePageResult {
  const url = safeSourceUrl(document.location.href);
  if (url === undefined) return { status: 'unsupported' };
  if (
    selection === null ||
    selection.rangeCount !== 1 ||
    selection.isCollapsed ||
    selection.toString().trim().length === 0
  ) {
    return { status: 'no-selection' };
  }

  const range = selection.getRangeAt(0);
  const quote = selection.toString();
  const hostname = new URL(url).hostname;
  const title = normalizeWhitespace(document.title).slice(0, MAX_TITLE_LENGTH) || hostname;
  const canonicalHref = document.querySelector<HTMLLinkElement>('link[rel~="canonical"]')?.href;
  const canonicalUrl =
    canonicalHref === undefined ? undefined : safeCanonicalUrl(canonicalHref, url);
  const { prefix, suffix } = rangeContext(document, range);
  const heading = nearestHeading(document, range);
  const context = containingContext(range);
  const parsed = CaptureResultSchema.safeParse({
    quote,
    prefix,
    suffix,
    ...(heading === undefined ? {} : { heading }),
    ...(context === undefined ? {} : { context }),
    title,
    url,
    ...(canonicalUrl === undefined ? {} : { canonicalUrl }),
  });

  return parsed.success
    ? { status: 'captured', value: parsed.data }
    : { status: 'invalid-selection' };
}
