import { mkdir, mkdtemp, readFile, rename, rm, stat } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';

interface ScreenshotAsset {
  path: string;
  width: number;
  height: number;
}

interface PngDetails {
  width: number;
  height: number;
  size: number;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MINIMUM_ASSET_SIZE = 10_000;
const STORE_SCREENSHOT_VIEWPORT = { width: 1280, height: 800 };
const PROMO_VIEWPORT = { width: 440, height: 280 };
const MAXIMUM_DECODED_SIZE = 512 * 1024 * 1024;

export const SCREENSHOT_ASSETS = [
  { path: 'docs/images/tracemark-library.png', width: 1280, height: 800 },
  { path: 'docs/images/tracemark-search.png', width: 1280, height: 800 },
  { path: 'docs/images/tracemark-local-ai.png', width: 1280, height: 800 },
  { path: 'docs/images/tracemark-promo-440x280.png', width: 440, height: 280 },
] as const satisfies readonly ScreenshotAsset[];

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

function scanlineSizes(
  width: number,
  height: number,
  bitsPerPixel: number,
  interlaced: boolean,
): number[] {
  if (!interlaced)
    return Array.from({ length: height }, () => Math.ceil((width * bitsPerPixel) / 8));

  const passes = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2],
  ] as const;
  const sizes: number[] = [];
  for (const [startX, startY, stepX, stepY] of passes) {
    const passWidth = width <= startX ? 0 : Math.ceil((width - startX) / stepX);
    const passHeight = height <= startY ? 0 : Math.ceil((height - startY) / stepY);
    const bytes = Math.ceil((passWidth * bitsPerPixel) / 8);
    for (let row = 0; row < passHeight && passWidth > 0; row += 1) sizes.push(bytes);
  }
  return sizes;
}

function decodePng(contents: Buffer): { width: number; height: number } {
  if (contents.length < 8 || !contents.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('not a PNG file');
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitsPerPixel = 0;
  let interlaced = false;
  let sawHeader = false;
  let sawEnd = false;
  const compressed: Buffer[] = [];

  while (offset < contents.length) {
    if (contents.length - offset < 12) throw new Error('PNG has a truncated chunk');
    const length = contents.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataStart || chunkEnd > contents.length) {
      throw new Error('PNG chunk exceeds file bounds');
    }
    const typeBytes = contents.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('PNG has an invalid chunk type');
    const storedCrc = contents.readUInt32BE(dataEnd);
    const calculatedCrc = crc32(contents.subarray(offset + 4, dataEnd));
    if (storedCrc !== calculatedCrc) throw new Error(`PNG ${type} chunk has an invalid CRC`);

    const data = contents.subarray(dataStart, dataEnd);
    if (!sawHeader && type !== 'IHDR') throw new Error('PNG is missing its IHDR header');
    if (type === 'IHDR') {
      if (sawHeader || offset !== PNG_SIGNATURE.length || length !== 13) {
        throw new Error('PNG has an invalid IHDR header');
      }
      sawHeader = true;
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8]!;
      const colorType = data[9]!;
      const samplesByColorType = new Map([
        [0, 1],
        [2, 3],
        [3, 1],
        [4, 2],
        [6, 4],
      ]);
      const allowedDepths = new Map<number, number[]>([
        [0, [1, 2, 4, 8, 16]],
        [2, [8, 16]],
        [3, [1, 2, 4, 8]],
        [4, [8, 16]],
        [6, [8, 16]],
      ]);
      if (
        width === 0 ||
        height === 0 ||
        !allowedDepths.get(colorType)?.includes(bitDepth) ||
        data[10] !== 0 ||
        data[11] !== 0 ||
        (data[12] !== 0 && data[12] !== 1)
      ) {
        throw new Error('PNG has unsupported or invalid image parameters');
      }
      bitsPerPixel = bitDepth * samplesByColorType.get(colorType)!;
      interlaced = data[12] === 1;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      if (length !== 0) throw new Error('PNG has an invalid IEND chunk');
      sawEnd = true;
      offset = chunkEnd;
      if (offset !== contents.length) throw new Error('PNG has trailing data after IEND');
      break;
    }
    offset = chunkEnd;
  }

  if (!sawHeader || compressed.length === 0 || !sawEnd) {
    throw new Error('PNG is missing required image chunks');
  }
  const rowSizes = scanlineSizes(width, height, bitsPerPixel, interlaced);
  const decodedSize = rowSizes.reduce((total, size) => total + size + 1, 0);
  if (!Number.isSafeInteger(decodedSize) || decodedSize > MAXIMUM_DECODED_SIZE) {
    throw new Error('PNG decoded image is too large');
  }

  let decoded: Buffer;
  try {
    decoded = inflateSync(Buffer.concat(compressed), { maxOutputLength: decodedSize + 1 });
  } catch (error) {
    throw new Error('PNG image data could not be decoded', { cause: error });
  }
  if (decoded.length !== decodedSize) throw new Error('PNG decoded image data has the wrong size');
  let decodedOffset = 0;
  for (const rowSize of rowSizes) {
    const filter = decoded[decodedOffset];
    if (filter === undefined || filter > 4) throw new Error('PNG has an invalid scanline filter');
    decodedOffset += rowSize + 1;
  }
  return { width, height };
}

export async function inspectPng(filePath: string): Promise<PngDetails> {
  const [contents, metadata] = await Promise.all([readFile(filePath), stat(filePath)]);
  const decoded = decodePng(contents);
  return {
    width: decoded.width,
    height: decoded.height,
    size: metadata.size,
  };
}

export async function validateScreenshotAssets(rootDirectory = process.cwd()): Promise<string[]> {
  const issues: string[] = [];
  for (const asset of SCREENSHOT_ASSETS) {
    const filePath = resolve(rootDirectory, asset.path);
    try {
      const details = await inspectPng(filePath);
      if (details.width !== asset.width || details.height !== asset.height) {
        issues.push(
          `${asset.path}: expected ${asset.width}x${asset.height}, received ${details.width}x${details.height}`,
        );
      }
      if (details.size < MINIMUM_ASSET_SIZE) {
        issues.push(
          `${asset.path}: file is too small (${details.size.toLocaleString('en-US')} bytes; minimum ${MINIMUM_ASSET_SIZE.toLocaleString('en-US')})`,
        );
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      issues.push(
        `${asset.path}: ${code === 'ENOENT' ? 'missing' : error instanceof Error ? error.message : 'could not inspect'}`,
      );
    }
  }
  return issues;
}

export async function stageAndPromoteScreenshotAssets(
  rootDirectory: string,
  capture: (stagedRoot: string) => Promise<void>,
): Promise<void> {
  const docsDirectory = resolve(rootDirectory, 'docs');
  await mkdir(docsDirectory, { recursive: true });
  const transactionDirectory = await mkdtemp(join(docsDirectory, '.tracemark-screenshots-'));
  const stagedRoot = join(transactionDirectory, 'staged');
  const stagedImages = join(stagedRoot, 'docs', 'images');
  const canonicalImages = resolve(rootDirectory, 'docs', 'images');
  const previousImages = join(transactionDirectory, 'previous-images');
  let backedUp = false;

  try {
    await mkdir(stagedImages, { recursive: true });
    await capture(stagedRoot);
    const issues = await validateScreenshotAssets(stagedRoot);
    if (issues.length > 0) {
      throw new Error(`Staged screenshot validation failed:\n- ${issues.join('\n- ')}`);
    }

    try {
      await rename(canonicalImages, previousImages);
      backedUp = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    try {
      await rename(stagedImages, canonicalImages);
    } catch (promotionError) {
      if (backedUp) {
        try {
          await rename(previousImages, canonicalImages);
          backedUp = false;
        } catch (rollbackError) {
          throw new AggregateError(
            [promotionError, rollbackError],
            'Screenshot promotion and rollback both failed',
            { cause: rollbackError },
          );
        }
      }
      throw promotionError;
    }
  } finally {
    await rm(transactionDirectory, { recursive: true, force: true });
  }
}

async function checkAssets(): Promise<void> {
  const issues = await validateScreenshotAssets();
  if (issues.length > 0) {
    throw new Error(`Screenshot asset validation failed:\n- ${issues.join('\n- ')}`);
  }
  console.log(`Validated ${SCREENSHOT_ASSETS.length} deterministic screenshot assets.`);
}

async function assertText(page: Page, text: string): Promise<void> {
  await page.getByText(text, { exact: true }).waitFor({ state: 'visible' });
}

async function settleForCapture(page: Page, resetScroll: boolean): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  if (resetScroll) await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
}

async function capturePage(
  page: Page,
  outputRoot: string,
  assetPath: string,
  options: { resetScroll?: boolean } = {},
): Promise<void> {
  await settleForCapture(page, options.resetScroll ?? true);
  await page.screenshot({
    path: resolve(outputRoot, assetPath),
    animations: 'disabled',
    caret: 'hide',
    fullPage: false,
    scale: 'css',
  });
}

async function openPreview(page: Page, previewUrl: string): Promise<void> {
  await page.goto(previewUrl, { waitUntil: 'networkidle' });
  await assertText(page, '2 saved quotations.');
  await assertText(page, 'Disabled');
  await page.getByRole('heading', { name: 'The useful part, with the source attached.' }).waitFor();
}

async function captureInterfaceScreenshots(
  page: Page,
  previewUrl: string,
  outputRoot: string,
): Promise<void> {
  await openPreview(page, previewUrl);
  await capturePage(page, outputRoot, SCREENSHOT_ASSETS[0].path);

  await page.getByRole('searchbox', { name: 'Search research' }).fill('provenance');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await assertText(page, '1 saved quotation.');
  const searchCards = page.locator('article.research-card');
  if ((await searchCards.count()) !== 1) {
    throw new Error('Search preview must render exactly one meaningful filtered result.');
  }
  await page.getByRole('heading', { name: 'Notes on Evidence and Provenance' }).waitFor();
  await capturePage(page, outputRoot, SCREENSHOT_ASSETS[1].path);

  await openPreview(page, previewUrl);
  await page.getByRole('button', { name: 'Enable local AI', exact: true }).click();
  await assertText(page, 'Enabled');
  await page.getByRole('checkbox', { name: 'Select Evaluating Retrieval Systems' }).check();
  await assertText(page, '1 selected');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('heading', { name: 'Based on 1 selected quotation' }).waitFor();
  await assertText(
    page,
    'The selected notes emphasize preserving provenance while evaluating retrieval quality.',
  );
  await page.locator('.ai-panel').evaluate((panel) => {
    document.documentElement.style.zoom = '0.96';
    panel.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -14);
  });
  await capturePage(page, outputRoot, SCREENSHOT_ASSETS[2].path, { resetScroll: false });
}

function promoMarkup(iconDataUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width: 440px; height: 280px; margin: 0; overflow: hidden; }
      body {
        color: #17312f;
        background:
          radial-gradient(circle at 94% 4%, rgba(13, 104, 100, 0.24), transparent 160px),
          linear-gradient(135deg, #fffdf7 0%, #f3eee3 68%, #dceeea 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        position: relative;
        display: grid;
        width: 100%;
        height: 100%;
        grid-template-columns: 112px 1fr;
        align-items: center;
        gap: 24px;
        padding: 34px 34px 32px;
      }
      main::after {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 174px;
        height: 7px;
        background: #0d6864;
        content: "";
      }
      .icon-frame {
        display: grid;
        width: 112px;
        height: 112px;
        place-items: center;
        border: 1px solid rgba(13, 104, 100, 0.2);
        border-radius: 28px 28px 28px 8px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 18px 44px rgba(23, 49, 47, 0.15);
      }
      img { display: block; width: 84px; height: 84px; }
      .eyebrow {
        margin: 0 0 7px;
        color: #0d6864;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 39px;
        font-weight: 600;
        letter-spacing: -0.03em;
        line-height: 1;
      }
      .tagline {
        max-width: 230px;
        margin: 15px 0 0;
        color: #344f4b;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 18px;
        line-height: 1.35;
      }
      .proof {
        margin: 15px 0 0;
        color: #586c67;
        font-size: 11px;
        font-weight: 750;
        letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="icon-frame"><img src="${iconDataUrl}" alt="" /></div>
      <div>
        <p class="eyebrow">Source-attached research</p>
        <h1>TraceMark</h1>
        <p class="tagline">Save the useful part of the web.</p>
        <p class="proof">LOCAL-FIRST · NO ACCOUNT REQUIRED</p>
      </div>
    </main>
  </body>
</html>`;
}

async function capturePromo(browser: Browser, outputRoot: string): Promise<void> {
  const icon = await readFile(resolve('public/icon/128.png'));
  const page = await browser.newPage({ viewport: PROMO_VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.setContent(promoMarkup(`data:image/png;base64,${icon.toString('base64')}`), {
      waitUntil: 'load',
    });
    await capturePage(page, outputRoot, SCREENSHOT_ASSETS[3].path);
  } finally {
    await page.close();
  }
}

async function generateAssets(): Promise<void> {
  await stageAndPromoteScreenshotAssets(process.cwd(), async (stagedRoot) => {
    let server: ViteDevServer | undefined;
    let browser: Browser | undefined;
    try {
      server = await createServer({
        configFile: resolve('tests/visual/vite.config.ts'),
        logLevel: 'error',
        server: { host: '127.0.0.1', port: 0, strictPort: false },
      });
      await server.listen();
      const address = server.httpServer?.address() as AddressInfo | null;
      if (!address) throw new Error('The deterministic preview server did not start.');
      const previewUrl = `http://127.0.0.1:${address.port}/sidepanel-preview.html`;

      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({
        viewport: STORE_SCREENSHOT_VIEWPORT,
        deviceScaleFactor: 1,
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',
        reducedMotion: 'reduce',
      });
      try {
        await captureInterfaceScreenshots(page, previewUrl, stagedRoot);
      } finally {
        await page.close();
      }
      await capturePromo(browser, stagedRoot);
    } finally {
      await browser?.close();
      await server?.close();
    }
  });

  await checkAssets();
  console.log('Generated deterministic TraceMark store screenshots and promo asset.');
}

async function main(): Promise<void> {
  if (process.argv.includes('--check')) {
    await checkAssets();
    return;
  }
  await generateAssets();
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
