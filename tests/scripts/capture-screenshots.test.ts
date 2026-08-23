import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  SCREENSHOT_ASSETS,
  inspectPng,
  validateScreenshotAssets,
} from '../../scripts/capture-screenshots';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('screenshot asset validation', () => {
  test('declares the exact required store asset inventory', () => {
    expect(SCREENSHOT_ASSETS).toEqual([
      { path: 'docs/images/tracemark-library.png', width: 1280, height: 800 },
      { path: 'docs/images/tracemark-search.png', width: 1280, height: 800 },
      { path: 'docs/images/tracemark-local-ai.png', width: 1280, height: 800 },
      { path: 'docs/images/tracemark-promo-440x280.png', width: 440, height: 280 },
    ]);
  });

  test('reads PNG dimensions from a checked-in icon', async () => {
    await expect(inspectPng(resolve('public/icon/128.png'))).resolves.toMatchObject({
      width: 128,
      height: 128,
    });
  });

  test('reports missing, undersized, and dimensionally invalid assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-screenshot-check-'));
    temporaryDirectories.push(root);
    const firstAsset = SCREENSHOT_ASSETS[0];
    await mkdir(join(root, 'docs/images'), { recursive: true });
    await copyFile(resolve('public/icon/128.png'), join(root, firstAsset.path));

    const issues = await validateScreenshotAssets(root);

    expect(issues).toContain(`${firstAsset.path}: expected 1280x800, received 128x128`);
    expect(issues.some((issue) => issue.startsWith(`${SCREENSHOT_ASSETS[1].path}: missing`))).toBe(
      true,
    );
    expect(issues.some((issue) => issue.startsWith(`${firstAsset.path}: file is too small`))).toBe(
      true,
    );
  });
});
