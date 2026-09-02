# Review checklist

Use this checklist with the pull-request template. Review the diff and generated browser artifacts,
not just the stated intent. A checked item should have evidence: a code location, test name, command
output, screenshot using synthetic data, or manual browser observation.

## Scope, privacy, and trust boundaries

- [ ] The change has one reviewable purpose and avoids unrelated refactors or generated output.
- [ ] Local-first behavior remains intact: no account, telemetry, analytics, cloud sync, or
      application backend has been introduced without an explicit approved design.
- [ ] New network destinations, requests, redirects, credentials, timeouts, and transmitted fields
      are identified. Local AI remains opt-in and loopback-only unless the approved scope says
      otherwise.
- [ ] Page DOM, URLs, selections, backup data, messages, and AI responses are treated as untrusted:
      schemas validate boundary data and UI rendering stays inert.
- [ ] Any new stored fields, derived fields, or migration behavior has an upgrade and recovery
      story. Check IndexedDB, `browser.storage.local`, export, and import effects separately.

## Permissions and browser behavior

- [ ] Manifest and WXT changes preserve the narrow permission contract or include a documented,
      reviewed reason for each new permission or origin.
- [ ] No static host permission or static content script has appeared accidentally. Runtime page
      injection still depends on an eligible `activeTab` gesture.
- [ ] Chrome side-panel and Firefox sidebar differences are tested or explicitly documented.
- [ ] Optional Ollama permission flows remain explicit, revocable, and fail closed when grants are
      missing, unknown, or cleanup is pending. Firefox’s applicable two-step data-consent/origin
      flow is considered.
- [ ] Generated manifests and release ZIPs are checked with `pnpm check:manifests`, builds, and
      `pnpm package:validate` when the change can affect them.

## Imports, exports, and data integrity

- [ ] Backup imports stay strict, size-bounded, referentially valid, normalized, and transactional.
      Invalid fixtures are rejected without partially changing local state.
- [ ] Imports do not overwrite newer local edits incorrectly; migrations preserve the canonical
      Inbox and derived search/provenance fields.
- [ ] JSON backup and Markdown export reflect intended changes, escape untrusted text, and contain
      no unintended personal data in fixtures or screenshots.
- [ ] Deletion and collection changes preserve documented relationships, including dependent AI
      results and Inbox behavior.

## UI, accessibility, and tests

- [ ] Visible changes have focused screenshots or a manual browser observation for both relevant
      browser surfaces. Error, loading, empty, keyboard, focus, and narrow-layout states are
      considered.
- [ ] Controls have usable names, sensible focus order, readable status/error feedback, and do not
      rely solely on color or pointer interaction. Consult [ACCESSIBILITY.md](ACCESSIBILITY.md).
- [ ] Tests demonstrate the new or repaired behavior at the lowest useful layer; boundary changes
      add regression coverage. Run the smallest relevant commands and list exact results.
- [ ] Changes involving packages, startup, capture, anchoring, or native extension UI include the
      appropriate packaged or manual evidence from [TESTING.md](TESTING.md), without overstating
      automation coverage.

## Final reviewer pass

- [ ] Dependency additions are necessary, pinned through the lockfile, and compatible with the
      supported toolchain and browser targets.
- [ ] Documentation, privacy notes, permission rationale, troubleshooting, and release instructions
      match behavior and limitations.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and relevant tests are recorded; use
      `pnpm check` for the full gate before merge when feasible.
- [ ] The diff contains no secrets, real research, unredacted logs, browser profiles, downloads, or
      security-sensitive details. Route vulnerabilities through [../SECURITY.md](../SECURITY.md).
