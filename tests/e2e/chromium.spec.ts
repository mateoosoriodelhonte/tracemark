import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Download,
  type Page,
} from 'playwright/test';
import { startFixtureServer } from './server';

const extensionPath = resolve('.output/chrome-mv3');
const ARTICLE_QUOTE = 'retrieval quality matters';
const HOSTILE_QUOTE = '<img src=x onerror=alert(1)>';
const EDITED_NOTE = 'Edited through the packaged research library.';
const EDITED_TAGS = ['browser-evidence', 'release-ready'];
const INBOX_ID = '00000000-0000-4000-8000-000000000001';
const ARTICLE_ID = '6f3f6066-69e2-48c0-9d55-f273a22a830e';
const HOSTILE_ID = '95a521e9-0c6a-4a25-81a0-57b43ab704ac';
const FIXED_TIME = '2026-08-22T06:00:00.000Z';

async function selectText(page: Page, exact: string): Promise<void> {
  const selected = await page.evaluate((wanted) => {
    const root = document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let text = '';
    let node = walker.nextNode();
    while (node !== null) {
      nodes.push(node as Text);
      text += node.textContent ?? '';
      node = walker.nextNode();
    }

    const start = text.indexOf(wanted);
    if (start < 0) return '';
    const end = start + wanted.length;
    let offset = 0;
    let startNode: Text | undefined;
    let endNode: Text | undefined;
    let startOffset = 0;
    let endOffset = 0;

    for (const textNode of nodes) {
      const nextOffset = offset + textNode.data.length;
      if (startNode === undefined && start >= offset && start < nextOffset) {
        startNode = textNode;
        startOffset = start - offset;
      }
      if (endNode === undefined && end > offset && end <= nextOffset) {
        endNode = textNode;
        endOffset = end - offset;
        break;
      }
      offset = nextOffset;
    }

    if (startNode === undefined || endNode === undefined) return '';
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return selection?.toString() ?? '';
  }, exact);

  expect(selected).toBe(exact);
}

async function openBackgroundExtensionPage(
  context: BrowserContext,
  activeFixture: Page,
  url: string,
): Promise<Page> {
  const page = await context.newPage();
  await activeFixture.bringToFront();
  await page.goto(url);
  return page;
}

async function downloadText(download: Download): Promise<string> {
  const path = await download.path();
  if (path === null) throw new Error(`Download ${download.suggestedFilename()} has no local path.`);
  return readFile(path, 'utf8');
}

function seedBackup(origin: string): string {
  return JSON.stringify({
    format: 'tracemark-backup',
    version: 1,
    exportedAt: FIXED_TIME,
    collections: [
      {
        id: INBOX_ID,
        schemaVersion: 1,
        name: 'Inbox',
        normalizedName: 'inbox',
        status: 'active',
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      },
    ],
    highlights: [
      {
        id: ARTICLE_ID,
        schemaVersion: 1,
        quote: ARTICLE_QUOTE,
        prefix: 'The evidence suggests ',
        suffix: ' more than window size.',
        heading: 'Retrieval systems',
        context: 'The evidence suggests retrieval quality matters more than window size.',
        title: 'Retrieval systems',
        url: `${origin}/article.html`,
        hostname: '127.0.0.1',
        collectionId: INBOX_ID,
        tags: [],
        note: '',
        searchText: ARTICLE_QUOTE,
        searchTokens: ['retrieval', 'quality', 'matters'],
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      },
      {
        id: HOSTILE_ID,
        schemaVersion: 1,
        quote: HOSTILE_QUOTE,
        prefix: 'Evidence says ',
        suffix: ' literally.',
        context: `Evidence says ${HOSTILE_QUOTE} literally.`,
        title: 'Hostile fixture',
        url: `${origin}/hostile.html`,
        hostname: '127.0.0.1',
        collectionId: INBOX_ID,
        tags: [],
        note: '',
        searchText: HOSTILE_QUOTE,
        searchTokens: ['img', 'src', 'onerror', 'alert'],
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      },
    ],
    aiResults: [],
    settings: {
      id: 'settings',
      schemaVersion: 1,
      theme: 'system',
      ai: { provider: 'none', model: 'llama3.2' },
    },
  });
}

test('the packaged extension searches, edits, renders inert text, and exports', async () => {
  test.setTimeout(90_000);
  const fixtureServer = await startFixtureServer();
  const profilePath = await mkdtemp(join(tmpdir(), 'tracemark-chromium-'));
  let context: BrowserContext | undefined;

  try {
    context = await chromium.launchPersistentContext(profilePath, {
      acceptDownloads: true,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      channel: 'chromium',
      headless: true,
    });
    const dialogMessages: string[] = [];
    const observeDialogs = (page: Page) => {
      page.on('dialog', async (dialog) => {
        dialogMessages.push(dialog.message());
        await dialog.dismiss();
      });
    };
    context.on('page', observeDialogs);
    for (const page of context.pages()) observeDialogs(page);

    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const extensionOrigin = `chrome-extension://${new URL(worker.url()).host}`;
    const libraryUrl = `${extensionOrigin}/sidepanel.html`;

    const [fixturePage] = context.pages();
    if (fixturePage === undefined) throw new Error('Persistent context did not create a page.');
    await fixturePage.goto(fixtureServer.urlFor('article.html'));
    await selectText(fixturePage, ARTICLE_QUOTE);

    const library = await openBackgroundExtensionPage(context, fixturePage, libraryUrl);
    await expect(library.getByRole('status')).toHaveText('0 saved quotations.');
    await library.getByRole('button', { name: 'Backups' }).click();
    const importDialog = library.getByRole('dialog', { name: 'Back up TraceMark' });
    await importDialog.getByLabel('Choose TraceMark JSON backup').setInputFiles({
      name: 'packaged-e2e-seed.json',
      mimeType: 'application/json',
      buffer: Buffer.from(seedBackup(fixtureServer.origin)),
    });
    await importDialog.getByRole('button', { name: 'Validate and merge backup' }).click();
    await expect(library.getByRole('status')).toHaveText(
      'Merged 2 quotations; skipped 0 duplicates.',
    );
    const articleCard = library.locator('article.research-card').filter({ hasText: ARTICLE_QUOTE });
    await expect(articleCard).toHaveCount(1);

    await articleCard.getByRole('button', { name: 'Edit Retrieval systems' }).click();
    const editDialog = library.getByRole('dialog', { name: 'Edit saved quotation' });
    await editDialog.getByLabel('Tags').fill(EDITED_TAGS.join(', '));
    await editDialog.getByLabel('My note').fill(EDITED_NOTE);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(library.getByRole('status')).toHaveText('Saved changes.');
    await expect(articleCard.getByText(EDITED_NOTE)).toBeVisible();
    for (const tag of EDITED_TAGS) await expect(articleCard.getByText(`#${tag}`)).toBeVisible();

    await library.getByLabel('Search research').fill('browser-evidence');
    await library.getByRole('button', { name: 'Search' }).click();
    await expect(library.locator('article.research-card')).toHaveCount(1);
    await expect(articleCard).toBeVisible();
    await library.getByRole('button', { name: 'Clear filters' }).click();
    await expect(library.locator('article.research-card')).toHaveCount(2);

    await fixturePage.goto(fixtureServer.urlFor('hostile.html'));
    await selectText(fixturePage, HOSTILE_QUOTE);
    await expect(library.locator('article.research-card')).toHaveCount(2);
    const hostileCard = library.locator('article.research-card').filter({ hasText: HOSTILE_QUOTE });
    await expect(hostileCard).toHaveCount(1);
    await expect(hostileCard.getByRole('blockquote')).toHaveText(HOSTILE_QUOTE);
    await expect(hostileCard.locator('img')).toHaveCount(0);
    expect(dialogMessages).toEqual([]);

    await library.getByRole('button', { name: 'Backups' }).click();
    const backupDialog = library.getByRole('dialog', { name: 'Back up TraceMark' });

    const jsonDownloadPromise = library.waitForEvent('download');
    await backupDialog.getByRole('button', { name: 'Download JSON backup' }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/^tracemark-backup-\d{4}-\d{2}-\d{2}\.json$/u);
    const json = JSON.parse(await downloadText(jsonDownload)) as {
      format: string;
      highlights: Array<{ note: string; quote: string; tags: string[] }>;
    };
    expect(json.format).toBe('tracemark-backup');
    expect(json.highlights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: EDITED_NOTE,
          quote: ARTICLE_QUOTE,
          tags: EDITED_TAGS,
        }),
        expect.objectContaining({ quote: HOSTILE_QUOTE }),
      ]),
    );

    const markdownDownloadPromise = library.waitForEvent('download');
    await backupDialog.getByRole('button', { name: 'Download Markdown' }).click();
    const markdownDownload = await markdownDownloadPromise;
    expect(markdownDownload.suggestedFilename()).toMatch(
      /^tracemark-all-research-\d{4}-\d{2}-\d{2}\.md$/u,
    );
    const markdown = await downloadText(markdownDownload);
    expect(markdown).toContain(ARTICLE_QUOTE);
    expect(markdown).toContain('Edited through the packaged research library\\.');
    expect(markdown).toContain('&lt;img src=x onerror=alert\\(1\\)&gt;');
    expect(markdown).not.toContain('<img src=x onerror=alert(1)>');
    expect(dialogMessages).toEqual([]);
  } finally {
    await Promise.all([
      context?.close() ?? Promise.resolve(),
      fixtureServer.close(),
      rm(profilePath, { force: true, recursive: true }),
    ]);
  }
});
