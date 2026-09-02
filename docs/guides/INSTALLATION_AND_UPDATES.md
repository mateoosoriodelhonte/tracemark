# Installation and updates

TraceMark 1.0.0 is distributed through GitHub Releases, not the Chrome Web Store or Firefox
Add-ons. The installation steps therefore use Chrome's unpacked-extension flow or Firefox's
temporary add-on flow.

## Install a reviewed package

Download the browser archive and `SHA256SUMS` from the
[v1.0.0 release](https://github.com/mateoosoriodelhonte/tracemark/releases/tag/v1.0.0). Verify the
archive before extracting or loading it. On macOS or Linux, run `shasum -a 256 <filename>` and
compare the output to the matching line in `SHA256SUMS`.

For Chrome, extract the Chrome ZIP, open `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select the extracted directory containing `manifest.json`.

For Firefox 142 or newer, extract the Firefox ZIP, open
`about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select
`manifest.json`. The unsigned add-on is removed when Firefox restarts.

## Update an unpacked installation

Back up your research before replacing a development or unpacked build. Download and verify the
new package, extract it to a new directory, then use the browser's extension-management page to
reload or replace the old directory. Keep the extension ID and browser profile in mind: loading a
separate unpacked copy can create separate extension storage rather than upgrading the existing
library.

After an update, open the research library, confirm existing quotations are present, run a harmless
search, and export a fresh JSON backup. If permissions or optional Local AI changed, inspect the
browser's extension permissions rather than assuming earlier grants carried forward.

## Build instead of downloading

Developers can build from the pinned source with `pnpm install --frozen-lockfile`,
`pnpm build:chrome`, and `pnpm build:firefox`. Source-build output belongs in `.output/` and is not
the same evidence as a published release archive. See [DEVELOPMENT_SETUP.md](../DEVELOPMENT_SETUP.md)
and [RELEASE_ARTIFACTS.md](../reference/RELEASE_ARTIFACTS.md).
