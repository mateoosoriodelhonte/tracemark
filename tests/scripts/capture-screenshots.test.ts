import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  SCREENSHOT_ASSETS,
  inspectPng,
  stageAndPromoteScreenshotAssets,
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

  test.each([
    [
      'corrupt CRC',
      (png: Buffer) => {
        const corrupted = Buffer.from(png);
        corrupted[130] = corrupted[130]! ^ 0xff;
        return corrupted;
      },
    ],
    ['truncated IEND', (png: Buffer) => png.subarray(0, -4)],
    ['padded trailing data', (png: Buffer) => Buffer.concat([png, Buffer.from([0])])],
  ])('rejects a PNG with %s', async (_, mutate) => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-png-check-'));
    temporaryDirectories.push(root);
    const path = join(root, 'invalid.png');
    await writeFile(path, mutate(await readFile(resolve('public/icon/128.png'))));

    await expect(inspectPng(path)).rejects.toThrow();
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

  test('generation failure leaves every canonical screenshot unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-screenshot-transaction-'));
    temporaryDirectories.push(root);
    const before = new Map<string, Buffer>();
    for (const [index, asset] of SCREENSHOT_ASSETS.entries()) {
      const contents = Buffer.from(`canonical-${index}`);
      before.set(asset.path, contents);
      await mkdir(join(root, asset.path, '..'), { recursive: true });
      await writeFile(join(root, asset.path), contents);
    }

    await expect(
      stageAndPromoteScreenshotAssets(root, async (stagedRoot) => {
        const first = SCREENSHOT_ASSETS[0];
        await mkdir(join(stagedRoot, first.path, '..'), { recursive: true });
        await writeFile(join(stagedRoot, first.path), 'partial-new-image');
        throw new Error('capture failed');
      }),
    ).rejects.toThrow('capture failed');

    for (const asset of SCREENSHOT_ASSETS) {
      expect(await readFile(join(root, asset.path))).toEqual(before.get(asset.path));
    }
    expect((await readdir(join(root, 'docs'))).filter((name) => name.startsWith('.'))).toEqual([]);
  });

  test('staged validation failure leaves every canonical screenshot unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-screenshot-validation-'));
    temporaryDirectories.push(root);
    const before = new Map<string, Buffer>();
    for (const [index, asset] of SCREENSHOT_ASSETS.entries()) {
      const contents = Buffer.from(`canonical-${index}`);
      before.set(asset.path, contents);
      await mkdir(join(root, asset.path, '..'), { recursive: true });
      await writeFile(join(root, asset.path), contents);
    }

    await expect(
      stageAndPromoteScreenshotAssets(root, async (stagedRoot) => {
        for (const asset of SCREENSHOT_ASSETS) {
          await mkdir(join(stagedRoot, asset.path, '..'), { recursive: true });
          await copyFile(resolve('public/icon/128.png'), join(stagedRoot, asset.path));
        }
      }),
    ).rejects.toThrow(/validation failed/i);

    for (const asset of SCREENSHOT_ASSETS) {
      expect(await readFile(join(root, asset.path))).toEqual(before.get(asset.path));
    }
  });
});
