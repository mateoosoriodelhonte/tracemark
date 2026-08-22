import { findAnchor, type TextQuoteSelector } from './anchor';

export type DocumentAnchorResult =
  { status: 'marked'; count: number } | { status: 'ambiguous' | 'not-found' };

interface MappedCharacter {
  value: string;
  node?: Text;
  startOffset: number;
  endOffset: number;
}

interface TextMap {
  text: string;
  characters: MappedCharacter[];
}

const BLOCK_SELECTOR =
  'address, article, aside, blockquote, dd, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, li, main, nav, ol, p, pre, section, table, td, th, tr, ul';
const EXCLUDED_SELECTOR =
  'script, style, noscript, template, textarea, [hidden], [aria-hidden="true"]';

function isVisibleText(node: Text): boolean {
  const parent = node.parentElement;
  if (parent === null || parent.closest(EXCLUDED_SELECTOR) !== null) return false;
  const view = node.ownerDocument.defaultView;
  if (view === null) return true;
  const style = view.getComputedStyle(parent);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function blockContainer(node: Text): Element | null {
  return node.parentElement?.closest(BLOCK_SELECTOR) ?? node.ownerDocument.body;
}

function appendValue(
  characters: MappedCharacter[],
  value: string,
  node: Text | undefined,
  startOffset: number,
  endOffset: number,
): void {
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === undefined) continue;
    if (/\s/u.test(character)) {
      if (characters.length > 0 && characters.at(-1)?.value !== ' ') {
        characters.push({ value: ' ', node, startOffset, endOffset });
      }
    } else {
      characters.push({ value: character, node, startOffset, endOffset });
    }
  }
}

export function buildTextMap(document: Document): TextMap {
  const root = document.body ?? document.documentElement;
  if (root === null) return { text: '', characters: [] };
  const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(root, showText);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current !== null) {
    if (current.nodeType === current.TEXT_NODE) {
      const node = current as Text;
      if (node.data.trim().length > 0 && isVisibleText(node)) nodes.push(node);
    }
    current = walker.nextNode();
  }

  const characters: MappedCharacter[] = [];
  let previousNode: Text | undefined;
  for (const node of nodes) {
    if (
      previousNode !== undefined &&
      blockContainer(previousNode) !== blockContainer(node) &&
      characters.at(-1)?.value !== ' '
    ) {
      appendValue(characters, ' ', undefined, 0, 0);
    }

    let rawOffset = 0;
    for (const codePoint of node.data) {
      const normalized = codePoint.normalize('NFKC');
      appendValue(characters, normalized, node, rawOffset, rawOffset + codePoint.length);
      rawOffset += codePoint.length;
    }
    previousNode = node;
  }

  while (characters.at(-1)?.value === ' ') characters.pop();
  return { text: characters.map(({ value }) => value).join(''), characters };
}

function clearExistingMarks(document: Document): void {
  for (const mark of document.querySelectorAll('mark[data-tracemark-anchor]')) {
    const parent = mark.parentNode;
    mark.replaceWith(...mark.childNodes);
    parent?.normalize();
  }
}

export function anchorDocument(
  document: Document,
  selector: TextQuoteSelector,
): DocumentAnchorResult {
  let map = buildTextMap(document);
  let match = findAnchor(map.text, selector);
  if (match.status !== 'found') return match;

  if (document.querySelector('mark[data-tracemark-anchor]') !== null) {
    clearExistingMarks(document);
    map = buildTextMap(document);
    match = findAnchor(map.text, selector);
    if (match.status !== 'found') return match;
  }

  const nodeRanges = new Map<Text, { start: number; end: number }>();
  for (const character of map.characters.slice(match.start, match.end)) {
    if (character.node === undefined) continue;
    const current = nodeRanges.get(character.node);
    nodeRanges.set(character.node, {
      start: Math.min(current?.start ?? character.startOffset, character.startOffset),
      end: Math.max(current?.end ?? character.endOffset, character.endOffset),
    });
  }
  if (nodeRanges.size === 0) return { status: 'not-found' };

  const entries = [...nodeRanges].reverse();
  const marks: HTMLElement[] = [];
  for (const [node, offsets] of entries) {
    const range = document.createRange();
    range.setStart(node, offsets.start);
    range.setEnd(node, offsets.end);
    const mark = document.createElement('mark');
    mark.dataset.tracemarkAnchor = 'true';
    mark.style.backgroundColor = '#ffdf76';
    mark.style.color = 'inherit';
    mark.append(range.extractContents());
    range.insertNode(mark);
    marks.push(mark);
  }

  const first = marks.at(-1);
  if (first !== undefined && typeof first.scrollIntoView === 'function') {
    first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  return { status: 'marked', count: marks.length };
}
