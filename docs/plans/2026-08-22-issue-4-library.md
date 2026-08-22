# Issue #4: Local research library implementation plan

## Product shape

TraceMark's side panel is a compact, reading-focused local library. It keeps the primary path visible at narrow widths: search, filter, review a quotation, edit its organization, and return to the source. Collection administration and backups live in secondary dialogs so they do not crowd the research list.

The UI uses the existing warm paper/teal visual language, system fonts plus a restrained serif for quotations, CSS custom properties for system/light/dark themes, visible focus rings, native controls, semantic dialogs, live status regions, and motion only behind `prefers-reduced-motion: no-preference`.

## Task 1: Backup domain

Files:

- Add `src/core/backups.ts`
- Extend `src/domain/schemas.ts`
- Add `tests/core/backups.test.ts`

Implement a strict, versioned JSON backup envelope containing collections and highlights. Validate and normalize all input before an atomic merge transaction, preserve unrelated research and newer edits, remap identity collisions, skip semantic duplicates, require canonical Inbox, require valid collection references, reject oversized or malformed input, and emit deterministic Markdown without HTML rendering. Device-level theme and AI opt-in preferences are exported for portability but never imported. Prove JSON round-trip, invalid-input preservation, hostile literal content, and referential integrity.

## Task 2: Library service/message boundary

Files:

- Extend `src/messaging/protocol.ts`
- Extend `src/messaging/router.ts`
- Extend `src/entrypoints/background.ts`
- Extend `tests/messaging/router.test.ts`

Expose only explicit requests for highlight update/delete, collection create/rename/archive/delete, filtered search, settings get/theme update, backup export/import, and anchoring. Validate every request and response. Keep destructive deletion and bulk backup import behind explicit confirmation flags.

## Task 3: Accessible responsive library UI

Files:

- Replace `src/entrypoints/sidepanel/App.svelte`
- Add focused components under `src/entrypoints/sidepanel/components/` as useful
- Add `tests/ui/sidepanel.test.ts`

Build search and collection/tag filters, research cards, empty/loading/error states, an edit dialog for note/tags/collection, collection administration, source links and conservative re-anchoring feedback, a theme selector, JSON backup/restore, Markdown export, and local-only backup guidance. Render all source and user content as Svelte text, never `{@html}`.

## Task 4: Popup/theme consistency and verification

Files:

- Refine `src/entrypoints/popup/App.svelte`
- Extend UI and security tests

Share the theme token model with the popup, verify keyboard labels/focus/dialog behavior, hostile strings, narrow layout, contrast token values, and reduced-motion CSS. Run targeted red/green cycles followed by `pnpm check`, independent review, PR CI, and merge.
