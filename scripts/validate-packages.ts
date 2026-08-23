import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Browser = 'chrome' | 'firefox';

type Manifest = {
  manifest_version?: number;
  version?: string;
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: unknown[];
  side_panel?: unknown;
  sidebar_action?: unknown;
};

const outputDirectory = resolve('.output');
const requiredFiles = [
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
const privateMaterial = [
  /(^|\/)(?:\.env(?:\..*)?|id_rsa|credentials?|secrets?)(?:$|\/|\.)/iu,
  /\.(?:pem|p12|pfx|key)$/iu,
];

function archiveName(browser: Browser): string {
  return `tracemark-1.0.0-${browser}.zip`;
}

function listArchive(archivePath: string): string[] {
  return execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function readArchiveFile(archivePath: string, file: string): string {
  return execFileSync('unzip', ['-p', archivePath, file], { encoding: 'utf8' });
}

function validateContents(entries: string[], archive: string): string[] {
  const problems = requiredFiles
    .filter((file) => !entries.includes(file))
    .map((file) => `${archive} is missing required file ${file}`);

  for (const entry of entries) {
    if (/\.map$/iu.test(entry)) problems.push(`${archive} contains source map ${entry}`);
    if (privateMaterial.some((pattern) => pattern.test(entry))) {
      problems.push(`${archive} contains potential private material ${entry}`);
    }
  }

  return problems;
}

function validateManifest(browser: Browser, manifest: Manifest, archive: string): string[] {
  const problems: string[] = [];
  const expectedPermissions =
    browser === 'chrome'
      ? ['activeTab', 'scripting', 'contextMenus', 'storage', 'sidePanel']
      : ['activeTab', 'scripting', 'contextMenus', 'storage'];

  if (manifest.manifest_version !== 3) problems.push(`${archive} must use manifest_version 3`);
  if (manifest.version !== '1.0.0') problems.push(`${archive} must declare version 1.0.0`);
  if (JSON.stringify(manifest.permissions ?? []) !== JSON.stringify(expectedPermissions)) {
    problems.push(`${archive} has unexpected permissions`);
  }
  if ((manifest.host_permissions ?? []).length > 0) {
    problems.push(`${archive} must not request static host permissions`);
  }
  if (
    JSON.stringify(manifest.optional_host_permissions ?? []) !==
    JSON.stringify(['http://127.0.0.1:11434/*'])
  ) {
    problems.push(`${archive} must expose only the optional Ollama loopback host permission`);
  }
  if (manifest.content_scripts !== undefined) {
    problems.push(`${archive} must not declare static content scripts`);
  }
  if (
    browser === 'chrome' &&
    (manifest.side_panel === undefined || manifest.sidebar_action !== undefined)
  ) {
    problems.push(`${archive} must use Chrome side_panel and not Firefox sidebar_action`);
  }
  if (
    browser === 'firefox' &&
    (manifest.side_panel !== undefined || manifest.sidebar_action === undefined)
  ) {
    problems.push(`${archive} must use Firefox sidebar_action and not Chrome side_panel`);
  }

  return problems;
}

function validateArchive(browser: Browser): string[] {
  const name = archiveName(browser);
  const path = resolve(outputDirectory, name);
  if (!existsSync(path)) return [`Missing required release archive ${path}`];

  try {
    const entries = listArchive(path);
    const problems = validateContents(entries, name);
    const manifest = JSON.parse(readArchiveFile(path, 'manifest.json')) as Manifest;
    return [...problems, ...validateManifest(browser, manifest, name)];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [`Could not inspect ${name}: ${detail}`];
  }
}

const problems = (['chrome', 'firefox'] as const).flatMap(validateArchive);
if (problems.length > 0) {
  console.error(
    `Release package validation failed:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log('Release package validation passed for Chrome and Firefox v1.0.0 archives.');
}
