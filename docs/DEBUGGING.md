# Debugging TraceMark

Debug a built extension in the browser that owns the behavior. TraceMark uses WXT to produce
browser-specific MV3 builds, and Chrome’s side panel and Firefox’s sidebar are native browser
surfaces. A page opened directly at an extension URL is useful for inspecting the library, but it
does not prove browser-chrome gestures or grant `activeTab`.

## Start with the smallest reproduction

Record the TraceMark commit or version, browser and version, operating system, installation path,
and exact user action. Reproduce with a disposable profile and a harmless public page or local
fixture. Keep saved research, full browsing histories, profile paths, credentials, and security
details out of issue reports and shared logs.

For an ordinary development loop, run one of these commands and inspect the corresponding WXT
output:

```sh
pnpm dev
pnpm dev:firefox
pnpm build:chrome
pnpm build:firefox
```

Load Chrome from `.output/chrome-mv3`. Load Firefox temporarily from
`.output/firefox-mv3/manifest.json`. Use the browser’s extension-management page to inspect
extension errors and to open developer tools for the extension UI or background context. Rebuild
after changing generated-manifest or entrypoint behavior, then reload the unpacked or temporary
extension before retesting.

## Match the symptom to its boundary

Capture and anchoring require a qualifying browser gesture on the active source tab: the toolbar,
the selection context menu, or `Alt+Shift+S`. Opening the library, its developer tools, or a
normal extension page does not create that grant. On a fresh source tab, **Mark on page** should
ask the user to invoke the toolbar action or command before retrying. Browser-internal pages,
stores, and browser-owned PDF viewers can reject injection even after a gesture.

If a saved quote will not mark, check the active tab’s URL against the saved source/canonical URL,
then check whether the quotation still exists exactly once with matching context. The anchorer
intentionally refuses missing, changed, or ambiguous text rather than guessing. A successful mark
is an in-page runtime annotation and disappears when the page reloads.

For library, search, backup, or import behavior, inspect the extension page’s console and reproduce
through the real UI. Research records live in extension IndexedDB; theme and local-AI preferences
live in `browser.storage.local`. Do not “fix” a suspected import problem by manually editing either
store. Use a small backup fixture and preserve the original file for comparison. Imports are strict,
normalized, and merged transactionally, so malformed or inconsistent data should be rejected.

## Permissions and local AI

TraceMark has no static website hosts or content scripts. Its only optional origin is
`http://127.0.0.1:11434/*` for local Ollama. Verify grants in the browser’s extension settings as
well as in the UI. Firefox has two explicit steps: **Enable local AI** requests optional built-in
data consent, then **Continue enabling local AI** requests the loopback origin. Chromium requests
the origin from its enable action. A missing, revoked, unknown, or cleanup-pending grant must block
transmission; do not broaden a permission just to make a test pass. See [PERMISSIONS.md](PERMISSIONS.md).

## Turn observations into evidence

Use `pnpm test` for browser-independent behavior and `pnpm check:manifests` after manifest work.
Use `pnpm test:e2e:chromium` or `pnpm test:e2e:firefox:release` for packaged-library evidence when
the required browsers are available. These suites do not automate the native toolbar, context menu,
command, permission prompts, Chrome side-panel chrome, or Firefox sidebar chrome. Follow the
manual checklists in [TESTING.md](TESTING.md) for those interactions and report exactly what was
observed rather than treating an automated package test as gesture evidence.
