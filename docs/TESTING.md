# Testing TraceMark

TraceMark separates browser-agnostic behavior tests from evidence collected against the packaged
Chrome and Firefox extensions. A green component or integration test does not, by itself, prove a
browser package starts. Likewise, a packaged library test does not prove browser-chrome gestures
that WebDriver cannot perform.

## Evidence at a glance

| Question                                                | Evidence                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Do domain, storage, messaging, and UI behaviors pass?   | `pnpm test`                                                              |
| Do source, manifests, packages, docs, and assets agree? | `pnpm check`                                                             |
| Does the packaged library run in Chromium and Firefox?  | `pnpm test:e2e:chromium` and `pnpm test:e2e:firefox:release`             |
| Do browser-owned gestures and permission prompts work?  | The fresh-profile Chrome and Firefox manual checklists in this document. |

No single row substitutes for another. A release review should cite the exact commands and manual
steps it performed instead of summarizing them as a generic “tests passed.”

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
| Complete reproducible quality and package gate                   | `pnpm check`                                                            |
| Unit, component, storage, and browser-agnostic integration tests | `pnpm test`                                                             |
| Generated Chrome and Firefox manifest checks                     | `pnpm check:manifests`                                                  |
| Release ZIP contract                                             | `pnpm package:build && pnpm test:e2e:packages && pnpm package:validate` |
| Browser archive checksums                                        | `pnpm package:checksums`                                                |
| Tracked relative Markdown links                                  | `pnpm docs:links`                                                       |
| Tracked source secret patterns                                   | `pnpm secrets:scan`                                                     |
| Deterministic store assets                                       | `pnpm screenshots && pnpm screenshots:check`                            |
| Packaged Chromium                                                | `pnpm test:e2e:chromium`                                                |
| Packaged Firefox, normal local run                               | `pnpm test:e2e:firefox`                                                 |
| Packaged Firefox, strict release run                             | `pnpm test:e2e:firefox:release`                                         |

`pnpm check` is the repository quality gate. It runs formatting verification, lint, type checking,
tracked-source secret scanning, both production package builds, the full Vitest suite,
release-package validation, browser-archive checksum creation, `web-ext lint` against the generated
Firefox directory, tracked relative-link validation, and screenshot validation. It creates the exact
required ZIPs before any ZIP-dependent test, so `pnpm check` is self-sufficient when `.output`
contains no prior archives. Packaged Chromium and Firefox execution remain separate because they
require installed browsers and, for Firefox, a compatible WebDriver environment.

## Recorded v1.0.0 release gate

The local release gate was recorded on 2026-08-23 on macOS arm64 with Node.js 26.0.0, pnpm 11.19.0,
Playwright 1.62.1, Firefox 154.0, and geckodriver 0.37.1. Generated archives were removed before
`pnpm check` to rule out a stale-artifact pass.

| Evidence                      | Recorded result                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Archive-free `pnpm check`     | 33 Vitest files and 264 tests passed; format, lint, typecheck, secret scan, packages, checksums, links, and screenshots passed. |
| Packaged Chromium             | 2 Playwright tests passed against a fresh profile and the real unpacked Chrome MV3 build.                                       |
| Packaged Firefox strict run   | Firefox 154.0 temporarily installed the exact Firefox ZIP; packaged manifest, startup, library, edit, and exports passed.       |
| Deterministic store assets    | All 4 assets regenerated and then passed structural/dimension check mode.                                                       |
| `web-ext lint`                | 0 errors, 0 notices, and 1 warning in WXT's generated Svelte client chunk for dynamic `innerHTML` assignment.                   |
| Documentation and secret gate | All tracked relative Markdown links resolved; the tracked-file secret-pattern scan reported no release-source matches.          |

The final browser release inventory is:

| File                                   | Bytes   | SHA-256                                                                                          |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `tracemark-1.0.0-chrome.zip`           | 167,051 | `baac07ddceb5573f24e582c7af8325c344c91495bf3cff6f65691c7c239c13ce`                               |
| `tracemark-1.0.0-firefox.zip`          | 167,179 | `42fe0512f78c17e6a8526d367fab0d204f5e5d4f23bfc9c22813bcb84cb5c1c9`                               |
| `SHA256SUMS`                           | 187     | Contains the two sorted lowercase browser-archive records above.                                 |
| `tracemark-1.0.0-sources.zip` (review) | —       | Generated for Mozilla source review; intentionally excluded from the release checksum inventory. |

An immediate second build produced the same Chrome and Firefox SHA-256 values. Both built manifests
declare Manifest V3 and version `1.0.0`; the archive names exactly match the table.

GitHub Actions repeats the frozen-lockfile source gate on Node.js 24, runs packaged Chromium with
Playwright's Chromium system dependencies in a dedicated job, then independently rebuilds and
validates the three ZIPs, checks the browser checksums, scans tracked release source for secret
patterns without printing matched contents, checks screenshots, inspects ZIP listings, and uploads
the three ZIPs plus `SHA256SUMS`. Strict Firefox WebDriver execution remains a local release gate;
the native browser gestures listed below remain manual checks in both browsers and are not claimed
by CI.

The public `v1.0.0` GitHub release was created only after the local and post-merge automated gates
passed. Its release notes explicitly preserve the native-browser evidence limitation below.

## Native-browser manual evidence status

The native browser checklist is still pending; automated browser runs and mocks are not recorded as
proof of browser-owned prompts or chrome.

- Google Chrome 151.0.7922.138 was launched on August 22, 2026 with a new disposable profile and
  the unpacked-build command-line flags, but no extension service worker appeared within 15
  seconds. The dedicated Chrome-control connector was unavailable and macOS Accessibility access
  to System Events was blocked. Manual **Load unpacked**, toolbar, native context menu, keyboard
  shortcut, side panel, fresh-tab gesture recovery, and export interactions therefore were not
  completed in Google Chrome.
- The strict Firefox 154.0/geckodriver 0.37.1 fresh-profile run temporarily installed the exact ZIP
  and passed its automated packaged-page checks. That harness opens the declared sidebar page in a
  normal tab and cannot operate the native toolbar, context menu, command UI, sidebar chrome, or
  permission doorhangers. Those gestures, fresh-tab recovery, and Firefox's actual two prompts
  remain pending.

Do not submit to either browser store until a human completes and records both checklists below.
The GitHub release does not claim these interactions as automated evidence.

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
7. Close the original article tab, open `<printed-origin>/article.html` in a new tab, and keep it
   active. In the TraceMark side panel choose **Mark on page** before invoking TraceMark on that
   fresh tab. Confirm the status explicitly says to invoke the TraceMark toolbar action or press
   `Alt+Shift+S` on that tab and then retry. Invoke the toolbar action, close the popup, and retry
   **Mark on page**. Confirm the status says `Marked the saved quotation on this page.`, all three
   inline quote fragments are marked, and the page text is unchanged. If Chrome identifies the
   page as protected, record that distinct limitation instead of claiming recovery.
8. Clear the library search. On `<printed-origin>/hostile.html`, select exactly
   `<img src=x onerror=alert(1)>`. Right-click the selection and choose
   **Save selection to TraceMark**. Return to the library and choose **Search** to refresh it.
   Confirm literal text is displayed, no image is created, and no script dialog opens.
9. On `<printed-origin>/repeated.html`, select one exact `repeated claim` and press `Alt+Shift+S`.
   Return to the library and choose **Search** to refresh it, then confirm a new Inbox quotation
   appears. Keep the repeated fixture tab active, choose **Mark on page**, and confirm TraceMark
   reports ambiguity rather than guessing.
10. Open **Backups** and download JSON and Markdown. Confirm JSON contains the captured records and
    edited note/tags; confirm Markdown contains the quotations and note, contains
    `&lt;img src=x onerror=alert\(1\)&gt;`, and contains no executable literal
    `<img src=x onerror=alert(1)>` element.
11. Remove the unpacked extension, close the fixture server, and delete the disposable profile.

## Automated packaged Firefox evidence

`pnpm test:e2e:firefox` rebuilds `.output/tracemark-1.0.0-firefox.zip`, creates a fresh temporary
Firefox profile and download directory, and removes both after Firefox exits. The script:

1. Reads the generated manifest from the release ZIP and asserts Manifest V3, TraceMark `1.0.0`,
   add-on ID `tracemark@mateoosoriodelhonte.github.io`, minimum Firefox `142.0`, and the packaged
   `sidepanel.html` sidebar declaration and both optional data types, `websiteContent` and
   `browsingActivity`.
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
7. Close the original article tab, open `<printed-origin>/article.html` in a new tab, and keep it
   active. In the TraceMark sidebar choose **Mark on page** before invoking TraceMark on that fresh
   tab. Confirm the status explicitly says to invoke the TraceMark toolbar action or press
   `Alt+Shift+S` on that tab and then retry. Invoke the toolbar action, close the popup, and retry
   **Mark on page**. Confirm the status says `Marked the saved quotation on this page.`, all three
   inline quote fragments are marked, and the page text is unchanged. If Firefox identifies the
   page as protected, record that distinct limitation instead of claiming recovery.
8. Clear the library search. On `<printed-origin>/hostile.html`, select exactly
   `<img src=x onerror=alert(1)>`. Right-click the selection and choose
   **Save selection to TraceMark**. Return to the library and choose **Search** to refresh it.
   Confirm the library displays the literal text, creates no image, and opens no script dialog.
9. On `<printed-origin>/repeated.html`, select one exact `repeated claim` and press `Alt+Shift+S`.
   Return to the library and choose **Search** to refresh it, then confirm one new Inbox quotation
   appears. Keep the repeated fixture tab active, choose **Mark on page**, and confirm TraceMark
   reports that the quotation is ambiguous rather than guessing which occurrence to mark.
10. With Ollama running locally, choose **Enable local AI**. Confirm Firefox first prompts for
    `websiteContent` and `browsingActivity` together and does not prompt for the loopback origin in
    the same click. Approve it and confirm TraceMark displays **Continue enabling local AI**.
    Choose that button with a second click, confirm Firefox then prompts for only
    `http://127.0.0.1:11434/*`, and approve it. Reloading between the two clicks must instead show
    cleanup guidance and must not silently continue to the origin prompt. Disable Local AI after
    recording the result.
11. Open **Backups** and download both **JSON backup** and **Markdown**. Confirm both downloads
    complete. Check that JSON contains the captured records and edited note/tags; check that Markdown
    contains the quotations and note, contains `&lt;img src=x onerror=alert\(1\)&gt;`, and does not
    contain a literal executable `<img src=x onerror=alert(1)>` element.
12. Remove the temporary add-on, close the fixture server, and delete the disposable Firefox profile.
