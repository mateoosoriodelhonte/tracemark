import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
    };
  };
};

const packageRoot = resolve('.output');

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
  expect(entries).toEqual(
    expect.arrayContaining([
      'manifest.json',
      'background.js',
      'popup.html',
      'sidepanel.html',
      'icon/16.png',
      'icon/32.png',
      'icon/48.png',
      'icon/96.png',
      'icon/128.png',
    ]),
  );

  expect(entries).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\.map$/iu),
      expect.stringMatching(/(^|\/)(?:\.env(?:\..*)?|id_rsa|credentials?|secrets?)(?:$|\/|\.)/iu),
      expect.stringMatching(/\.(?:pem|p12|pfx|key)$/iu),
    ]),
  );
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

  test.each([
    ['Chrome', 'tracemark-1.0.0-chrome.zip'],
    ['Firefox', 'tracemark-1.0.0-firefox.zip'],
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
    });
  });
});
