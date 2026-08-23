import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';

type Manifest = {
  manifest_version: number;
  version: string;
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: unknown[];
  side_panel?: unknown;
  sidebar_action?: unknown;
  browser_specific_settings?: {
    gecko?: {
      id?: string;
      strict_min_version?: string;
      data_collection_permissions?: {
        required?: string[];
        optional?: string[];
      };
    };
  };
};

const packageRoot = resolve('.output');
const chromeArchiveName = 'tracemark-1.0.0-chrome.zip';
const firefoxArchiveName = 'tracemark-1.0.0-firefox.zip';
const requiredPackageFiles = [
  'manifest.json',
  'background.js',
  'popup.html',
  'sidepanel.html',
  'icon/16.png',
  'icon/32.png',
  'icon/48.png',
  'icon/96.png',
  'icon/128.png',
];

function readArchiveEntries(archiveName: string): string[] {
  const archivePath = resolve(packageRoot, archiveName);
  expect(existsSync(archivePath), `expected release archive ${archiveName}`).toBe(true);

  return execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function readArchiveManifest(archiveName: string): Manifest {
  const archivePath = resolve(packageRoot, archiveName);
  readArchiveEntries(archiveName);
  const manifest = execFileSync('unzip', ['-p', archivePath, 'manifest.json'], {
    encoding: 'utf8',
  });

  return JSON.parse(manifest) as Manifest;
}

function expectSafePackageContents(entries: string[]): void {
  expect(entries).toEqual(expect.arrayContaining(requiredPackageFiles));

  expect(entries).not.toContainEqual(expect.stringMatching(/\.map$/iu));
  expect(entries).not.toContainEqual(
    expect.stringMatching(/(^|\/)(?:\.env(?:\..*)?|id_rsa|credentials?|secrets?)(?:$|\/|\.)/iu),
  );
  expect(entries).not.toContainEqual(expect.stringMatching(/\.(?:pem|p12|pfx|key)$/iu));
}

function runPackageValidatorWithChromeEntry(entryName: string): SpawnSyncReturns<string> {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'tracemark-package-validation-'));
  const outputDirectory = join(temporaryRoot, '.output');
  mkdirSync(outputDirectory);

  try {
    copyFileSync(resolve(packageRoot, chromeArchiveName), join(outputDirectory, chromeArchiveName));
    copyFileSync(
      resolve(packageRoot, firefoxArchiveName),
      join(outputDirectory, firefoxArchiveName),
    );
    writeFileSync(join(outputDirectory, entryName), 'fixture');
    execFileSync('zip', ['-q', chromeArchiveName, entryName], { cwd: outputDirectory });

    return spawnSync(
      'node',
      ['--experimental-strip-types', resolve('scripts/validate-packages.ts')],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

function runPackageValidatorWithFirefoxManifest(
  updateManifest: (manifest: Manifest) => void,
): SpawnSyncReturns<string> {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'tracemark-package-validation-'));
  const outputDirectory = join(temporaryRoot, '.output');
  mkdirSync(outputDirectory);

  try {
    copyFileSync(resolve(packageRoot, chromeArchiveName), join(outputDirectory, chromeArchiveName));
    copyFileSync(
      resolve(packageRoot, firefoxArchiveName),
      join(outputDirectory, firefoxArchiveName),
    );
    const manifest = readArchiveManifest(firefoxArchiveName);
    updateManifest(manifest);
    writeFileSync(join(temporaryRoot, 'manifest.json'), JSON.stringify(manifest));
    execFileSync('zip', ['-q', join(outputDirectory, firefoxArchiveName), 'manifest.json'], {
      cwd: temporaryRoot,
    });

    return spawnSync(
      'node',
      ['--experimental-strip-types', resolve('scripts/validate-packages.ts')],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

describe('v1.0.0 release packages', () => {
  test('release validation command accepts the built archives', () => {
    const result = spawnSync(
      'node',
      ['--experimental-strip-types', 'scripts/validate-packages.ts'],
      {
        encoding: 'utf8',
      },
    );

    expect(result.status, result.stderr).toBe(0);
  });

  test('release validation rejects source maps regardless of filename case', () => {
    const result = runPackageValidatorWithChromeEntry('bundle.MAP');

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('contains source map bundle.MAP');
  });

  test('release validation rejects incomplete Firefox built-in data consent', () => {
    const result = runPackageValidatorWithFirefoxManifest((manifest) => {
      manifest.browser_specific_settings!.gecko!.data_collection_permissions!.optional = [
        'websiteContent',
      ];
    });

    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('has unexpected Firefox data collection permissions');
  });

  test.each(['bundle.MAP', 'credentials.json', 'secret.key'])(
    'package-content assertions reject %s when it is the only unsafe entry',
    (unsafeEntry) => {
      expect(() => expectSafePackageContents([...requiredPackageFiles, unsafeEntry])).toThrow();
    },
  );

  test.each([
    ['Chrome', chromeArchiveName],
    ['Firefox', firefoxArchiveName],
  ])('%s ships the exact release archive with only store-safe files', (_browser, archiveName) => {
    const entries = readArchiveEntries(archiveName);

    expectSafePackageContents(entries);
  });

  test('Chrome package uses a side panel without static website access', () => {
    const manifest = readArchiveManifest('tracemark-1.0.0-chrome.zip');

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.permissions).toEqual([
      'activeTab',
      'scripting',
      'contextMenus',
      'storage',
      'sidePanel',
    ]);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.optional_host_permissions).toEqual(['http://127.0.0.1:11434/*']);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.side_panel).toBeDefined();
    expect(manifest.sidebar_action).toBeUndefined();
  });

  test('Firefox package uses a native sidebar without static website access', () => {
    const manifest = readArchiveManifest('tracemark-1.0.0-firefox.zip');

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.permissions).toEqual(['activeTab', 'scripting', 'contextMenus', 'storage']);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.optional_host_permissions).toEqual(['http://127.0.0.1:11434/*']);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.side_panel).toBeUndefined();
    expect(manifest.sidebar_action).toBeDefined();
    expect(manifest.browser_specific_settings?.gecko).toMatchObject({
      id: 'tracemark@mateoosoriodelhonte.github.io',
      strict_min_version: '142.0',
      data_collection_permissions: {
        required: ['none'],
        optional: ['websiteContent', 'browsingActivity'],
      },
    });
  });
});
