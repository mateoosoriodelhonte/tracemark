# Compatibility policy

TraceMark compatibility has three separate dimensions: browser runtime, portable research data,
and development tooling. A claim in one dimension does not imply the others.

## Browser runtime

The current Firefox manifest requires Firefox 142 or newer. Chrome support is demonstrated by the
project's Manifest V3 build and packaged Chromium test rather than by a promise covering every
Chromium derivative or historical version. Native side-panel, sidebar, gesture, and permission
behavior should be manually checked for a release when those paths are affected.

Protected browser pages, store pages, and browser-owned PDF viewers are outside ordinary webpage
compatibility because browsers can prohibit extension injection there.

## Backup compatibility

TraceMark 1.x exports version 1 JSON backup envelopes. Compatible changes should continue to import
valid earlier version 1 backups or provide a documented, tested migration path. Unknown envelope
versions fail validation rather than being guessed. Markdown exports are for reading and are not an
import contract.

Before changing record fields, IDs, limits, normalization, merge precedence, or referential rules,
review [BACKUP_FORMAT.md](BACKUP_FORMAT.md) and add fixtures that demonstrate old-to-new behavior.

## Development environment

Source development requires Node.js 22 or newer and the pnpm version pinned in `package.json`.
Exact dependency versions come from `pnpm-lock.yaml`. Tooling support may change between repository
revisions without changing already-published browser packages.

## Compatibility changes

A proposal that drops a supported browser, breaks a valid backup, changes an external file format,
or alters a documented user workflow must identify affected users, alternatives, migration,
recovery, release version, and communication. The maintainer records the decision in the issue or
pull request and updates user-facing documentation before release.

Current evidence and limitations are documented in [TESTING.md](TESTING.md).
