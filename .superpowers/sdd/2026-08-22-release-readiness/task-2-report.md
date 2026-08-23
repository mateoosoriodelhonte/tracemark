# Task 2 report: Packaged Chromium critical-flow evidence

## Status

Implemented the repeatable packaged Chromium test for extension startup, real Backup UI import,
library search/edit, hostile-content inertness, and JSON/Markdown downloads. The test uses the
checked-in fixture server, the built `.output/chrome-mv3` extension, Playwright's persistent
Chromium context, and a new profile for every test iteration.

Automated capture and anchoring are not claimed. Chromium grants `activeTab` only from browser
chrome user gestures. Playwright can navigate packaged extension pages but cannot click the toolbar
action or a native extension context-menu item. Its CDP-injected keyboard events also do not reach
the browser-level `commands` handler. The test therefore seeds deterministic captured records
through the real Backup import UI. Existing integration/UI tests remain the automated proof for
capture, popup save, and anchoring, and the exact real-browser checklist appears below.

## Red/green evidence

### RED

The initial behavior-first test was run before adding `playwright.config.ts` or the package script:

```text
pnpm exec playwright test tests/e2e/chromium.spec.ts --reporter=line --workers=1
1 failed
page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
navigating to "null/popup.html"
```

Root cause: `URL.origin` is `"null"` for `chrome-extension:` URLs. Constructing the origin from the
service worker URL's host fixed the harness.

The next run reached the production permission boundary:

```text
1 failed
Expected: "Selection ready to save."
alert: This browser page cannot be captured
```

This was correct production behavior: directly navigating `popup.html` does not invoke the action
and therefore does not grant `activeTab`. `chrome.action.openPopup()` opened browser-managed UI that
Playwright did not expose as a page target; using the registered `⌥⇧S` command and native context
menu through CDP input did not dispatch browser-level extension gestures. No test-only production
hook, persistent host permission, modified manifest, or synthetic permission grant was added.

A later RED run reached Markdown download and proved the export escaped punctuation:

```text
Expected substring: "Edited through the packaged research library."
Received: "Edited through the packaged research library\\."
```

The assertion was corrected to the independently derived escaped Markdown literal.

### GREEN

```text
pnpm test:e2e:chromium
1 passed (2.2s)
```

The package script rebuilt the production Chrome MV3 output before launching it.

Fresh-profile repeat run, no retries:

```text
pnpm exec playwright test --config playwright.config.ts --repeat-each=5 --fail-on-flaky-tests
5 passed (7.0s)
```

Fresh verification after cleanup review:

```text
pnpm exec playwright test --config playwright.config.ts --repeat-each=3 --fail-on-flaky-tests
3 passed (5.0s)
```

Supporting capture/popup/anchor evidence:

```text
pnpm exec vitest run tests/integration/capture-flow.test.ts \
  tests/integration/anchor-flow.test.ts tests/ui/popup.test.ts
Test Files  3 passed (3)
Tests       9 passed (9)
```

Full repository verification:

```text
pnpm format:check
All matched files use Prettier code style!

pnpm lint
exit 0

pnpm typecheck
svelte-check found 0 errors and 0 warnings

pnpm test
Test Files  26 passed (26)
Tests       183 passed (183)
```

## Automated packaged evidence

The Playwright test verifies:

- the production `.output/chrome-mv3` package loads and starts an MV3 service worker;
- the checked-in fixture server binds an ephemeral localhost port;
- the fixture text can be selected across inline text nodes;
- a strict deterministic backup is chosen and merged through the packaged Backup UI;
- the library renders both imported records, edits note/tags, and finds the edited record by search;
- literal `<img src=x onerror=alert(1)>` remains text, creates no `img`, and triggers no dialog;
- JSON and Markdown are downloaded through the packaged Backup UI and their downloaded contents are
  inspected;
- JSON preserves edited note/tags and both quotations;
- Markdown escapes hostile markup and does not contain a literal executable `<img ...>` string;
- every iteration creates a new temporary persistent profile and removes it during cleanup.

## Browser and installation prerequisites

- Node.js 22 or newer and pnpm 11.19.0.
- Exact-pinned `playwright@1.62.1` from the existing development dependencies. Its official
  `playwright/test` surface provides the runner; no duplicate runner dependency was needed.
- Install the matching Playwright Chromium once with:

  ```sh
  pnpm exec playwright install chromium
  ```

- The verified local browser was Playwright Chromium 151.0.7922.34 (build v1234).
- Run the packaged test with `pnpm test:e2e:chromium`; it builds `.output/chrome-mv3` first.

## Manual real-browser checklist for capture and anchor

1. Build with `pnpm build:chrome`.
2. Start the checked-in fixture server and keep the process running:

   ```sh
   node --experimental-strip-types --input-type=module -e "import('./tests/e2e/server.ts').then(async ({ startFixtureServer }) => { const server = await startFixtureServer(); console.log(server.origin); process.on('SIGINT', async () => { await server.close(); process.exit(0); }); })"
   ```

3. In a fresh Chrome profile, open `chrome://extensions`, enable Developer mode, choose **Load
   unpacked**, and select `.output/chrome-mv3`.
4. Open `<printed-origin>/article.html`, select exactly `retrieval quality matters` across the inline
   elements, click the TraceMark toolbar action, verify the packaged popup shows the exact quote,
   and click **Save quotation**.
5. Open TraceMark in Chrome's side panel. Confirm one saved quotation, choose **Edit**, set tags to
   `browser-evidence, release-ready`, set the note to
   `Edited through the packaged research library.`, and save.
6. Keep `article.html` as the active tab and click **Mark on page** in the side panel. Confirm the
   status says the quotation was marked and the three inline quote fragments are highlighted without
   changing the page text.
7. Open `<printed-origin>/hostile.html`, select exactly `<img src=x onerror=alert(1)>`, invoke the
   toolbar action, and save. Confirm the popup and library show literal text, no image appears, and no
   dialog or script runs.
8. In **Backups**, download JSON and Markdown. Confirm both downloads complete, JSON contains both
   records plus the edited note/tags, and Markdown contains escaped hostile markup.

## Changed files

- `playwright.config.ts`: deterministic one-worker Playwright runner configuration with retained
  traces on failure.
- `tests/e2e/chromium.spec.ts`: fresh-profile packaged Chromium evidence using the fixture server and
  real extension Backup/library/download surfaces.
- `package.json`: `test:e2e:chromium` build-and-test script.
- `.superpowers/sdd/2026-08-22-release-readiness/task-2-report.md`: this evidence report.

`pnpm-lock.yaml` did not change because the existing exact-pinned `playwright@1.62.1` already
contains the official test runner used here.

## Self-review

- No production source, manifest permission, optional host permission, or content-security behavior
  changed.
- No production test hook or direct background-handler call was added.
- The test runs the built extension, not source components or mocked Svelte props.
- Test data is deterministic except for the fixture server's ephemeral port, which is propagated into
  the imported URLs.
- The persistent profile is unique per iteration; context, server, and profile cleanup run together in
  `finally`.
- Assertions target user-visible state and downloaded artifacts. Expected values are literal and do
  not reuse production backup helpers.
- The hostile check covers extension DOM insertion, dialogs, JSON preservation, and Markdown
  escaping.
- Five consecutive no-retry runs and three further post-review runs found no flakiness.

## Concerns

- Packaged Playwright automation does not prove toolbar-popup capture or successful `activeTab`
  anchoring because Chromium exposes neither toolbar actions nor native extension context-menu clicks
  as Playwright page targets, and CDP keyboard input does not dispatch extension commands. This is an
  evidence gap, not a production permission failure. The manual checklist must be completed before
  release.
- The packaged test deliberately uses the real Backup import UI to establish deterministic local
  state. Lower-level backup round-trip details remain in the existing integration suite.
- The Playwright browser is an explicit developer/CI prerequisite; `pnpm install` alone does not
  download it.
