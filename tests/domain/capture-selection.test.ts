import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';
import { captureDocumentSelection } from '../../src/domain/capture-selection';

function selectedDocument(options: { url?: string; canonical?: string } = {}) {
  const canonical = options.canonical ?? '/canonical';
  const dom = new JSDOM(
    `<!doctype html>
      <title>&lt;img src=x onerror=alert(1)&gt;</title>
      <link rel="canonical" href="${canonical}">
      <main>
        <h2>Evidence review</h2>
        <p id="source">Before the exact quotation after the finding.</p>
      </main>`,
    { url: options.url ?? 'https://example.com/article#private-fragment' },
  );
  const document = dom.window.document;
  const text = document.querySelector('#source')?.firstChild;
  if (text === null || text === undefined) throw new Error('Fixture text missing');
  const range = document.createRange();
  range.setStart(text, 11);
  range.setEnd(text, 26);

  return {
    document,
    selection: {
      rangeCount: 1,
      isCollapsed: false,
      getRangeAt: () => range,
      toString: () => 'exact\nquotation',
    },
  };
}

describe('captureDocumentSelection', () => {
  test('preserves the exact selected string and captures bounded provenance as inert text', () => {
    const { document, selection } = selectedDocument();

    expect(captureDocumentSelection(document, selection)).toEqual({
      status: 'captured',
      value: {
        quote: 'exact\nquotation',
        prefix: 'Before the ',
        suffix: ' after the finding.',
        heading: 'Evidence review',
        context: 'Before the exact quotation after the finding.',
        title: '<img src=x onerror=alert(1)>',
        url: 'https://example.com/article',
        canonicalUrl: 'https://example.com/canonical',
      },
    });
  });

  test('ignores a cross-origin canonical URL', () => {
    const { document, selection } = selectedDocument({ canonical: 'https://tracker.example/a' });

    const result = captureDocumentSelection(document, selection);

    expect(result.status).toBe('captured');
    if (result.status === 'captured') expect(result.value).not.toHaveProperty('canonicalUrl');
  });

  test('returns a typed empty-selection result', () => {
    const { document, selection } = selectedDocument();

    expect(
      captureDocumentSelection(document, {
        ...selection,
        isCollapsed: true,
        toString: () => '',
      }),
    ).toEqual({ status: 'no-selection' });
  });

  test('rejects documents whose source cannot be represented as HTTP(S)', () => {
    const { document, selection } = selectedDocument({ url: 'about:blank' });

    expect(captureDocumentSelection(document, selection)).toEqual({ status: 'unsupported' });
  });
});
