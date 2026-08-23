import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startFixtureServer } from './server.ts';

const require = createRequire(import.meta.url);
const { Builder, By, until } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox.js');
type SeleniumDriver = ReturnType<(typeof firefox.Driver)['createSession']>;
type SeleniumLocator = ReturnType<typeof By.css>;

const FIREFOX_ARCHIVE = resolve('.output/tracemark-1.0.0-firefox.zip');
const ADDON_ID = 'tracemark@mateoosoriodelhonte.github.io';
const EXTENSION_UUID = '6f3f6066-69e2-48c0-9d55-f273a22a830e';
const ARTICLE_QUOTE = 'retrieval quality matters';
const HOSTILE_QUOTE = '<img src=x onerror=alert(1)>';
const EDITED_NOTE = 'Edited through the packaged Firefox research library.';
const EDITED_TAGS = ['firefox-evidence', 'release-ready'];
const INBOX_ID = '00000000-0000-4000-8000-000000000001';
const ARTICLE_ID = '6f3f6066-69e2-48c0-9d55-f273a22a830e';
const HOSTILE_ID = '95a521e9-0c6a-4a25-81a0-57b43ab704ac';
const FIXED_TIME = '2026-08-22T06:00:00.000Z';
const WAIT_MS = 15_000;

type FirefoxManifest = {
  manifest_version?: number;
  name?: string;
  version?: string;
  browser_specific_settings?: {
    gecko?: { id?: string; strict_min_version?: string };
  };
  sidebar_action?: { default_panel?: string; default_title?: string };
};

function readArchiveManifest(): FirefoxManifest {
  const serialized = execFileSync('unzip', ['-p', FIREFOX_ARCHIVE, 'manifest.json'], {
    encoding: 'utf8',
  });
  return JSON.parse(serialized) as FirefoxManifest;
}

function assertFirefoxManifest(manifest: FirefoxManifest): void {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'TraceMark');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.browser_specific_settings?.gecko?.id, ADDON_ID);
  assert.equal(manifest.browser_specific_settings?.gecko?.strict_min_version, '142.0');
  assert.deepEqual(manifest.sidebar_action, {
    default_panel: 'sidepanel.html',
    default_title: 'TraceMark Research Library',
    open_at_install: false,
  });
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

function buttonNamed(name: string) {
  return By.xpath(`//button[normalize-space()=${JSON.stringify(name)}]`);
}

function labeledControl(label: string, selector: string) {
  return By.xpath(`//label[.//span[normalize-space()=${JSON.stringify(label)}]]//${selector}`);
}

async function visibleElement(driver: SeleniumDriver, locator: SeleniumLocator) {
  const element = await driver.wait(until.elementLocated(locator), WAIT_MS);
  await driver.wait(until.elementIsVisible(element), WAIT_MS);
  return element;
}

async function clickNamedButton(driver: SeleniumDriver, name: string): Promise<void> {
  const button = await visibleElement(driver, buttonNamed(name));
  await driver.wait(until.elementIsEnabled(button), WAIT_MS);
  await button.click();
}

async function waitForLibraryStatus(driver: SeleniumDriver, expected: string): Promise<void> {
  const statusLocator = By.css('.result-count[role="status"]');
  await visibleElement(driver, statusLocator);
  await driver.wait(
    async () => {
      const status = await driver.findElement(statusLocator).getText();
      return status === expected;
    },
    WAIT_MS,
    `Timed out waiting for TraceMark status: ${expected}`,
  );
}

async function waitForDownload(downloadDirectory: string, pattern: RegExp): Promise<string> {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const names = await readdir(downloadDirectory);
    const name = names.find((candidate) => pattern.test(candidate));
    if (name !== undefined && !name.endsWith('.part')) {
      const path = join(downloadDirectory, name);
      if ((await stat(path)).size > 0) return path;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Timed out waiting for Firefox download matching ${pattern}.`);
}

function prerequisiteMessage(cause: unknown): string {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return [
    'Firefox WebDriver prerequisites are unavailable.',
    'Install Firefox 142 or newer and allow Selenium Manager to obtain geckodriver,',
    'or put a compatible geckodriver on PATH.',
    `Underlying error: ${detail}`,
  ].join(' ');
}

function isUnavailablePrerequisite(cause: unknown): boolean {
  const messages: string[] = [];
  let current = cause;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  const detail = messages.join(' ');
  return [
    /unable to obtain browser driver/iu,
    /browser path does not exist/iu,
    /could not locate firefox/iu,
    /firefox binary.*(?:not found|does not exist)/iu,
    /geckodriver.*(?:not found|not available|path)/iu,
    /driver executable.*(?:not found|path)/iu,
  ].some((pattern) => pattern.test(detail));
}

async function createDriver(profileDirectory: string, downloadDirectory: string) {
  const options = new firefox.Options()
    .addArguments('-headless')
    .setProfile(profileDirectory)
    .setPreference('extensions.webextensions.uuids', JSON.stringify({ [ADDON_ID]: EXTENSION_UUID }))
    .setPreference('browser.download.folderList', 2)
    .setPreference('browser.download.dir', downloadDirectory)
    .setPreference('browser.download.useDownloadDir', true)
    .setPreference('browser.download.always_ask_before_handling_new_types', false)
    .setPreference(
      'browser.helperApps.neverAsk.saveToDisk',
      'application/json,text/markdown,text/plain',
    );
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');

  try {
    return await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .setFirefoxService(service)
      .build();
  } catch (cause) {
    const strict = process.env.TRACEMARK_FIREFOX_STRICT === '1';
    const unavailable = isUnavailablePrerequisite(cause);
    const message = unavailable
      ? prerequisiteMessage(cause)
      : `Firefox WebDriver session construction failed for a reason that is not eligible for a prerequisite skip: ${cause instanceof Error ? cause.message : String(cause)}`;
    const maySkip = process.env.TRACEMARK_FIREFOX_ALLOW_SKIP === '1' && !strict && unavailable;
    if (maySkip) {
      console.warn(`SKIP: ${message}`);
      return undefined;
    }
    throw new Error(
      strict
        ? `${message} Strict release evidence cannot be skipped.`
        : `${message} To opt in to a local prerequisite skip, rerun with TRACEMARK_FIREFOX_ALLOW_SKIP=1.`,
      { cause },
    );
  }
}

async function openPackagedPage(driver: SeleniumDriver, url: string): Promise<void> {
  await driver.setContext(firefox.Context.CHROME);
  try {
    await driver.executeScript(
      `gBrowser.selectedBrowser.loadURI(Services.io.newURI(arguments[0]), {
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
      });`,
      url,
    );
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
  await driver.wait(until.urlIs(url), WAIT_MS);
}

async function exercisePackagedLibrary(
  driver: SeleniumDriver,
  backupPath: string,
  downloadDirectory: string,
) {
  await openPackagedPage(driver, `moz-extension://${EXTENSION_UUID}/sidepanel.html`);
  await driver.wait(until.titleIs('TraceMark Research Library'), WAIT_MS);
  assert.equal(await driver.getTitle(), 'TraceMark Research Library');
  const heading = await visibleElement(driver, By.css('h1'));
  assert.equal(
    await heading.getText(),
    'Research library',
    'the packaged Firefox side panel should expose its user-facing library',
  );
  await waitForLibraryStatus(driver, '0 saved quotations.');

  await clickNamedButton(driver, 'Backups');
  const fileInput = await visibleElement(
    driver,
    labeledControl('Choose TraceMark JSON backup', 'input'),
  );
  await fileInput.sendKeys(backupPath);
  await clickNamedButton(driver, 'Validate and merge backup');
  await waitForLibraryStatus(driver, 'Merged 2 quotations; skipped 0 duplicates.');

  const articleCard = await visibleElement(
    driver,
    By.xpath(
      `//article[contains(@class,"research-card")][contains(.,${JSON.stringify(ARTICLE_QUOTE)})]`,
    ),
  );
  assert.equal((await driver.findElements(By.css('article.research-card'))).length, 2);
  await articleCard.findElement(By.css('button[aria-label="Edit Retrieval systems"]')).click();

  const tagsInput = await visibleElement(driver, labeledControl('Tags', 'input'));
  await tagsInput.sendKeys(EDITED_TAGS.join(', '));
  const noteInput = await visibleElement(driver, labeledControl('My note', 'textarea'));
  await noteInput.sendKeys(EDITED_NOTE);
  await clickNamedButton(driver, 'Save changes');
  await waitForLibraryStatus(driver, 'Saved changes.');
  assert.match(await articleCard.getText(), new RegExp(EDITED_NOTE.replaceAll('.', '\\.')));
  for (const tag of EDITED_TAGS) assert.match(await articleCard.getText(), new RegExp(`#${tag}`));

  const searchInput = await visibleElement(driver, labeledControl('Search research', 'input'));
  await searchInput.sendKeys('firefox-evidence');
  await clickNamedButton(driver, 'Search');
  await waitForLibraryStatus(driver, '1 saved quotation.');
  assert.equal((await driver.findElements(By.css('article.research-card'))).length, 1);
  await clickNamedButton(driver, 'Clear filters');
  await waitForLibraryStatus(driver, '2 saved quotations.');

  const hostileCard = await visibleElement(
    driver,
    By.xpath(
      `//article[contains(@class,"research-card")][contains(.,${JSON.stringify(HOSTILE_QUOTE)})]`,
    ),
  );
  assert.equal(await hostileCard.findElement(By.css('blockquote')).getText(), HOSTILE_QUOTE);
  assert.equal((await hostileCard.findElements(By.css('img'))).length, 0);

  await clickNamedButton(driver, 'Backups');
  await clickNamedButton(driver, 'Download JSON backup');
  const jsonPath = await waitForDownload(
    downloadDirectory,
    /^tracemark-backup-\d{4}-\d{2}-\d{2}\.json$/u,
  );
  const exportedBackup = JSON.parse(await readFile(jsonPath, 'utf8')) as {
    format?: string;
    highlights?: Array<{ note?: string; quote?: string; tags?: string[] }>;
  };
  assert.equal(exportedBackup.format, 'tracemark-backup');
  assert.ok(
    exportedBackup.highlights?.some(
      ({ note, quote, tags }) =>
        quote === ARTICLE_QUOTE &&
        note === EDITED_NOTE &&
        JSON.stringify(tags) === JSON.stringify(EDITED_TAGS),
    ),
  );
  assert.ok(exportedBackup.highlights?.some(({ quote }) => quote === HOSTILE_QUOTE));

  await clickNamedButton(driver, 'Download Markdown');
  const markdownPath = await waitForDownload(
    downloadDirectory,
    /^tracemark-all-research-\d{4}-\d{2}-\d{2}\.md$/u,
  );
  const markdown = await readFile(markdownPath, 'utf8');
  assert.match(markdown, /retrieval quality matters/u);
  assert.match(markdown, /Edited through the packaged Firefox research library\\\./u);
  assert.match(markdown, /&lt;img src=x onerror=alert\\\(1\\\)&gt;/u);
  assert.doesNotMatch(markdown, /<img src=x onerror=alert\(1\)>/u);
}

async function main(): Promise<void> {
  assertFirefoxManifest(readArchiveManifest());
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'tracemark-firefox-'));
  const profileDirectory = join(temporaryRoot, 'profile');
  const downloadDirectory = join(temporaryRoot, 'downloads');
  await Promise.all([mkdir(profileDirectory), mkdir(downloadDirectory)]);
  const fixtureServer = await startFixtureServer();
  const backupPath = join(temporaryRoot, 'packaged-e2e-seed.json');
  await writeFile(backupPath, seedBackup(fixtureServer.origin));
  let driver: SeleniumDriver | undefined;

  try {
    driver = await createDriver(profileDirectory, downloadDirectory);
    if (driver === undefined) return;

    const capabilities = await driver.getCapabilities();
    const browserVersion = String(capabilities.get('browserVersion') ?? 'unknown');
    const installedId = await driver.installAddon(FIREFOX_ARCHIVE, true);
    assert.equal(installedId, ADDON_ID);
    await exercisePackagedLibrary(driver, backupPath, downloadDirectory);
    console.log(`Firefox ${browserVersion}: temporarily installed ${installedId}.`);
    console.log(
      'PASS: packaged manifest/startup/sidebar, import, library, search, edit, inert rendering, JSON export, and Markdown export.',
    );
  } finally {
    try {
      if (driver !== undefined) await driver.quit();
    } finally {
      await Promise.all([
        fixtureServer.close(),
        rm(temporaryRoot, { force: true, recursive: true }),
      ]);
    }
  }
}

await main();
