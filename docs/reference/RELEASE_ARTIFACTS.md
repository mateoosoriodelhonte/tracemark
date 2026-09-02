# Release artifacts

TraceMark's release pipeline produces reviewable browser packages from the pinned source tree.
Generated files belong in `.output/` and are not committed.

## Browser archives

`pnpm package:build` creates:

- `tracemark-1.0.0-chrome.zip`
- `tracemark-1.0.0-firefox.zip`
- `tracemark-1.0.0-sources.zip` as part of the Firefox packaging workflow

Each browser archive must contain the manifest, background script, popup, side-panel/sidebar page,
and required icon sizes. Validation rejects source maps, common private-material filenames,
unexpected static host permissions, static content scripts, wrong native panel declarations, and
permission drift. Firefox validation also checks its optional data-collection categories.

## Checksums

`pnpm package:checksums` writes `SHA256SUMS` for the exact Chrome and Firefox browser archives. It
fails if either expected archive is absent or another versioned Chrome/Firefox archive is present in
the output directory. A checksum establishes file identity after publication; it does not replace
source review, tests, or package inspection.

## Complete gate

`pnpm check` runs formatting, linting, type checking, secret scanning, both package builds, 264 unit
and integration tests, archive validation, checksum creation, Firefox lint, documentation-link
validation, and screenshot checks. Packaged Chromium execution and strict packaged Firefox
execution are separate commands with browser prerequisites.

The source ZIP includes documentation and source for review, so docs-only changes can change its
hash while leaving the executable Chrome and Firefox archives byte-for-byte identical. Compare the
browser archives when proving that documentation did not alter the extension.

Follow [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md) before publication and
[../STORE_SUBMISSION.md](../STORE_SUBMISSION.md) for store-specific steps.
