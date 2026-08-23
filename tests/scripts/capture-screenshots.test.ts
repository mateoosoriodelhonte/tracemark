import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename as renamePath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  SCREENSHOT_ASSETS,
  inspectPng,
  stageAndPromoteScreenshotAssets,
  validateScreenshotAssets,
} from '../../scripts/capture-screenshots';

const temporaryDirectories: string[] = [];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(contents: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data = Buffer.alloc(0)): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return chunk;
}

function imageHeader(colorType = 2): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(1, 0);
  data.writeUInt32BE(1, 4);
  data[8] = 8;
  data[9] = colorType;
  return pngChunk('IHDR', data);
}

const onePixelImageData = pngChunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0])));
const imageEnd = pngChunk('IEND');

function pngWith(...chunks: Buffer[]): Buffer {
  return Buffer.concat([pngSignature, ...chunks]);
}

async function writeCanonicalSentinels(root: string): Promise<Map<string, Buffer>> {
  const before = new Map<string, Buffer>();
  for (const [index, asset] of SCREENSHOT_ASSETS.entries()) {
    const contents = Buffer.from(`canonical-${index}`);
    before.set(asset.path, contents);
    await mkdir(join(root, asset.path, '..'), { recursive: true });
    await writeFile(join(root, asset.path), contents);
  }
  return before;
}

async function stageCheckedInAssets(stagedRoot: string): Promise<void> {
  for (const asset of SCREENSHOT_ASSETS) {
    await mkdir(join(stagedRoot, asset.path, '..'), { recursive: true });
    await copyFile(resolve(asset.path), join(stagedRoot, asset.path));
  }
}

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

  test('fully decodes a checked-in generated screenshot', async () => {
    await expect(inspectPng(resolve(SCREENSHOT_ASSETS[0].path))).resolves.toMatchObject({
      width: 1280,
      height: 800,
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
    await writeFile(path, mutate(await readFile(resolve(SCREENSHOT_ASSETS[0].path))));

    await expect(inspectPng(path)).rejects.toThrow();
  });

  test.each([
    ['indexed color without PLTE', pngWith(imageHeader(3), onePixelImageData, imageEnd)],
    [
      'unknown critical chunk',
      pngWith(imageHeader(), pngChunk('ABCD'), onePixelImageData, imageEnd),
    ],
    ['IDAT before IHDR', pngWith(onePixelImageData, imageHeader(), imageEnd)],
    [
      'non-consecutive IDAT chunks',
      pngWith(imageHeader(), onePixelImageData, pngChunk('tEXt'), onePixelImageData, imageEnd),
    ],
    ['missing IDAT', pngWith(imageHeader(), imageEnd)],
    [
      'large ancillary padding',
      pngWith(imageHeader(), pngChunk('tEXt', Buffer.alloc(12_000)), onePixelImageData, imageEnd),
    ],
  ])('rejects unsupported generated-asset structure: %s', async (_, contents) => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-png-structure-'));
    temporaryDirectories.push(root);
    const path = join(root, 'invalid.png');
    await writeFile(path, contents);

    await expect(inspectPng(path)).rejects.toThrow();
  });

  test('reports missing, undersized, and dimensionally invalid assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-screenshot-check-'));
    temporaryDirectories.push(root);
    const firstAsset = SCREENSHOT_ASSETS[0];
    await mkdir(join(root, 'docs/images'), { recursive: true });
    await writeFile(
      join(root, firstAsset.path),
      pngWith(imageHeader(), onePixelImageData, imageEnd),
    );

    const issues = await validateScreenshotAssets(root);

    expect(issues).toContain(`${firstAsset.path}: expected 1280x800, received 1x1`);
    expect(issues.some((issue) => issue.startsWith(`${SCREENSHOT_ASSETS[1].path}: missing`))).toBe(
      true,
    );
    expect(
      issues.some((issue) =>
        issue.startsWith(`${firstAsset.path}: compressed image data is too small`),
      ),
    ).toBe(true);
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

  test('promotion failure restores every canonical asset and cleans the transaction', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-promotion-rollback-'));
    temporaryDirectories.push(root);
    const before = await writeCanonicalSentinels(root);
    let renameCall = 0;

    await expect(
      stageAndPromoteScreenshotAssets(root, stageCheckedInAssets, {
        async rename(from, to) {
          renameCall += 1;
          if (renameCall === 2) throw new Error('injected promotion failure');
          await renamePath(from, to);
        },
        remove: rm,
      }),
    ).rejects.toThrow('injected promotion failure');

    for (const asset of SCREENSHOT_ASSETS) {
      expect(await readFile(join(root, asset.path))).toEqual(before.get(asset.path));
    }
    expect((await readdir(join(root, 'docs'))).filter((name) => name.startsWith('.'))).toEqual([]);
  });

  test('rollback failure preserves and reports the only canonical recovery directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tracemark-promotion-recovery-'));
    temporaryDirectories.push(root);
    const before = await writeCanonicalSentinels(root);
    const remove = vi.fn(rm);
    let renameCall = 0;
    let failure: unknown;

    try {
      await stageAndPromoteScreenshotAssets(root, stageCheckedInAssets, {
        async rename(from, to) {
          renameCall += 1;
          if (renameCall === 2) throw new Error('injected promotion failure');
          if (renameCall === 3) throw new Error('injected rollback failure');
          await renamePath(from, to);
        },
        remove,
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    const transactionNames = (await readdir(join(root, 'docs'))).filter((name) =>
      name.startsWith('.tracemark-screenshots-'),
    );
    expect(transactionNames).toHaveLength(1);
    const recoveryPath = join(root, 'docs', transactionNames[0]!, 'previous-images');
    expect((failure as Error).message).toContain(recoveryPath);
    for (const asset of SCREENSHOT_ASSETS) {
      expect(await readFile(join(recoveryPath, asset.path.replace('docs/images/', '')))).toEqual(
        before.get(asset.path),
      );
    }
    expect(remove).not.toHaveBeenCalled();
  });
});
