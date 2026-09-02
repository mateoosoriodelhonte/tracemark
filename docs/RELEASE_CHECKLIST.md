# Release checklist

Use this checklist to assemble release evidence around the store-submission runbook. It does not
replace [STORE_SUBMISSION.md](STORE_SUBMISSION.md): that document is the detailed browser-store
and asset procedure. Do not claim store readiness until the required native-browser checks in
[TESTING.md](TESTING.md) have actually been completed and recorded.

## Scope and version

- [ ] Confirm the release commit, intended version, and supported Chrome/Firefox scope.
- [ ] Review the changelog or release notes for accurate user-visible changes and known limits.
- [ ] Confirm any changed permission, host, storage, import/export, or AI behavior is described in
      [PRIVACY.md](../PRIVACY.md), [PERMISSIONS.md](PERMISSIONS.md), and the applicable user guide.
- [ ] Review dependency changes for browser compatibility, license implications, and unexpected
      runtime or build-tool changes.
- [ ] Ensure no generated `.output/` files, archives, profiles, downloads, screenshots from real
      research, secrets, or local test artifacts are staged for release.

## Reproducible build and automated evidence

- [ ] Begin from a clean, lockfile-resolved checkout and use Node.js 22+ with pnpm 11.19.0.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm check` and retain the terminal output or CI link. This is the repository-wide gate
      and creates the Chrome/Firefox ZIPs plus `SHA256SUMS`.
- [ ] Run `pnpm test:e2e:chromium` after installing Playwright Chromium when packaged Chromium
      evidence is required.
- [ ] Run `pnpm test:e2e:firefox:release` with a compatible Firefox/geckodriver environment. Do
      not use the opt-in non-strict Firefox skip for a release claim.
- [ ] If release outputs are rebuilt separately, run `pnpm package:validate` and
      `pnpm package:checksums`; verify that only the expected browser archives are present and that
      the checksum file names match those archives.

## Native browser evidence

- [ ] Complete the current Chrome manual capture, fresh-tab anchor recovery, ambiguity, inert
      rendering, and export checklist in [TESTING.md](TESTING.md), using the repository fixture and
      a disposable profile.
- [ ] Complete the corresponding Firefox checklist, including temporary-installation, native
      sidebar, capture, fresh-tab recovery, optional local-AI prompts if affected, and exports.
- [ ] Record browser version, operating system, date, tester, observed result, and deviations for
      both runs. Native gestures and prompts are not proven by Playwright or Selenium.
- [ ] Treat protected-page injection failures as browser limitations only when the extension
      reports them accurately; do not mask a regression by expanding permissions.

## Publish and handoff

- [ ] Compare the final artifacts and checksums with the release commit after the final build.
- [ ] Draft release notes that distinguish completed automated evidence from manual evidence and
      list material limitations honestly.
- [ ] Follow the Chrome and Firefox packaging, screenshots, listing, privacy, and review steps in
      [STORE_SUBMISSION.md](STORE_SUBMISSION.md). Store-specific signing and submission status are
      separate from a successful local build.
- [ ] After publication, verify the published artifact/version and download route, then monitor
      incoming reports through [../SUPPORT.md](../SUPPORT.md).

Archive the commands, artifact hashes, browser evidence, and reviewer decision with the release.
That record makes regressions and later store-review questions traceable without retaining private
user data.
