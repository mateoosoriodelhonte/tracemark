import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  runGitSecretScan,
  scanTrackedFilesForSecrets,
  type SecretScanRunResult,
} from '../../scripts/scan-secrets';

const temporaryDirectories: string[] = [];

function result(overrides: Partial<SecretScanRunResult>): SecretScanRunResult {
  return {
    status: 1,
    stdout: '',
    stderr: '',
    ...overrides,
  };
}

async function makeRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'tracemark-secret-scan-'));
  temporaryDirectories.push(root);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  await mkdir(join(root, 'src'));
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('tracked secret scan result handling', () => {
  test('accepts only the explicit no-match status', () => {
    expect(scanTrackedFilesForSecrets('/repo', () => result({ status: 1 }))).toEqual([]);
  });

  test('fails closed when a no-match status includes unexpected output', () => {
    expect(() =>
      scanTrackedFilesForSecrets('/repo', () => result({ status: 1, stdout: 'unexpected\0' })),
    ).toThrowError('Tracked secret scan returned an inconsistent no-match result.');
  });

  test('reports matches as sorted filenames without matched contents', () => {
    const sensitiveFixture = `${['gh', 'o_'].join('')}${'a'.repeat(24)}`;
    const runner = () =>
      result({
        status: 0,
        stdout: 'src/z.ts\0src/a.ts\0src/z.ts\0',
        stderr: `must not leak ${sensitiveFixture}`,
      });

    expect(() => scanTrackedFilesForSecrets('/repo', runner)).toThrowError(
      ['Potential secret pattern found in tracked files:', '- src/a.ts', '- src/z.ts'].join('\n'),
    );
    try {
      scanTrackedFilesForSecrets('/repo', runner);
    } catch (error) {
      expect(String(error)).not.toContain(sensitiveFixture);
    }
  });

  test('fails closed when the scan command exits with an execution error', () => {
    expect(() =>
      scanTrackedFilesForSecrets('/repo', () =>
        result({ status: 2, stderr: 'fatal: simulated git failure' }),
      ),
    ).toThrowError('Tracked secret scan failed to execute (exit 2).');
  });

  test('fails closed when the scan process cannot be spawned', () => {
    expect(() =>
      scanTrackedFilesForSecrets('/repo', () =>
        result({ status: null, error: new Error('spawn git ENOENT') }),
      ),
    ).toThrowError('Tracked secret scan could not be started.');
  });

  test('fails closed when an injected runner throws', () => {
    expect(() =>
      scanTrackedFilesForSecrets('/repo', () => {
        throw new Error('runner failed');
      }),
    ).toThrowError('Tracked secret scan runner failed.');
  });
});

describe('git-backed tracked secret scan', () => {
  test('detects every supported credential family in tracked text and reports filenames only', async () => {
    const root = await makeRepository();
    const sensitiveFixtures = [
      `${['gh', 'o_'].join('')}${'a'.repeat(24)}`,
      `${['github', '_pat_'].join('')}${'b'.repeat(24)}`,
      `${['s', 'k-'].join('')}${'c'.repeat(24)}`,
      `-----${['BEGIN ', 'RSA', ' PRIVATE KEY'].join('')}-----`,
      `-----${['BEGIN ', 'OPENSSH', ' PRIVATE KEY'].join('')}-----`,
    ];
    await writeFile(join(root, 'src', 'clean.ts'), 'export const clean = true;\n');
    await writeFile(join(root, 'src', 'credentials.txt'), sensitiveFixtures.join('\n'));
    execFileSync('git', ['add', '.'], { cwd: root });

    expect(() => scanTrackedFilesForSecrets(root, runGitSecretScan)).toThrowError(
      ['Potential secret pattern found in tracked files:', '- src/credentials.txt'].join('\n'),
    );
  });

  test('does not scan untracked files', async () => {
    const root = await makeRepository();
    const sensitiveFixture = `${['gh', 'o_'].join('')}${'a'.repeat(24)}`;
    await writeFile(join(root, 'src', 'tracked.ts'), 'export const clean = true;\n');
    execFileSync('git', ['add', 'src/tracked.ts'], { cwd: root });
    await writeFile(join(root, 'src', 'local-only.txt'), sensitiveFixture);

    expect(scanTrackedFilesForSecrets(root, runGitSecretScan)).toEqual([]);
  });
});
