# Issue triage

Triage turns a report into a safe, reproducible unit of work without collecting private research.
Public issues are appropriate for ordinary bugs and feature requests; potential vulnerabilities
must follow [SECURITY.md](../../SECURITY.md).

## Initial pass

1. Confirm the report includes a TraceMark version or commit, browser and version, operating system,
   installation route, expected result, and exact reproduction steps.
2. Remove or ask the reporter to remove quotations, URLs, browser-profile paths, credentials, and
   other sensitive data. Prefer the repository fixture or harmless synthetic text.
3. Search for duplicates by symptom and boundary, not only by title.
4. Classify the affected surface: capture, anchoring, library, storage, import/export, Local AI,
   packaging, browser-native UI, documentation, or accessibility.
5. Reproduce at the narrowest useful layer and record what was actually observed.

## Severity and scope

Prioritize possible data loss, unintended disclosure or transmission, permission broadening,
unrecoverable imports, and package-integrity failures. A regression affecting both supported
browsers normally has wider scope than a browser-specific native-surface issue, but severity still
depends on impact and available recovery.

A feature request that adds a network destination, stored field, permission, persistent page
access, or backup change needs design discussion before implementation. Record the privacy,
migration, compatibility, and recovery questions in the issue.

## Reproduction evidence

State whether evidence came from a unit/component test, generated manifest, packaged extension,
native browser gesture, or visual/manual check. A direct extension-page reproduction does not prove
toolbar, context-menu, command, side-panel, sidebar, or permission-prompt behavior.

When the report is actionable, write a compact acceptance statement: the initial state, user action,
expected result, browsers in scope, and regression test or manual check required. Link relevant
guidance from [DEBUGGING.md](../DEBUGGING.md) and [TESTING.md](../TESTING.md).

Close only with a reason that future readers can evaluate: duplicate link, unreproducible after
requested evidence, out of supported scope, superseded design, fixed commit, or completed release.
