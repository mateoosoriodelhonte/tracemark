import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type SecretScanRunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type SecretScanRunner = (repositoryRoot: string, pattern: string) => SecretScanRunResult;

function sensitivePattern(): string {
  const expressions = [
    `${['gh', 'o_'].join('')}[A-Za-z0-9]{20,}`,
    `${['github', '_pat_'].join('')}[A-Za-z0-9_]{20,}`,
    `${['s', 'k-'].join('')}[A-Za-z0-9_-]{20,}`,
    ['BEGIN ', '(RSA|OPENSSH)', ' PRIVATE KEY'].join(''),
  ];
  return `(${expressions.join('|')})`;
}

export function runGitSecretScan(repositoryRoot: string, pattern: string): SecretScanRunResult {
  const result = spawnSync('git', ['grep', '-l', '-z', '-E', pattern, '--', '.'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

export function scanTrackedFilesForSecrets(
  repositoryRoot = resolve('.'),
  runner: SecretScanRunner = runGitSecretScan,
): string[] {
  let result: SecretScanRunResult;
  try {
    result = runner(repositoryRoot, sensitivePattern());
  } catch {
    throw new Error('Tracked secret scan runner failed.');
  }

  if (result.error || result.status === null) {
    throw new Error('Tracked secret scan could not be started.');
  }
  if (result.status === 1) {
    if (result.stdout.length > 0) {
      throw new Error('Tracked secret scan returned an inconsistent no-match result.');
    }
    return [];
  }
  if (result.status !== 0) {
    throw new Error(`Tracked secret scan failed to execute (exit ${result.status}).`);
  }

  const filenames = [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
  if (filenames.length === 0) {
    throw new Error('Tracked secret scan reported matches without filenames.');
  }
  throw new Error(
    `Potential secret pattern found in tracked files:\n${filenames.map((file) => `- ${file}`).join('\n')}`,
  );
}

function main(): void {
  scanTrackedFilesForSecrets();
  console.log('No secret patterns found in tracked files.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Tracked secret scan failed.');
    process.exitCode = 1;
  }
}
