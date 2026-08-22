import { describe, expect, test } from 'vitest';
import { safeCanonicalUrl, safeSourceUrl } from '../../src/domain/urls';

describe('source URL safety', () => {
  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'chrome://extensions',
    'about:config',
    'moz-extension://trace/library.html',
    'not a url',
  ])('rejects non-web source %s', (value) => {
    expect(safeSourceUrl(value)).toBeUndefined();
  });

  test('removes credentials and fragments while retaining source query parameters', () => {
    expect(safeSourceUrl('https://user:pass@example.com/a?q=rag#secret')).toBe(
      'https://example.com/a?q=rag',
    );
  });

  test('resolves a relative canonical URL only against the same origin', () => {
    expect(safeCanonicalUrl('/canonical', 'https://example.com/article')).toBe(
      'https://example.com/canonical',
    );
    expect(
      safeCanonicalUrl('https://attacker.example/canonical', 'https://example.com/article'),
    ).toBeUndefined();
  });
});
