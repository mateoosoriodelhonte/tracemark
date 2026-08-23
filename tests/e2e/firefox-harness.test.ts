import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  isUnavailablePrerequisite,
  runWithFirefoxResources,
  shouldSkipFirefoxPrerequisite,
} from './firefox-harness';

const firefoxScript = resolve('tests/e2e/firefox.ts');
const seleniumOverrides = [
  ['SELENIUM_REMOTE_URL', 'http://127.0.0.1:9'],
  ['SELENIUM_SERVER_JAR', '/nonexistent/tracemark-selenium-server.jar'],
  ['SELENIUM_BROWSER', 'not-a-real-browser'],
] as const;

describe('local-only Firefox driver policy', () => {
  test.each(seleniumOverrides)('fails closed when %s is set', (name, value) => {
    const environment = { ...process.env };
    for (const [overrideName] of seleniumOverrides) delete environment[overrideName];
    environment[name] = value;

    const result = spawnSync(process.execPath, ['--experimental-strip-types', firefoxScript], {
      encoding: 'utf8',
      env: environment,
      timeout: 20_000,
    });

    expect(result.status).toBe(1);
    expect(`${result.stderr}\n${result.stdout}`).toContain(
      `Refusing Selenium environment override ${name}`,
    );
  });
});

describe('Firefox prerequisite skip policy', () => {
  test.each([
    new Error('Could not locate Firefox on the current system'),
    new Error('Firefox binary not found'),
    new Error('geckodriver executable not found'),
    new Error('Unable to start', {
      cause: new Error('Browser path does not exist: /missing/firefox'),
    }),
  ])('recognizes an unequivocally unavailable executable: %s', (cause) => {
    expect(isUnavailablePrerequisite(cause)).toBe(true);
  });

  test.each([
    new Error('Unable to obtain browser driver because browserName was invalid'),
    new Error('geckodriver reported a protocol mismatch for path /session/123'),
    new Error('driver executable rejected the configured path after an invalid capability'),
    new Error('SessionNotCreatedError: Firefox process unexpectedly closed'),
  ])('does not classify a functional or configuration failure as unavailable: %s', (cause) => {
    expect(isUnavailablePrerequisite(cause)).toBe(false);
  });

  test('allows only an explicit local skip for an unavailable executable', () => {
    const cause = new Error('Browser path does not exist: /missing/firefox');

    expect(shouldSkipFirefoxPrerequisite(cause, { TRACEMARK_FIREFOX_ALLOW_SKIP: '1' })).toBe(true);
    expect(
      shouldSkipFirefoxPrerequisite(cause, {
        TRACEMARK_FIREFOX_ALLOW_SKIP: '1',
        TRACEMARK_FIREFOX_STRICT: '1',
      }),
    ).toBe(false);
    expect(shouldSkipFirefoxPrerequisite(cause, {})).toBe(false);
  });
});

describe('Firefox resource ownership', () => {
  test.each(['directory setup failed', 'server startup failed'])(
    'removes the temporary root when setup reports: %s',
    async (failure) => {
      const events: string[] = [];

      await expect(
        runWithFirefoxResources({
          async createRoot() {
            events.push('root:create');
            return '/temporary/firefox-root';
          },
          async setup() {
            events.push('setup');
            throw new Error(failure);
          },
          async execute() {
            events.push('execute');
          },
          async removeRoot() {
            events.push('root:remove');
          },
        }),
      ).rejects.toThrow(failure);

      expect(events).toEqual(['root:create', 'setup', 'root:remove']);
    },
  );

  test('closes an attached server and removes the root when later setup fails', async () => {
    const events: string[] = [];

    await expect(
      runWithFirefoxResources({
        async createRoot() {
          events.push('root:create');
          return '/temporary/firefox-root';
        },
        async setup({ attachServer }) {
          events.push('server:start');
          attachServer({
            async close() {
              events.push('server:close');
            },
          });
          events.push('backup:write');
          throw new Error('backup write failed');
        },
        async execute() {
          events.push('execute');
        },
        async removeRoot() {
          events.push('root:remove');
        },
      }),
    ).rejects.toThrow('backup write failed');

    expect(events.slice(0, 3)).toEqual(['root:create', 'server:start', 'backup:write']);
    expect(events.slice(3)).toEqual(expect.arrayContaining(['server:close', 'root:remove']));
  });

  test('waits for Firefox to quit before closing the server and removing the root', async () => {
    const events: string[] = [];
    let finishQuit: () => void = () => undefined;
    let reportQuitStarted: () => void = () => undefined;
    const quitStarted = new Promise<void>((resolveStart) => {
      reportQuitStarted = resolveStart;
    });
    const quitFinished = new Promise<void>((resolveQuit) => {
      finishQuit = resolveQuit;
    });

    const run = runWithFirefoxResources({
      async createRoot() {
        return '/temporary/firefox-root';
      },
      async setup({ attachServer }) {
        attachServer({
          async close() {
            events.push('server:close');
          },
        });
      },
      async execute({ attachDriver }) {
        attachDriver({
          async quit() {
            events.push('driver:quit:start');
            reportQuitStarted();
            await quitFinished;
            events.push('driver:quit:end');
          },
        });
        throw new Error('browser assertion failed');
      },
      async removeRoot() {
        events.push('root:remove');
      },
    });
    await quitStarted;
    const eventsBeforeQuit = [...events];
    finishQuit();

    await expect(run).rejects.toThrow('browser assertion failed');
    expect(eventsBeforeQuit).toEqual(['driver:quit:start']);
    expect(events.slice(0, 2)).toEqual(['driver:quit:start', 'driver:quit:end']);
    expect(events.slice(2)).toEqual(expect.arrayContaining(['server:close', 'root:remove']));
  });
});
