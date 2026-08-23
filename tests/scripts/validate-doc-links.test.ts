import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { validateTrackedMarkdownLinks } from '../../scripts/validate-doc-links';

const temporaryDirectories: string[] = [];

async function makeRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tracemark-doc-links-'));
  temporaryDirectories.push(root);
  await mkdir(join(root, 'docs', 'images'), { recursive: true });
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('tracked Markdown links', () => {
  test('accepts tracked relative files, encoded paths, fragments, images, and directories', async () => {
    const root = await makeRepository();
    await writeFile(
      join(root, 'README.md'),
      [
        '[Guide](docs/Guide%20One.md#usage)',
        '![Preview](docs/images/preview.png)',
        '[Docs](docs/)',
        '[Web](https://example.com/reference)',
        '[Section](#local-section)',
        '',
        '```md',
        '[Illustrative missing link](missing-example.md)',
        '```',
      ].join('\n'),
    );
    await writeFile(join(root, 'docs', 'Guide One.md'), '# Guide');
    await writeFile(join(root, 'docs', 'images', 'preview.png'), 'png');

    await expect(
      validateTrackedMarkdownLinks(root, [
        'README.md',
        'docs/Guide One.md',
        'docs/images/preview.png',
      ]),
    ).resolves.toEqual([]);
  });

  test('reports a missing relative target with its source location', async () => {
    const root = await makeRepository();
    await writeFile(join(root, 'docs', 'guide.md'), 'See [missing](../MISSING.md).\n');

    await expect(validateTrackedMarkdownLinks(root, ['docs/guide.md'])).resolves.toEqual([
      'docs/guide.md:1 links to missing or untracked MISSING.md',
    ]);
  });

  test('rejects a link to a local file that is not part of the tracked artifact set', async () => {
    const root = await makeRepository();
    await writeFile(join(root, 'README.md'), '[Local notes](notes.md)\n');
    await writeFile(join(root, 'notes.md'), 'not checked in');

    await expect(validateTrackedMarkdownLinks(root, ['README.md'])).resolves.toEqual([
      'README.md:1 links to missing or untracked notes.md',
    ]);
  });

  test('reports a relative link that escapes the repository root', async () => {
    const root = await makeRepository();
    await writeFile(join(root, 'README.md'), '[Outside](../outside.md)\n');

    await expect(validateTrackedMarkdownLinks(root, ['README.md'])).resolves.toEqual([
      'README.md:1 relative link escapes the repository: ../outside.md',
    ]);
  });
});
