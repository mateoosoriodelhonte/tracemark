export type FirefoxDriverHandle = {
  quit: () => Promise<unknown>;
};

export type FirefoxServerHandle = {
  close: () => Promise<unknown>;
};

export type FirefoxResourceOwner = {
  root: string;
  attachDriver: (driver: FirefoxDriverHandle) => void;
  attachServer: (server: FirefoxServerHandle) => void;
};

type FirefoxResourceDependencies<T> = {
  createRoot: () => Promise<string>;
  setup: (resources: FirefoxResourceOwner) => Promise<void>;
  execute: (resources: FirefoxResourceOwner) => Promise<T>;
  removeRoot: (root: string) => Promise<unknown>;
};

const SELENIUM_ENVIRONMENT_OVERRIDES = [
  'SELENIUM_REMOTE_URL',
  'SELENIUM_SERVER_JAR',
  'SELENIUM_BROWSER',
] as const;

export function assertLocalSeleniumEnvironment(environment: NodeJS.ProcessEnv): void {
  const configured = SELENIUM_ENVIRONMENT_OVERRIDES.filter((name) => environment[name]);
  if (configured.length === 0) return;
  throw new Error(
    `Refusing Selenium environment override ${configured.join(', ')}: packaged Firefox evidence is local-only.`,
  );
}

export function isUnavailablePrerequisite(cause: unknown): boolean {
  const messages: string[] = [];
  let current = cause;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  const detail = messages.join(' ');
  return [
    /browser path does not exist(?::|\.|$)/iu,
    /could not locate firefox(?:\s|\.|$)/iu,
    /firefox binary (?:was )?(?:not found|does not exist)(?:\s|:|\.|$)/iu,
    /geckodriver(?: executable)? (?:was )?(?:not found|not available)(?:\s|:|\.|$)/iu,
    /driver executable (?:was )?not found(?:\s|:|\.|$)/iu,
    /the path to the driver executable must be set(?:\s|:|\.|$)/iu,
    /unable to (?:download|discover) (?:a compatible )?geckodriver(?:\s|:|\.|$)/iu,
  ].some((pattern) => pattern.test(detail));
}

export function shouldSkipFirefoxPrerequisite(
  cause: unknown,
  environment: NodeJS.ProcessEnv,
): boolean {
  return (
    environment.TRACEMARK_FIREFOX_ALLOW_SKIP === '1' &&
    environment.TRACEMARK_FIREFOX_STRICT !== '1' &&
    isUnavailablePrerequisite(cause)
  );
}

export async function runWithFirefoxResources<T>(
  dependencies: FirefoxResourceDependencies<T>,
): Promise<T> {
  const root = await dependencies.createRoot();
  let driver: FirefoxDriverHandle | undefined;
  let server: FirefoxServerHandle | undefined;
  const resources: FirefoxResourceOwner = {
    root,
    attachDriver(value) {
      driver = value;
    },
    attachServer(value) {
      server = value;
    },
  };

  try {
    await dependencies.setup(resources);
    return await dependencies.execute(resources);
  } finally {
    try {
      if (driver !== undefined) await driver.quit();
    } finally {
      await Promise.all([server?.close(), dependencies.removeRoot(root)]);
    }
  }
}
