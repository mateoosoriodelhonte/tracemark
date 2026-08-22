import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

type Manifest = {
  manifest_version: number;
  name?: string;
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  commands?: Record<string, unknown>;
  icons?: Record<string, string>;
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

function readManifest(target: 'chrome-mv3' | 'firefox-mv3'): Manifest {
  const path = resolve('.output', target, 'manifest.json');
  expect(existsSync(path), `expected ${target} to be built`).toBe(true);
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

describe.each(['chrome-mv3', 'firefox-mv3'] as const)('%s manifest', (target) => {
  test('ships Manifest V3 with only deliberate-access permissions', () => {
    const manifest = readManifest(target);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('TraceMark');
    expect(manifest.permissions).toEqual(
      target === 'chrome-mv3'
        ? ['activeTab', 'scripting', 'contextMenus', 'storage', 'sidePanel']
        : ['activeTab', 'scripting', 'contextMenus', 'storage'],
    );
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
  });

  test('offers Ollama only as an optional loopback host', () => {
    const manifest = readManifest(target);

    expect(manifest.optional_host_permissions).toEqual(['http://127.0.0.1:11434/*']);
  });

  test('declares the user-invoked save command', () => {
    const manifest = readManifest(target);

    expect(manifest.commands).toMatchObject({
      'save-selection': {
        description: 'Save selected text to TraceMark',
        suggested_key: { default: 'Alt+Shift+S' },
      },
    });
  });

  test('includes production toolbar and store icons', () => {
    const manifest = readManifest(target);

    expect(manifest.icons).toEqual({
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    });
  });
});

test('Chrome exposes the research library as a side panel', () => {
  const manifest = readManifest('chrome-mv3');

  expect(manifest.permissions).toContain('sidePanel');
  expect(manifest.side_panel).toBeDefined();
  expect(manifest.sidebar_action).toBeUndefined();
});

test('Firefox exposes the research library as a native sidebar', () => {
  const manifest = readManifest('firefox-mv3');

  expect(manifest.sidebar_action).toBeDefined();
  expect(manifest.side_panel).toBeUndefined();
  expect(manifest.browser_specific_settings?.gecko).toEqual({
    id: 'tracemark@mateoosoriodelhonte.github.io',
    strict_min_version: '142.0',
    data_collection_permissions: {
      required: ['none'],
      optional: ['websiteContent'],
    },
  });
});
