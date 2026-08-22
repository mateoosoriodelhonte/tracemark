import { describe, expect, test } from 'vitest';
import { findAnchor } from '../../src/domain/anchor';

describe('findAnchor', () => {
  test('finds a single exact quotation after normalizing layout whitespace', () => {
    expect(
      findAnchor('Before\n  exact quotation\t after.', {
        exact: 'exact quotation',
        prefix: 'Before ',
        suffix: ' after.',
      }),
    ).toEqual({ status: 'found', start: 7, end: 22 });
  });

  test('uses prefix and suffix only to choose a unique high-confidence repeat', () => {
    const text = 'Target context repeat here. Unrelated context repeat elsewhere.';

    expect(
      findAnchor(text, {
        exact: 'repeat',
        prefix: 'Target context ',
        suffix: ' here.',
      }),
    ).toEqual({ status: 'found', start: 15, end: 21 });
  });

  test('refuses repeated text with indistinguishable context', () => {
    expect(
      findAnchor('Before repeat after. Before repeat after.', {
        exact: 'repeat',
        prefix: 'Before ',
        suffix: ' after.',
      }),
    ).toEqual({ status: 'ambiguous' });
  });

  test('reports changed source text without fuzzy guessing', () => {
    expect(
      findAnchor('The publisher changed this passage.', {
        exact: 'original exact quotation',
        prefix: '',
        suffix: '',
      }),
    ).toEqual({ status: 'not-found' });
  });
});
