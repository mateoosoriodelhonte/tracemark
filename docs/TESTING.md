# Testing TraceMark

TraceMark separates browser-agnostic behavior tests from evidence collected against the packaged
Chrome and Firefox extensions. A green component or integration test does not, by itself, prove a
browser package starts. Likewise, a packaged library test does not prove browser-chrome gestures
that WebDriver cannot perform.

## Prerequisites

- Node.js 22 or newer and pnpm 11.19.0.
- Firefox 142 or newer. `142.0` is the minimum declared by the packaged Firefox manifest.
- `selenium-webdriver@4.47.0`, installed by `pnpm install`.
- A compatible geckodriver with `--allow-system-access` support (0.36.0 or newer). Selenium Manager
  obtains and caches it automatically when possible; an explicit compatible `geckodriver` on `PATH`
  is also supported. The first Selenium Manager run may require network access.
- Playwright Chromium, installed once with `pnpm exec playwright install chromium`, for packaged
  Chromium evidence.

Task 3 was automated locally with Firefox 154.0 and geckodriver 0.37.1 selected by Selenium Manager
on macOS arm64. The Firefox test also works with `FIREFOX_BIN` set to an explicit Firefox binary.

## Commands

| Evidence                                                         | Command                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Unit, component, storage, and browser-agnostic integration tests | `pnpm test`                                                             |
| Generated Chrome and Firefox manifest checks                     | `pnpm check:manifests`                                                  |
| Release ZIP contract                                             | `pnpm package:build && pnpm test:e2e:packages && pnpm package:validate` |
| Packaged Chromium                                                | `pnpm test:e2e:chromium`                                                |
| Packaged Firefox, normal local run                               | `pnpm test:e2e:firefox`                                                 |
| Packaged Firefox, strict release run                             | `pnpm test:e2e:firefox:release`                                         |

`pnpm check` is the repository quality gate. It runs formatting verification, lint, type checking,
both production builds, the full Vitest suite, and `web-ext lint` against the generated Firefox
directory. On a clean checkout, run `pnpm package:build && pnpm check` because the Vitest suite's
release-contract tests expect both generated ZIPs. Packaged Chromium and Firefox execution remain
separate because they require installed browsers and, for Firefox, a compatible WebDriver
environment.

The normal Firefox command fails when Firefox or WebDriver cannot start. A developer who knowingly
lacks that local prerequisite may opt into a clearly reported skip with:

```sh
TRACEMARK_FIREFOX_ALLOW_SKIP=1 pnpm test:e2e:firefox
```

Only recognized Firefox/geckodriver unavailability during session construction is eligible for that
skip. An unclassified startup error, missing or malformed ZIP, add-on installation failure, manifest
mismatch, extension startup failure, UI assertion, or export failure still fails.
`pnpm test:e2e:firefox:release` sets `TRACEMARK_FIREFOX_STRICT=1`, which overrides the local skip
variable and always fails when the browser session cannot be created.

## Automated packaged Chromium evidence

`pnpm test:e2e:chromium` rebuilds `.output/chrome-mv3`, launches Playwright's real Chromium with
only that unpacked extension enabled, creates a fresh temporary profile, and removes the profile
after Chromium closes. The test:

1. Waits for the packaged background service worker and opens the real
   `chrome-extension://…/sidepanel.html` library document.
2. Verifies background startup through the packaged library's initial `0 saved quotations.` state.
3. Uses the Backup UI to import two strict records from the checked-in fixture server.
4. Verifies library rendering, edit persistence, tag search, filter clearing, and literal rendering
   of `<img src=x onerror=alert(1)>` without an `img` element or script dialog.
5. Downloads JSON and Markdown through the packaged UI, then verifies the browser-created files
   contain edits and both quotations while hostile markup remains escaped.

The fixture page is brought to the foreground to keep the browser context realistic, but opening an
extension page and manipulating its DOM does not create a browser-chrome `activeTab` gesture. The
deterministic import therefore proves the packaged library path without adding a test-only
production hook or broader permission.

## Chrome manual capture, anchor, and export checklist

No completed Chrome browser-chrome gesture run is asserted by packaged automation. Before release,
record the Chrome version, OS, date, tester, and deviations while running this checklist:

1. Run `pnpm package:build && pnpm package:validate` from a clean checkout.
2. Start the checked-in fixture server and keep it running. Record the printed origin:

   ```sh
   node --experimental-strip-types --input-type=module -e "import('./tests/e2e/server.ts').then(async ({ startFixtureServer }) => { const server = await startFixtureServer(); console.log(server.origin); process.on('SIGINT', async () => { await server.close(); process.exit(0); }); })"
   ```

3. Create a disposable Chrome profile. Open `chrome://extensions`, enable **Developer mode**, choose
   **Load unpacked**, and select `.output/chrome-mv3`. Confirm the extension is named **TraceMark**.
4. Open `<printed-origin>/article.html`. Select exactly `retrieval quality matters`, including the
   words split across inline elements. Click the TraceMark toolbar action, confirm the exact
   quotation appears, then choose **Save quotation**.
5. Open the TraceMark side panel. Confirm one quotation exists, its title is **Retrieval systems**,
   its host is `127.0.0.1`, and the exact selected text is preserved.
6. Edit that quotation. Set tags to `chrome-evidence, release-ready` and the note to
   `Edited through the packaged Chrome research library.` Save, search for `chrome-evidence`, and
   confirm exactly that quotation remains.
7. Return to `<printed-origin>/article.html` and keep it active. In the TraceMark side panel choose
   **Mark on page**. Confirm the status says `Marked the saved quotation on this page.`, all three
   inline quote fragments are marked, and the page text is unchanged.
8. Clear the library search. On `<printed-origin>/hostile.html`, select exactly
   `<img src=x onerror=alert(1)>`. Right-click the selection and choose
   **Save selection to TraceMark**. Confirm literal text is displayed, no image is created, and no
   script dialog opens.
9. On `<printed-origin>/repeated.html`, select one exact `repeated claim` and press `Alt+Shift+S`.
   Confirm a new Inbox quotation appears. Choose **Mark on page** while the fixture remains active
   and confirm TraceMark reports ambiguity rather than guessing.
10. Open **Backups** and download JSON and Markdown. Confirm JSON contains the captured records and
    edited note/tags; confirm Markdown contains the quotations and note, contains
    `&lt;img src=x onerror\(1\)&gt;`, and contains no executable literal
    `<img src=x onerror=alert(1)>` element.
11. Remove the unpacked extension, close the fixture server, and delete the disposable profile.

## Automated packaged Firefox evidence

`pnpm test:e2e:firefox` rebuilds `.output/tracemark-1.0.0-firefox.zip`, creates a fresh temporary
Firefox profile and download directory, and removes both after Firefox exits. The script:

1. Reads the generated manifest from the release ZIP and asserts Manifest V3, TraceMark `1.0.0`,
   add-on ID `tracemark@mateoosoriodelhonte.github.io`, minimum Firefox `142.0`, and the packaged
   `sidepanel.html` sidebar declaration.
2. Starts real Firefox through WebDriver and temporarily installs that ZIP with
   `installAddon(path, true)`. The returned add-on ID must match the manifest.
3. Maps that add-on ID to the deterministic UUID
   `6f3f6066-69e2-48c0-9d55-f273a22a830e` in the clean profile.
4. Opens the real packaged `moz-extension://…/sidepanel.html` in a tab and switches back to normal
   content context before inspecting it. Firefox 154 rejects direct WebDriver navigation to a
   `moz-extension:` URL, so geckodriver is started with its explicit `--allow-system-access` test
   flag and the known packaged URL is loaded through Firefox chrome context. This opens a page; it
   does not invoke an extension action or confer `activeTab`. The harness is local-only: it disables
   Selenium environment overrides and fails closed if `SELENIUM_REMOTE_URL`, `SELENIUM_SERVER_JAR`,
   or `SELENIUM_BROWSER` is configured.
5. Proves background startup through the packaged library's successful initial requests and
   `0 saved quotations.` status.
6. Uses the real Backup UI to import two strict, deterministic records from the checked-in fixture
   server. It then verifies library rendering, edit persistence, tag search, filter clearing, and
   literal rendering of `<img src=x onerror=alert(1)>` with no `img` element.
7. Downloads JSON and Markdown through the packaged UI, reads the browser-created files, and checks
   that edits and both quotations are present and hostile markup is escaped.

The import is deliberate: it establishes deterministic library state through a supported user
surface without a production hook or extra permission.

## What remains outside packaged automation

Chrome and Firefox grant `activeTab` only after qualifying browser-chrome user gestures. Playwright
and Selenium can control web and extension documents, but these suites do not fabricate a toolbar
click, native extension context-menu click, or browser-level command. Therefore packaged automation
does **not** claim:

- toolbar-popup capture;
- capture from **Save selection to TraceMark** in the browser's native context menu;
- capture from the `Alt+Shift+S` extension command;
- successful **Mark on page** anchoring, which also needs `activeTab` on the source tab;
- layout or operation of the library inside Chrome's side-panel chrome or Firefox's native sidebar
  chrome (the packaged pages are automated in normal tabs).

The browser-agnostic automated evidence for those code paths is:

```sh
pnpm exec vitest run tests/integration/capture-flow.test.ts \
  tests/integration/anchor-flow.test.ts tests/ui/popup.test.ts
```

Those tests cover the capture, save, and anchor contracts, but they are not a substitute for the
real-browser release checklists in this file.

## Firefox manual capture, anchor, and export checklist

No manual Firefox browser-chrome run was recorded as completed during Task 3. Before release, run
this checklist and record the Firefox version, OS, date, tester, and any deviations with the release
evidence:

1. Run `pnpm package:build && pnpm package:validate` from a clean checkout.
2. Start the checked-in fixture server and keep it running. Record the printed origin:

   ```sh
   node --experimental-strip-types --input-type=module -e "import('./tests/e2e/server.ts').then(async ({ startFixtureServer }) => { const server = await startFixtureServer(); console.log(server.origin); process.on('SIGINT', async () => { await server.close(); process.exit(0); }); })"
   ```

3. Create and open a new Firefox profile using Firefox's Profile Manager. In
   `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select
   `.output/firefox-mv3/manifest.json`. Confirm the extension is named **TraceMark** and its ID is
   `tracemark@mateoosoriodelhonte.github.io`.
4. Open `<printed-origin>/article.html`. Select exactly `retrieval quality matters`, including the
   words split across inline elements. Click the TraceMark toolbar action. Confirm the popup shows
   exactly that quotation, then choose **Save quotation**.
5. Open **TraceMark Research Library** from Firefox's sidebar selector. Confirm one quotation exists,
   its title is **Retrieval systems**, its host is `127.0.0.1`, and the exact selected text is
   preserved.
6. Edit that quotation. Set tags to `firefox-evidence, release-ready` and the note to
   `Edited through the packaged Firefox research library.` Save, search for `firefox-evidence`, and
   confirm exactly that quotation remains.
7. Return to `<printed-origin>/article.html` and keep it active. In the TraceMark sidebar choose
   **Mark on page** for the saved quotation. Confirm the status says
   `Marked the saved quotation on this page.`, all three inline quote fragments are marked, and the
   page text is unchanged.
8. Clear the library search. On `<printed-origin>/hostile.html`, select exactly
   `<img src=x onerror=alert(1)>`. Right-click the selection and choose
   **Save selection to TraceMark**. Confirm the library displays the literal text, creates no image,
   and opens no script dialog.
9. On `<printed-origin>/repeated.html`, select one exact `repeated claim` and press `Alt+Shift+S`.
   Confirm one new Inbox quotation appears. Choose **Mark on page** while the repeated fixture is
   active and confirm TraceMark reports that the quotation is ambiguous rather than guessing which
   occurrence to mark.
10. Open **Backups** and download both **JSON backup** and **Markdown**. Confirm both downloads
    complete. Check that JSON contains the captured records and edited note/tags; check that Markdown
    contains the quotations and note, contains `&lt;img src=x onerror\\(1\\)&gt;`, and does not contain
    a literal executable `<img src=x onerror=alert(1)>` element.
11. Remove the temporary add-on, close the fixture server, and delete the disposable Firefox profile.
