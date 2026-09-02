# Development setup

TraceMark is a Manifest V3 extension built with WXT, Svelte, TypeScript, Dexie, and Zod. The
normal development loop builds an unpacked browser extension; it does not require a TraceMark
account, a backend, or a network service. Generated builds live in `.output/` and should not be
committed.

## Prerequisites

- Node.js 22 or newer (`package.json` enforces this minimum).
- pnpm 11.19.0, the package-manager version recorded by the repository.
- Chrome or Firefox for hands-on extension testing. Firefox development and the packaged Firefox
  test require Firefox 142 or newer because that is the manifest minimum.

For the packaged Chromium test, install Playwright's Chromium once after dependencies are
installed:

```sh
pnpm exec playwright install chromium
```

For the packaged Firefox test, a compatible geckodriver with `--allow-system-access` support is
also needed. Selenium Manager normally obtains it on first use; that initial acquisition may need
network access. See [TESTING.md](TESTING.md) for the exact browser-test prerequisites and evidence
limits.

## Install and run

From the repository root, install the lockfile-resolved dependency set:

```sh
pnpm install --frozen-lockfile
```

Start the Chrome-targeted WXT development runner:

```sh
pnpm dev
```

Start the Firefox MV3 development runner instead when working on Firefox behavior:

```sh
pnpm dev:firefox
```

WXT writes browser-specific outputs to `.output/`. Treat those files as disposable. When a change
needs a production-like build, use `pnpm build:chrome` or `pnpm build:firefox`; use
`pnpm package:build` to create both release ZIPs. The development runner is useful for iteration,
but a browser’s own extension UI still controls installation, toolbar actions, prompts, and
sidebar/side-panel behavior.

## Load a local build

For a Chrome production build, open `chrome://extensions`, turn on **Developer mode**, and select
`.output/chrome-mv3` through **Load unpacked**. For Firefox, open
`about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select
`.output/firefox-mv3/manifest.json`. Firefox removes temporary add-ons on restart.

Use a disposable browser profile when exercising captures, imports, permissions, or exports. The
extension stores research in the browser profile, so a normal development profile can accumulate
real quotations and settings. Do not use private research as a test fixture.

## Everyday checks

Run the smallest check that demonstrates the change while iterating:

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

`pnpm check` is the complete local gate. It runs formatting, linting, type checking, a tracked-file
secret scan, production builds, Vitest, package validation, checksums, Firefox `web-ext` lint,
relative documentation-link validation, and screenshot validation. It creates release archives as
part of the process. Packaged Chromium and Firefox execution are separate commands because they
need local browser tooling.

Before changing permissions, storage, import/export behavior, runtime injection, or optional local
AI, read [ARCHITECTURE.md](ARCHITECTURE.md), [PERMISSIONS.md](PERMISSIONS.md), and
[../CONTRIBUTING.md](../CONTRIBUTING.md). Those areas carry explicit privacy and cross-browser
contracts, not merely implementation details.
