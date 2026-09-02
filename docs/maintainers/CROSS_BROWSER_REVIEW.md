# Cross-browser review

TraceMark shares application code but not every browser-owned surface. A review is complete only
when generated Chrome and Firefox behavior is compared at the layer the change can affect.

## Static comparison

Build both targets and inspect their manifests. Check required and optional permissions, commands,
content scripts, host access, background entry, extension URLs, Chrome `side_panel`, Firefox
`sidebar_action`, gecko ID and minimum version, and Firefox data-consent declarations. Run manifest
tests and package validation rather than inferring output from `wxt.config.ts` alone.

Review API availability and browser-polyfill behavior for background startup, context menus,
`activeTab`, runtime injection, storage, downloads, optional permissions, side-panel/sidebar
opening, and error values. A code path guarded only by user-agent text needs especially strong
justification.

## Runtime evidence

Use browser-agnostic tests for domain and message contracts. Run packaged Chromium or strict
packaged Firefox suites when startup, extension pages, database behavior, exports, manifests, or
bundling can change. Then use fresh disposable profiles for browser-native surfaces:

- toolbar, selection context menu, and `Alt+Shift+S` capture;
- fresh-tab `activeTab` recovery and protected-page errors;
- Chrome side panel and Firefox sidebar layout;
- optional Local AI prompts, denial, revocation, and cleanup; and
- download behavior and filename presentation.

Record browser version, operating system, package commit, action, and observed result. Do not label
an extension page opened in a normal tab as side-panel or sidebar evidence.

## Handling differences

Keep browser-specific code narrow and explain the user-visible difference. A limitation in one
browser should fail clearly without broadening permissions in both. Update the compatibility matrix,
testing notes, permission rationale, troubleshooting guidance, and store copy whenever the supported
contract changes.

See [BROWSER_COMPATIBILITY.md](../reference/BROWSER_COMPATIBILITY.md) for the published matrix.
