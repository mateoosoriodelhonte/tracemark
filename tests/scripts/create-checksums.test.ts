import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createReleaseChecksums } from '../../scripts/create-checksums';

const temporaryDirectories: string[] = [];

async function makeOutputDirectory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tracemark-checksums-'));
  temporaryDirectories.push(root);
  const outputDirectory = join(root, '.output');
  await mkdir(outputDirectory);
  return outputDirectory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('release checksums', () => {
  test('writes sorted portable SHA-256 lines for only the two browser archives', async () => {
    const outputDirectory = await makeOutputDirectory();
    const chrome = Buffer.from('chrome archive fixture');
    const firefox = Buffer.from('firefox archive fixture');
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-firefox.zip'), firefox);
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-sources.zip'), 'review sources');
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-chrome.zip'), chrome);

    await createReleaseChecksums(outputDirectory);

    const expected = [
      `${createHash('sha256').update(chrome).digest('hex')}  tracemark-1.0.0-chrome.zip`,
      `${createHash('sha256').update(firefox).digest('hex')}  tracemark-1.0.0-firefox.zip`,
      '',
    ].join('\n');
    expect(await readFile(join(outputDirectory, 'SHA256SUMS'), 'utf8')).toBe(expected);
  });

  test('rejects a missing required browser archive without writing an inventory', async () => {
    const outputDirectory = await makeOutputDirectory();
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-chrome.zip'), 'chrome');

    await expect(createReleaseChecksums(outputDirectory)).rejects.toThrow(
      'Missing required release archive tracemark-1.0.0-firefox.zip',
    );
    await expect(readFile(join(outputDirectory, 'SHA256SUMS'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  test('rejects stale browser release archives that make the output ambiguous', async () => {
    const outputDirectory = await makeOutputDirectory();
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-chrome.zip'), 'chrome');
    await writeFile(join(outputDirectory, 'tracemark-1.0.0-firefox.zip'), 'firefox');
    await writeFile(join(outputDirectory, 'tracemark-0.9.0-chrome.zip'), 'stale');

    await expect(createReleaseChecksums(outputDirectory)).rejects.toThrow(
      'Unexpected browser release archive tracemark-0.9.0-chrome.zip',
    );
  });
});
