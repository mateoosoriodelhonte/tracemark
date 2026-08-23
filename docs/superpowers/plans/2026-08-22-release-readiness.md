# TraceMark v1.0 Release Readiness Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task by task, with test-first implementation and review checkpoints.

**Goal:** Finish Issue #6 by proving the packaged extension in Chromium and Firefox, documenting the real privacy and permission model, generating deterministic store-safe screenshots, and publishing the verified v1.0.0 GitHub release.

**Architecture:** Keep browser automation outside production code. Build both WXT targets, serve the existing deterministic fixtures from localhost, load the unpacked Chromium build through a Playwright persistent context, and install the temporary Firefox package through WebDriver where Firefox exposes the required extension surface. Validate release ZIPs independently of browser automation. Derive documentation and store materials from the built manifests and verified behavior, and create screenshots from the existing mocked preview plus deterministic demo data only.

**Tech Stack:** WXT MV3, Svelte 5, Vitest, Playwright, Selenium WebDriver, web-ext, GitHub Actions, pnpm.

---

### Task 1: Release package contract and fixture server

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `tests/e2e/server.ts`
- Create: `tests/e2e/manifest-packages.test.ts`
- Create: `scripts/validate-packages.ts`

1. Add failing tests for the exact Chrome and Firefox release archive names, required manifest differences, forbidden static host permissions/content scripts, required package files, and absence of source maps and obvious private material.
2. Run the package test and record the expected red result because v1.0.0 archives and validation scripts do not exist.
3. Add pinned Playwright and Selenium development dependencies, deterministic fixture-server helpers, package/validation scripts, and archive inspection with actionable failures.
4. Build and zip both targets, then run the focused package test and validator until green.
5. Review the implementation for correctness and test quality before continuing.

### Task 2: Packaged Chromium critical-flow evidence

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/e2e/chromium.spec.ts`
- Modify: `package.json`

1. Add a Playwright test that launches the built Chrome MV3 extension in a persistent Chromium context and serves the checked-in fixture site.
2. Exercise the user-visible packaged flow without test-only production hooks: select fixture text, trigger capture, save the quotation, open the library, find and edit it, apply an anchor, and verify hostile fixture content remains inert.
3. Verify JSON and Markdown export behavior through the packaged surface where the browser API exposes downloads; leave lower-level backup round-trip coverage in the existing integration suite.
4. Run the test repeatedly against a fresh browser profile, then review for flakiness and extension-security regressions.

### Task 3: Firefox package evidence and honest automation boundary

**Files:**

- Create: `tests/e2e/firefox.ts`
- Modify: `package.json`
- Create: `docs/TESTING.md`

1. Install the packaged Firefox extension temporarily through Selenium/WebDriver and assert the generated manifest, extension startup, and user-facing extension page available to WebDriver.
2. Exercise capture/library/anchor/export through WebDriver only where Firefox exposes that surface; use the existing browser-agnostic integration suite as the recorded evidence for inaccessible browser chrome.
3. Make unavailable local Firefox/geckodriver prerequisites produce a clear opt-in skip locally but a hard failure in the release command.
4. Document exactly what is automated, what was manually checked in Firefox, and which browser-chrome interactions remain manual.
5. Review claims against the commands and recorded output.

### Task 4: Portfolio README, policies, architecture, and contributor docs

**Files:**

- Create: `README.md`
- Create: `PRIVACY.md`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `LICENSE`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/PERMISSIONS.md`
- Modify: `docs/TESTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/pull_request_template.md`

1. Write a portfolio-quality README whose first screen explains TraceMark, shows the real interface, names Chrome and Firefox, and states the local-first privacy promise.
2. Document manual installation, core capture/search/edit/anchor/backup workflows, optional Ollama setup, development commands, browser limitations, and project status without claiming store availability.
3. Document data storage, backup risk, optional loopback-only Ollama traffic, exact permissions and runtime injection, architecture/trust boundaries, vulnerability reporting, and contribution/test expectations.
4. Cross-check every technical statement against source, manifests, tests, and official browser documentation.

### Task 5: Store copy and deterministic screenshots

**Files:**

- Create: `scripts/capture-screenshots.ts`
- Create: `docs/images/tracemark-library.png`
- Create: `docs/images/tracemark-search.png`
- Create: `docs/images/tracemark-local-ai.png`
- Create: `docs/store/chrome-listing.md`
- Create: `docs/store/firefox-listing.md`
- Create: `docs/store/privacy-answers.md`
- Create: `docs/STORE_SUBMISSION.md`
- Modify: `README.md`
- Modify: `package.json`

1. Generate all screenshot images from checked-in deterministic preview/demo data at official store-compatible dimensions; never include browsing history, account data, credentials, or real research.
2. Visually inspect each generated image at full size for cropping, illegible text, unsafe data, stale UI, and misleading states.
3. Write Chrome and Firefox listing copy, support/privacy answers, asset inventory, and the exact human submission checklist.
4. Add the strongest real screenshot to the README and ensure all referenced assets resolve.

### Task 6: CI, version promotion, and reproducible release gate

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `scripts/create-checksums.ts`
- Modify: `docs/TESTING.md`

1. Split fast verification, packaged Chromium E2E, package validation, and artifact upload into dependency-frozen CI jobs with least-privilege workflow permissions.
2. Promote the package version to `1.0.0`, rebuild/zip both browser targets, and create SHA-256 checksums from the final archives.
3. Run `pnpm check`, packaged Chromium E2E, strict Firefox evidence, package validation, the secret scan, ZIP listing inspection, documentation-link validation, and screenshot generation/check mode.
4. Record exact test counts, browser/package evidence, filenames, sizes, and checksums in `docs/TESTING.md`.
5. Perform implementation, security/privacy, browser-user, and hiring-manager reviews; fix every reasonable finding with a regression test where applicable.

### Task 7: Pull request, merge, tag, and GitHub release

**Files:**

- Modify only files required by review or CI findings.

1. Commit release preparation, push `codex/issue-6-release`, and open a PR that closes Issue #6 with verification, permission/privacy impact, package evidence, and screenshot links.
2. Wait for all remote checks, fix failures test-first, and merge only after the PR is green and reviewed.
3. Sync local `main`, rerun the full release gate against the merge commit, and verify the working tree is clean.
4. Create annotated tag `v1.0.0`, publish a GitHub release with release notes, both browser archives, and `SHA256SUMS`; do not submit to either browser store.
5. Verify the release URL, assets, checksums, tag target, closed issue, and final open-issue count.
