# Test strategy

TraceMark uses layered evidence because no single harness can prove domain correctness, browser
packaging, and native extension gestures at the same time. Choose the lowest layer that reproduces a
behavior, then add higher-layer evidence when a boundary is involved.

## Evidence layers

| Layer                      | Best suited to                                                                | Does not prove                                          |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| Domain and service tests   | Schemas, normalization, search, anchoring decisions, merge rules, errors      | Browser APIs or packaged startup                        |
| Storage tests              | IndexedDB repositories, transactions, deletion, migrations                    | A real browser profile upgrade                          |
| Component tests            | Labels, dialogs, focus, inert rendering, library workflows                    | Native panel/sidebar chrome                             |
| Manifest and archive tests | Generated permissions, inventory, browser-specific declarations               | Runtime behavior                                        |
| Packaged-browser tests     | Real extension startup, library pages, storage, edits, downloads              | Toolbar/context-menu/command gestures or native prompts |
| Manual browser checks      | Browser-owned gestures, prompts, side panel, sidebar, protected-page behavior | Broad repeatable regression coverage                    |

## Selecting coverage

A bug fix begins with a failing test at the smallest layer that expresses the contract. Add boundary
tests for parsing untrusted page, message, backup, or AI data. Storage-shape changes need fresh-install,
upgrade, failure-rollback, and import/export coverage. Manifest, WXT, permission, entrypoint, build,
or dependency changes need both browser packages and archive validation.

Capture and anchoring should test source checks, gesture error guidance, exact matching, ambiguity,
and invalid responses. Local AI should test consent and origin state, denial, revocation, cleanup,
timeouts, response bounds, parsing, and inert display without requiring a real model for deterministic
unit coverage.

## Reporting results

List exact commands, test counts, browser/tool versions, manual actions, and failures or skips. A
non-strict optional skip is not release evidence. Never replace a missing native observation with a
claim based on an extension page opened directly in a tab.

Run focused tests while iterating and `pnpm check` before merge. Use the packaged commands and fresh
profile procedures in [TESTING.md](../TESTING.md) when the changed boundary requires them.
