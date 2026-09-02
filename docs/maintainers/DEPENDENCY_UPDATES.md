# Dependency updates

Dependency updates are code changes even when the application source diff is empty. Review the
resolved lockfile, generated packages, and tool output instead of relying on an automated PR title.

## Review the proposed resolution

1. Read upstream release notes and migration guidance for every direct package that changes.
2. Inspect both `package.json` and `pnpm-lock.yaml`; identify transitive additions, removals, peer
   changes, install scripts, and unexpected registry or integrity changes.
3. Confirm the update stays within TraceMark's supported Node.js, pnpm, browser, TypeScript, Svelte,
   WXT, Playwright, Selenium, and web-extension toolchain.
4. Treat manifest generation, bundling, linting, ZIP layout, or browser-launch changes as release
   risks even when the dependency is marked development-only.

Do not approve a changed Dependabot head based on checks or review attached to an earlier commit.
Re-read the new diff, confirm current CI, and submit a fresh conclusion against the current head.

## Verification by dependency role

- Schema, storage, and IndexedDB libraries require data-integrity and migration tests.
- Svelte or UI tooling requires component, type, and packaged-page checks.
- WXT, browser polyfills, `web-ext`, Playwright, or Selenium requires manifest, archive, and relevant
  packaged-browser evidence.
- ESLint, Prettier, TypeScript, or type-check tooling requires the full static gate and review of any
  newly surfaced or newly suppressed diagnostics.
- ZIP, hashing, or filesystem tooling requires archive inventory and checksum verification.

Run `pnpm install --frozen-lockfile` from the proposed lockfile and then `pnpm check`. Use strict
packaged Firefox or Chromium tests when the dependency can affect those paths. Compare release
archive listings and hashes when a tool update is expected to be behavior-neutral.

## Merge record

Record the versions reviewed, upstream compatibility note, exact commands, current CI conclusion,
and any deferred native-browser check. Use a normal merge policy consistent with the repository;
do not mix unrelated product work into the dependency branch.

See [REPRODUCIBLE_BUILDS.md](REPRODUCIBLE_BUILDS.md) and
[PACKAGE_AUDIT.md](PACKAGE_AUDIT.md) for artifact-focused review.
