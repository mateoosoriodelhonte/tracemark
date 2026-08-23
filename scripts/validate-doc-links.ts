import { execFileSync } from 'node:child_process';
import { stat, readFile } from 'node:fs/promises';
import { posix, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

type MarkdownLink = {
  destination: string;
  line: number;
};

function extractMarkdownLinks(contents: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  let fence: '`' | '~' | undefined;

  for (const [index, line] of contents.split('\n').entries()) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/u);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0] as '`' | '~';
      if (fence === marker) fence = undefined;
      else if (!fence) fence = marker;
      continue;
    }
    if (fence) continue;

    const inlineLink = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)/gu;
    for (const match of line.matchAll(inlineLink)) {
      links.push({ destination: match[1]!, line: index + 1 });
    }

    const referenceLink = line.match(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/u);
    if (referenceLink) links.push({ destination: referenceLink[1]!, line: index + 1 });
  }

  return links;
}

function normalizeDestination(destination: string): string | undefined {
  const unwrapped =
    destination.startsWith('<') && destination.endsWith('>')
      ? destination.slice(1, -1)
      : destination;
  if (
    unwrapped.startsWith('#') ||
    unwrapped.startsWith('/') ||
    unwrapped.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/iu.test(unwrapped)
  ) {
    return undefined;
  }

  const path = unwrapped.split(/[?#]/u, 1)[0];
  if (!path) return undefined;
  return decodeURIComponent(path);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function validateTrackedMarkdownLinks(
  repositoryRoot: string,
  trackedFiles: string[],
): Promise<string[]> {
  const normalizedTrackedFiles = trackedFiles.map((file) => file.split(sep).join('/'));
  const tracked = new Set(normalizedTrackedFiles);
  const markdownFiles = normalizedTrackedFiles.filter((file) => file.toLowerCase().endsWith('.md'));
  const problems: string[] = [];

  for (const markdownFile of markdownFiles) {
    const contents = await readFile(resolve(repositoryRoot, markdownFile), 'utf8');
    for (const link of extractMarkdownLinks(contents)) {
      let destination: string | undefined;
      try {
        destination = normalizeDestination(link.destination);
      } catch {
        problems.push(
          `${markdownFile}:${link.line} has an invalid encoded link ${link.destination}`,
        );
        continue;
      }
      if (!destination) continue;

      const target = posix
        .normalize(posix.join(posix.dirname(markdownFile), destination))
        .replace(/\/$/u, '');
      if (target === '..' || target.startsWith('../')) {
        problems.push(
          `${markdownFile}:${link.line} relative link escapes the repository: ${link.destination}`,
        );
        continue;
      }

      const trackedTarget =
        tracked.has(target) || normalizedTrackedFiles.some((file) => file.startsWith(`${target}/`));
      if (!trackedTarget || !(await pathExists(resolve(repositoryRoot, target)))) {
        problems.push(`${markdownFile}:${link.line} links to missing or untracked ${target}`);
      }
    }
  }

  return problems;
}

function listTrackedFiles(repositoryRoot: string): string[] {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
}

async function main(): Promise<void> {
  const repositoryRoot = resolve('.');
  const problems = await validateTrackedMarkdownLinks(
    repositoryRoot,
    listTrackedFiles(repositoryRoot),
  );
  if (problems.length > 0) {
    throw new Error(
      `Documentation link validation failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
    );
  }
  console.log('Tracked relative Markdown links resolve to checked-in files.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
