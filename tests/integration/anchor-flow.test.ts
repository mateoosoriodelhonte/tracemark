import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';
import { anchorDocument } from '../../src/domain/text-nodes';

function fixture(name: string): Document {
  const html = readFileSync(resolve('tests/fixtures/site', name), 'utf8');
  return new JSDOM(html, { url: 'https://example.com/article' }).window.document;
}

describe('DOM anchoring', () => {
  test('marks a unique quotation across inline text nodes and preserves page text', () => {
    const document = fixture('article.html');
    const before = document.body.textContent;

    expect(
      anchorDocument(document, {
        exact: 'retrieval quality matters',
        prefix: 'The evidence suggests ',
        suffix: ' more than window size.',
      }),
    ).toEqual({ status: 'marked', count: 3 });
    const marks = [...document.querySelectorAll('mark[data-tracemark-anchor]')];
    expect(marks).toHaveLength(3);
    expect(marks.map((mark) => mark.textContent).join('')).toBe('retrieval quality matters');
    expect(document.body.textContent).toBe(before);
  });

  test('refuses ambiguous and changed fixtures without modifying the DOM', () => {
    const repeated = fixture('repeated.html');
    const changed = fixture('changed.html');

    expect(
      anchorDocument(repeated, {
        exact: 'repeated claim',
        prefix: 'Before ',
        suffix: ' after.',
      }),
    ).toEqual({ status: 'ambiguous' });
    expect(
      anchorDocument(changed, {
        exact: 'retrieval quality matters',
        prefix: '',
        suffix: '',
      }),
    ).toEqual({ status: 'not-found' });
    expect(repeated.querySelector('mark')).toBeNull();
    expect(changed.querySelector('mark')).toBeNull();
  });

  test('anchors after dynamic content arrives', () => {
    const document = fixture('dynamic.html');
    const article = document.querySelector('#article');
    if (article === null) throw new Error('Dynamic fixture is missing');
    article.textContent = 'Before dynamic evidence after.';

    expect(
      anchorDocument(document, {
        exact: 'dynamic evidence',
        prefix: 'Before ',
        suffix: ' after.',
      }),
    ).toEqual({ status: 'marked', count: 1 });
  });

  test('renders hostile quotation text literally without creating attacker elements', () => {
    const document = fixture('hostile.html');

    expect(
      anchorDocument(document, {
        exact: '<img src=x onerror=alert(1)>',
        prefix: 'Evidence says ',
        suffix: ' literally.',
      }),
    ).toEqual({ status: 'marked', count: 1 });
    expect(document.querySelector('mark')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });

  test('keeps the current marker when a later anchoring attempt cannot find its quote', () => {
    const document = fixture('article.html');
    const firstSelector = {
      exact: 'retrieval quality matters',
      prefix: 'The evidence suggests ',
      suffix: ' more than window size.',
    };

    expect(anchorDocument(document, firstSelector)).toEqual({ status: 'marked', count: 3 });
    expect(
      anchorDocument(document, {
        exact: 'a quotation that is not on this page',
        prefix: '',
        suffix: '',
      }),
    ).toEqual({ status: 'not-found' });
    expect(
      [...document.querySelectorAll('mark[data-tracemark-anchor]')]
        .map((mark) => mark.textContent)
        .join(''),
    ).toBe('retrieval quality matters');
  });
});
