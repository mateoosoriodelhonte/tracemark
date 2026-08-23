# Contributing to TraceMark

Thank you for helping make TraceMark safer and more useful. Contributions should preserve its
local-first design, narrow permission surface, exact-source behavior, and Chrome/Firefox support.

## Before opening a change

- Search existing issues and keep each change focused.
- For bugs, include a minimal reproduction with browser and operating-system versions.
- Discuss changes that add permissions, network destinations, persistent page access, storage
  formats, or user-visible workflows before implementing them.
- Report vulnerabilities through [SECURITY.md](SECURITY.md), never through a public exploit report.

## Set up the project

Prerequisites are Node.js 22 or newer and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use `pnpm dev:firefox` for the Firefox development runner. Generated browser builds are written to
`.output/`.

## Make a change

1. Create a focused branch and add tests that demonstrate the intended behavior.
2. Keep untrusted webpage, backup, and AI data behind the existing schemas and message boundary.
3. Do not add a browser permission or network origin without updating `wxt.config.ts`, manifest and
   package assertions, [PRIVACY.md](PRIVACY.md), and [docs/PERMISSIONS.md](docs/PERMISSIONS.md).
4. Preserve runtime `scripting.executeScript` injection unless an approved design explicitly changes
   the privacy model.
5. Run formatting and the smallest relevant tests while iterating.

Useful commands:

| Command                 | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm test`             | Unit, component, storage, and browser-agnostic integration tests |
| `pnpm check:manifests`  | Assertions against generated Chrome and Firefox manifests        |
| `pnpm typecheck`        | Svelte and TypeScript checks                                     |
| `pnpm lint`             | ESLint                                                           |
| `pnpm format:check`     | Prettier verification                                            |
| `pnpm build:chrome`     | Production Chrome build                                          |
| `pnpm build:firefox`    | Production Firefox build                                         |
| `pnpm package:build`    | Chrome and Firefox release ZIPs                                  |
| `pnpm package:validate` | Release archive contents and permission contract                 |

Run the full local quality gate before requesting review:

```sh
pnpm check
```

The quality gate builds both exact release ZIPs before the Vitest archive assertions, so no archive
needs to preexist in a clean checkout.

Changes that affect browser startup, library workflows, or packaging should also run the relevant
packaged tests described in [docs/TESTING.md](docs/TESTING.md). Capture and anchor changes require
the manual browser-gesture checklist because WebDriver does not prove browser-chrome `activeTab`
gestures.

## Commit conventions

- Keep each commit focused on one reviewable purpose and use an imperative subject line.
- Prefer the established `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, and `chore:` prefixes.
- Separate documentation corrections from product behavior changes when they can be reviewed and
  reverted independently.
- Do not commit generated `.output/` files, downloaded archives, browser profiles, or local test
  artifacts.
- Use a Git email connected to your GitHub account when you want GitHub to attribute the commit to
  your profile.

Documentation-only commits still run `pnpm format:check` and `pnpm docs:links`. Run `pnpm check`
before merging so a documentation change cannot accidentally bypass the repository-wide gate.

## Pull requests

A pull request should:

- explain the user-facing problem and the chosen scope;
- identify privacy, permission, storage, and migration effects;
- list exact verification commands and manual checks performed;
- include screenshots for visible UI changes; and
- update user and architecture documentation when behavior changes.

Keep generated `.output/`, downloads, browser profiles, test results, and secrets out of commits.
By contributing, you agree that your contribution is licensed under the repository's
[MIT License](LICENSE).
