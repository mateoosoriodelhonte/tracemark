# Package audit

A release-package audit verifies the files a browser or store reviewer will receive, not only the
source tree that produced them. Always rebuild from the exact reviewed commit before drawing a
conclusion.

## Create the inventory

Run the frozen install and package commands from a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm package:build
pnpm package:validate
pnpm package:checksums
```

List every path in the Chrome, Firefox, and Firefox source-review ZIPs. Confirm the expected manifest,
background entry, popup, native library page, chunks, styles, and icons are present. Reject source
maps, browser profiles, downloads, local environment files, secret-like names, unneeded source in a
browser package, or files that are unexplained by the reviewed build.

## Inspect the contracts

Parse the packaged manifests and compare exact permissions, optional origins, commands, version,
Chrome side-panel declaration, Firefox sidebar declaration, gecko settings, and Firefox data consent.
Neither package may acquire a static website host permission or content script unnoticed.

Search packaged text for unintended remote origins, filesystem paths, credentials, private fixture
content, development servers, or telemetry endpoints. A search result requires inspection: bundled
library text can contain harmless strings, while an absent string does not prove the runtime cannot
construct a destination.

## Record the result

Use SHA-256 hashes to identify the exact Chrome and Firefox archives. The checksum file intentionally
covers browser artifacts; the source-review ZIP can change from documentation-only work while the
executable packages remain identical. Record byte sizes, hashes, commit, toolchain, validation output,
and any expected difference from the previous reviewed build.

Package validation is necessary but does not execute the extension or prove native browser gestures.
Pair it with the evidence described in [TEST_STRATEGY.md](TEST_STRATEGY.md) and the release checklist.
