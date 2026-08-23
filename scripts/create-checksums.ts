import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RELEASE_ARCHIVES = [
  'tracemark-1.0.0-chrome.zip',
  'tracemark-1.0.0-firefox.zip',
] as const;

const browserArchivePattern = /^tracemark-.+-(?:chrome|firefox)\.zip$/u;

export async function createReleaseChecksums(outputDirectory = resolve('.output')): Promise<void> {
  const entries = await readdir(outputDirectory);

  for (const archive of RELEASE_ARCHIVES) {
    if (!entries.includes(archive)) {
      throw new Error(`Missing required release archive ${archive}`);
    }
  }

  const unexpectedArchive = entries.find(
    (entry) =>
      browserArchivePattern.test(entry) && !RELEASE_ARCHIVES.some((archive) => archive === entry),
  );
  if (unexpectedArchive) {
    throw new Error(`Unexpected browser release archive ${unexpectedArchive}`);
  }

  const lines = await Promise.all(
    [...RELEASE_ARCHIVES].sort().map(async (archive) => {
      const contents = await readFile(join(outputDirectory, archive));
      const checksum = createHash('sha256').update(contents).digest('hex');
      return `${checksum}  ${archive}`;
    }),
  );

  await writeFile(join(outputDirectory, 'SHA256SUMS'), `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  await createReleaseChecksums();
  console.log(
    `Created ${basename(resolve('.output/SHA256SUMS'))} for ${RELEASE_ARCHIVES.join(' and ')}.`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
