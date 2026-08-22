# TraceMark V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a privacy-first Chrome and Firefox extension that deliberately captures exact web quotations with provenance, organizes and searches them locally, re-anchors them conservatively, exports/restores backups, and optionally uses local Ollama.

**Architecture:** WXT generates explicit MV3 Chrome and Firefox builds. A background-owned service layer validates typed messages and owns Dexie/IndexedDB; runtime-only scripts capture or anchor the active page after a user gesture; Svelte popup and side-panel clients use the same message API. Lightweight preferences use browser storage and optional Ollama access is permission-gated.

**Tech Stack:** WXT 0.21.4, TypeScript 5.9.3, Svelte 5.56.10, Dexie 4.4.5, Zod 4.4.3, Vitest 4.1.11, Testing Library, fake-indexeddb, Playwright 1.62.1, Selenium/WebDriver, pnpm 11.

**Spec:** `docs/superpowers/specs/2026-08-22-tracemark-v1-design.md`

## Global Constraints

- Chrome and Firefox release artifacts use Manifest V3 from one WXT source tree.
- Required permissions are limited to `activeTab`, `scripting`, `contextMenus`, `storage`, plus WXT's browser-specific side-panel permission; no persistent host permission is allowed.
- `http://127.0.0.1:11434/*` is optional and requested only after a user enables Ollama.
- Research data stays in IndexedDB; only lightweight preferences use browser storage.
- All webpage, import, AI, URL, and runtime-message input is untrusted and Zod-validated before privileged use.
- No account, telemetry, analytics, backend, paid provider, browser-history capture, or silent all-page content script is allowed.
- Generated WXT scaffolding and static configuration are verified by build/manifest tests; all behavioral production code follows red-green-refactor.

## File map

- `wxt.config.ts`: browser-aware manifest, permissions, command, and Firefox ID.
- `entrypoints/background.ts`: browser event wiring only.
- `entrypoints/capture.content.ts`: runtime-only page selection capture.
- `entrypoints/anchor.content.ts`: runtime-only conservative DOM anchoring.
- `entrypoints/popup/*`: quick-save UI.
- `entrypoints/sidepanel/*`: responsive research library UI.
- `src/domain/*`: records, normalization, URL safety, tags, search derivation, anchoring, import/export schemas.
- `src/storage/*`: Dexie database, migration, repository, and browser-storage preferences.
- `src/core/*`: highlight, collection, search, backup, and AI services.
- `src/messaging/*`: discriminated request/response schemas, client, router, and sender checks.
- `src/ui/*`: shared Svelte components, stores, theme, and design tokens.
- `tests/fixtures/site/*`: deterministic normal, repeated, changed, dynamic, and hostile pages.
- `tests/e2e/*`: packaged Chromium and Firefox flows plus manifest/package assertions.

---

### Task 1: Repository and cross-browser WXT shell

**Files:**

- Create: `package.json`, `pnpm-lock.yaml`, `wxt.config.ts`, `tsconfig.json`, `svelte.config.js`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`
- Create: `entrypoints/background.ts`, `entrypoints/popup/index.html`, `entrypoints/popup/main.ts`, `entrypoints/popup/App.svelte`, `entrypoints/sidepanel/index.html`, `entrypoints/sidepanel/main.ts`, `entrypoints/sidepanel/App.svelte`
- Create: `public/icon-{16,32,48,96,128}.png`
- Test: `tests/manifest.test.ts`

**Interfaces:**

- Produces scripts `dev`, `dev:firefox`, `build:chrome`, `build:firefox`, `zip:chrome`, `zip:firefox`, `test`, `typecheck`, `lint`, `format:check`, and `check`.
- Produces Chrome `.output/chrome-mv3/manifest.json` and Firefox `.output/firefox-mv3/manifest.json`.

- [ ] **Step 1: Add the generated WXT/Svelte shell and pinned dependencies**

Use WXT's Svelte TypeScript template as the baseline, set package version `0.1.0`, package manager `pnpm@11.19.0`, ESM mode, and the scripts named above. Set TypeScript to strict mode and make `check` run formatting, lint, typecheck, tests, both builds, and manifest assertions.

- [ ] **Step 2: Write the manifest contract test**

```ts
test.each(['chrome-mv3', 'firefox-mv3'])('%s has minimal permissions', (target) => {
  const manifest = readManifest(target);
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(
    expect.arrayContaining(['activeTab', 'scripting', 'contextMenus', 'storage']),
  );
  expect(manifest.host_permissions ?? []).toEqual([]);
  expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
});
```

- [ ] **Step 3: Run the test and verify the intended red state**

Run `pnpm vitest run tests/manifest.test.ts`. Expected: failure because browser manifests do not exist.

- [ ] **Step 4: Configure browser-aware MV3 manifests and build**

Set the name, description, icons, command `save-selection` with `Alt+Shift+S`, required permissions, optional Ollama host, `browser_specific_settings.gecko.id: tracemark@mateoosoriodelhonte.github.io`, and `strict_min_version: 109.0`. Use WXT's side-panel entrypoint mapping and never add static content-script matches.

- [ ] **Step 5: Verify both builds and contract tests**

Run `pnpm build:chrome && pnpm build:firefox && pnpm vitest run tests/manifest.test.ts`. Expected: two MV3 builds and passing manifest assertions.

- [ ] **Step 6: Commit**

Run `git add . && git commit -m "build: bootstrap WXT Svelte extension"`.

### Task 2: Domain schemas and safe normalization

**Files:**

- Create: `src/domain/constants.ts`, `src/domain/models.ts`, `src/domain/schemas.ts`, `src/domain/text.ts`, `src/domain/tags.ts`, `src/domain/urls.ts`, `src/domain/search-document.ts`
- Test: `tests/unit/text.test.ts`, `tests/unit/tags.test.ts`, `tests/unit/urls.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/search-document.test.ts`

**Interfaces:**

- Produces `normalizeWhitespace(value: string): string`, `normalizeTags(values: readonly string[]): string[]`, `safeSourceUrl(value: string): string | undefined`, `buildSearchDocument(highlight, collectionName): { searchText: string; searchTokens: string[] }`.
- Produces strict `HighlightSchema`, `CollectionSchema`, `SettingsSchema`, `CaptureResultSchema`, and versioned export/import schemas.

- [ ] **Step 1: Write failing normalization and hostile-input tests**

```ts
expect(normalizeTags([' RAG ', 'rag', '<img onerror=1>', ''])).toEqual(['rag', '<img onerror=1>']);
expect(safeSourceUrl('javascript:alert(1)')).toBeUndefined();
expect(safeSourceUrl('https://user:pass@example.com/a#secret')).toBe('https://example.com/a');
expect(() => HighlightSchema.parse({ quote: '<script>x</script>' })).toThrow();
```

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/unit`. Expected: module-resolution failures for the new domain modules.

- [ ] **Step 3: Implement strict models, bounds, tags, URLs, and derived search fields**

Use UUID and ISO timestamp refinements, quote/title/note/context length bounds, maximum 20 tags of 40 characters, explicit schema version literals, own-property objects, and HTTP(S)-only URL normalization. Preserve hostile strings as text; validation must not silently HTML-sanitize or rewrite quotations.

- [ ] **Step 4: Verify green and type safety**

Run `pnpm vitest run tests/unit && pnpm typecheck`. Expected: all domain tests pass with no TypeScript errors.

- [ ] **Step 5: Commit**

Run `git add src/domain tests/unit && git commit -m "feat: define safe research data model"`.

### Task 3: IndexedDB repository, migrations, collections, and search

**Files:**

- Create: `src/storage/database.ts`, `src/storage/migrations.ts`, `src/storage/repository.ts`, `src/storage/preferences.ts`
- Create: `src/core/highlights.ts`, `src/core/collections.ts`, `src/core/search.ts`
- Test: `tests/storage/migrations.test.ts`, `tests/storage/repository.test.ts`, `tests/core/collections.test.ts`, `tests/core/search.test.ts`

**Interfaces:**

- Produces `TraceMarkDatabase`, `ResearchRepository`, `HighlightService`, `CollectionService`, `SearchService`, and `PreferencesStore`.
- `ResearchRepository.transaction()` makes highlight/collection imports and delete-to-Inbox operations atomic.

- [ ] **Step 1: Write a failing legacy migration test with real fake IndexedDB**

```ts
const legacy = await createLegacyDatabase([
  { id: 'old-1', text: ' Exact quote ', sourceUrl: 'https://example.com/a' },
]);
const current = await openCurrentDatabase(legacy.name);
expect(await current.highlights.get('old-1')).toMatchObject({
  quote: ' Exact quote ',
  schemaVersion: 1,
  tags: [],
  note: '',
});
```

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/storage/migrations.test.ts`. Expected: failure because database versions and upgrade functions do not exist.

- [ ] **Step 3: Implement Dexie versions 1 and 2 without destructive recovery**

Version 2 stores `highlights: '&id, collectionId, hostname, createdAt, updatedAt, *tags, *searchTokens'`, `collections: '&id, &normalizedName, status, createdAt'`, and `aiResults: '&id, kind, createdAt, *sourceHighlightIds'`. Upgrade legacy rows in one transaction and throw a typed `MigrationError` without deleting the database on invalid records.

- [ ] **Step 4: Write failing collection and search behavior tests**

Cover idempotent Inbox creation, case-insensitive names, archive/filter, confirmed delete moving highlights to Inbox, tag filters, phrase/token search, collection rename reindexing, and recent ordering.

- [ ] **Step 5: Implement repository and services minimally**

Use injected clock/UUID functions for deterministic tests. Keep collection deletion and rename reindexing transactional. Return immutable domain records from services.

- [ ] **Step 6: Verify green**

Run `pnpm vitest run tests/storage tests/core && pnpm typecheck`. Expected: migration, repository, collection, and search tests pass.

- [ ] **Step 7: Commit**

Run `git add src/storage src/core tests/storage tests/core && git commit -m "feat: add versioned local research storage"`.

### Task 4: Typed messaging and deliberate selection capture

**Files:**

- Create: `src/messaging/protocol.ts`, `src/messaging/router.ts`, `src/messaging/client.ts`, `src/core/capture.ts`, `src/domain/capture-selection.ts`
- Modify: `entrypoints/background.ts`
- Create: `entrypoints/capture.content.ts`
- Test: `tests/messaging/router.test.ts`, `tests/core/capture.test.ts`, `tests/integration/capture-flow.test.ts`

**Interfaces:**

- Produces `RequestSchema`, `ResponseSchema`, `createMessageRouter(services)`, `sendRequest(request)`, and `CaptureService.captureTab(tabId, frameId?)`.
- Capture result is `{ quote, prefix, suffix, heading?, context?, title, url, canonicalUrl? }` or a typed unsupported/no-selection error.

- [ ] **Step 1: Write failing protocol and spoof tests**

```ts
await expect(router({ type: 'deleteEverything' }, internalSender)).resolves.toMatchObject({
  ok: false,
  code: 'INVALID_MESSAGE',
});
await expect(router(validCreateRequest, { id: 'other-extension' })).resolves.toMatchObject({
  ok: false,
  code: 'UNTRUSTED_SENDER',
});
```

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/messaging/router.test.ts`. Expected: protocol/router modules are missing.

- [ ] **Step 3: Implement the discriminated protocol and authorization boundary**

Create explicit request variants for highlight CRUD, collections, search, import/export, preferences, capture, anchor, and AI. Parse all requests from unknown, check `sender.id === browser.runtime.id`, never accept arbitrary method names, and return serializable typed errors.

- [ ] **Step 4: Write failing capture tests**

Cover an exact multiline selection, prefix/suffix bounds, nearest heading/context, hostile title text, same-document canonical URL, empty selection, selection in a child frame, and unsupported browser pages.

- [ ] **Step 5: Implement runtime-only capture and browser event wiring**

Use WXT `registration: 'runtime'` and `browser.scripting.executeScript({ target: { tabId, frameIds }, files: ['content-scripts/capture.js'] })`. Register a selection-only context-menu item and command. Both quick-save to Inbox through `HighlightService`; popup capture returns a draft.

- [ ] **Step 6: Verify integration green**

Run `pnpm vitest run tests/messaging tests/core/capture.test.ts tests/integration/capture-flow.test.ts && pnpm typecheck`. Expected: validated context-menu/command/popup flows pass.

- [ ] **Step 7: Commit**

Run `git add entrypoints src/messaging src/core src/domain tests && git commit -m "feat: capture selected text with provenance"`.

### Task 5: Conservative TextQuote anchoring

**Files:**

- Create: `src/domain/anchor.ts`, `src/domain/text-nodes.ts`, `entrypoints/anchor.content.ts`
- Modify: `src/core/capture.ts`, `src/messaging/protocol.ts`, `src/messaging/router.ts`
- Test: `tests/unit/anchor.test.ts`, `tests/integration/anchor-flow.test.ts`
- Create: `tests/fixtures/site/article.html`, `tests/fixtures/site/repeated.html`, `tests/fixtures/site/changed.html`, `tests/fixtures/site/dynamic.html`, `tests/fixtures/site/hostile.html`

**Interfaces:**

- Produces `findAnchor(text, selector): { status: 'found'; start: number; end: number } | { status: 'ambiguous' | 'not-found' }`.
- Runtime result is `{ status: 'marked'; count: 1 } | { status: 'ambiguous' | 'not-found' | 'unsupported' }`.

- [ ] **Step 1: Write failing exact/ambiguous/changed-source tests**

```ts
expect(
  findAnchor('before exact quote after', {
    exact: 'exact quote',
    prefix: 'before ',
    suffix: ' after',
  }),
).toMatchObject({ status: 'found' });
expect(
  findAnchor('x repeat y x repeat y', { exact: 'repeat', prefix: 'x ', suffix: ' y' }),
).toEqual({ status: 'ambiguous' });
expect(findAnchor('the page changed', selector)).toEqual({ status: 'not-found' });
```

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/unit/anchor.test.ts`. Expected: anchor module is missing.

- [ ] **Step 3: Implement conservative pure matching and DOM marking**

Map visible text nodes to a normalized text stream, score exact candidates by prefix/suffix agreement, require a unique winner and score margin, split text nodes with Range APIs, and create `<mark>` nodes via `textContent`. Never use CSS selectors as the sole anchor or use `innerHTML`.

- [ ] **Step 4: Verify fixture-backed integration**

Run `pnpm vitest run tests/unit/anchor.test.ts tests/integration/anchor-flow.test.ts`. Expected: normal succeeds; repeated and changed pages refuse; hostile text is rendered literally.

- [ ] **Step 5: Commit**

Run `git add entrypoints/anchor.content.ts src tests && git commit -m "feat: re-anchor saved quotations safely"`.

### Task 6: Markdown/JSON backup and validated restore

**Files:**

- Create: `src/core/export.ts`, `src/core/import.ts`, `src/domain/backup.ts`, `src/ui/download.ts`
- Modify: `src/messaging/protocol.ts`, `src/messaging/router.ts`
- Test: `tests/core/export.test.ts`, `tests/core/import.test.ts`, `tests/security/import-security.test.ts`

**Interfaces:**

- Produces `exportMarkdown(snapshot): string`, `exportJson(snapshot): string`, and `importJson(input, repository): Promise<ImportReport>`.
- `ImportReport` contains created, updated, skippedDuplicate, and rejected counts plus record-scoped reasons.

- [ ] **Step 1: Write failing readable Markdown and round-trip JSON tests**

Assert escaped Markdown, safe links, verbatim block quotes, separated “My note”, stable versioned JSON, semantic duplicate skipping, and transaction rollback.

- [ ] **Step 2: Write failing malicious import tests**

Reject malformed JSON, unknown versions, `__proto__`, JavaScript URLs, invalid timestamps, oversized records/files, dangling collection IDs, and duplicate IDs with conflicting source identity.

- [ ] **Step 3: Verify red**

Run `pnpm vitest run tests/core/export.test.ts tests/core/import.test.ts tests/security/import-security.test.ts`. Expected: export/import modules are missing.

- [ ] **Step 4: Implement deterministic export and strict transactional import**

Parse input as unknown with strict schemas and explicit byte/record limits. Map missing imported collections to Inbox, regenerate colliding IDs where allowed, and return a complete report. Use a Blob/object URL download initiated by a UI click.

- [ ] **Step 5: Verify green**

Run `pnpm vitest run tests/core/export.test.ts tests/core/import.test.ts tests/security/import-security.test.ts`. Expected: all backup and security cases pass.

- [ ] **Step 6: Commit**

Run `git add src tests && git commit -m "feat: add private research backups"`.

### Task 7: Svelte popup and research library

**Files:**

- Create: `src/ui/theme.css`, `src/ui/global.css`, `src/ui/stores.ts`, `src/ui/components/*.svelte`
- Modify: `entrypoints/popup/App.svelte`, `entrypoints/sidepanel/App.svelte`
- Test: `tests/ui/popup.test.ts`, `tests/ui/library.test.ts`, `tests/ui/accessibility.test.ts`, `tests/security/rendering.test.ts`

**Interfaces:**

- Popup uses `capture.current`, `collections.list`, and `highlights.create` messages.
- Library uses search/filter/edit/archive/delete/import/export/theme messages and renders only text-bound content.

- [ ] **Step 1: Write failing popup keyboard-flow and hostile-rendering tests**

Use Testing Library to assert labelled fields, visible focus, Enter/button save, disabled empty selection, recent-save fallback, literal `<img onerror>` rendering, and live success/error status.

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/ui/popup.test.ts tests/security/rendering.test.ts`. Expected: product components and accessible controls are absent.

- [ ] **Step 3: Implement the focused popup**

Build selection preview, collection combobox, tag input, save status, recent items, “Show saved highlights”, and “Open library”. Keep it keyboard-complete at 360px width.

- [ ] **Step 4: Write failing library behavior tests**

Cover recent ordering, local search, collection/tag filters, active/archive views, note/tag edits, confirm-delete-to-Inbox, source link, anchor status, Markdown/JSON download, import report, backup notice, theme persistence, dialogs, focus return, and narrow layout.

- [ ] **Step 5: Implement responsive side-panel/library and design tokens**

Use semantic landmarks, native controls where practical, accessible dialogs, CSS custom properties, AA colors, system/light/dark themes, reduced motion, warm paper/ink styling, and restrained teal provenance accents.

- [ ] **Step 6: Verify UI and accessibility green**

Run `pnpm vitest run tests/ui tests/security/rendering.test.ts && pnpm typecheck`. Expected: UI flows pass with no accessibility test violations.

- [ ] **Step 7: Commit**

Run `git add entrypoints src/ui tests/ui tests/security && git commit -m "feat: build the TraceMark research interface"`.

### Task 8: Optional Ollama provider

**Files:**

- Create: `src/ai/provider.ts`, `src/ai/no-ai.ts`, `src/ai/ollama.ts`, `src/ai/schemas.ts`
- Modify: `src/messaging/protocol.ts`, `src/messaging/router.ts`, `entrypoints/sidepanel/App.svelte`
- Test: `tests/ai/no-ai.test.ts`, `tests/ai/ollama.test.ts`, `tests/integration/ai-disabled.test.ts`

**Interfaces:**

- Produces `AIProvider` with `summarize`, `explain`, `suggestTags`, and `collectionOverview`.
- Produces `NoAIProvider` and `OllamaProvider({ fetch, model, timeoutMs })`.

- [ ] **Step 1: Write failing disabled-state, permission, timeout, and validation tests**

Assert no network call under provider `none`; no Ollama fetch before permission; only selected quotation/note inputs; loopback-only endpoint; abort on timeout; rejected malformed tag JSON; harmless unavailable-model error.

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/ai tests/integration/ai-disabled.test.ts`. Expected: AI provider modules are missing.

- [ ] **Step 3: Implement provider boundary and explicit permission flow**

Request `http://127.0.0.1:11434/*` only in the settings button click. Post bounded prompts to `/api/generate`, set `stream: false`, validate every response, and persist AI results separately without modifying source quotations.

- [ ] **Step 4: Verify green**

Run `pnpm vitest run tests/ai tests/integration/ai-disabled.test.ts`. Expected: no-AI behavior, explicit opt-in, and safe failures pass.

- [ ] **Step 5: Commit**

Run `git add src/ai src/messaging entrypoints/sidepanel tests && git commit -m "feat: add opt-in local Ollama assistance"`.

### Task 9: Packaged browser flows, CI, documentation, and store assets

**Files:**

- Create: `tests/e2e/chromium.spec.ts`, `tests/e2e/firefox.ts`, `tests/e2e/manifest-packages.test.ts`, `tests/e2e/server.ts`, `playwright.config.ts`
- Create: `.github/workflows/ci.yml`, `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`
- Create: `README.md`, `PRIVACY.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE`, `docs/ARCHITECTURE.md`, `docs/PERMISSIONS.md`, `docs/TESTING.md`, `docs/STORE_SUBMISSION.md`, `docs/store/*`
- Create: `scripts/capture-screenshots.ts`, `docs/images/*`

**Interfaces:**

- Produces zipped `.output/tracemark-1.0.0-chrome.zip` and `.output/tracemark-1.0.0-firefox.zip` after version promotion.
- CI job status is the release gate.

- [ ] **Step 1: Write failing package and critical-flow tests**

The Chromium test opens the normal fixture, selects text, saves through the extension, opens the side panel, finds the quotation, edits note/tags, anchors it, exports Markdown and JSON, clears/restores through import, and confirms hostile fixture text stays inert. Firefox automation repeats capture, library lookup, edit, anchor refusal on repeated/changed fixtures, and export where WebDriver exposes the extension surface.

- [ ] **Step 2: Verify red**

Run `pnpm vitest run tests/e2e/manifest-packages.test.ts && pnpm e2e:chromium`. Expected: missing release packages or incomplete product flow.

- [ ] **Step 3: Complete browser packaging, fixture server, and CI**

Use deterministic localhost fixtures, install packaged builds, assert exact generated manifest differences, run `web-ext lint` for Firefox, and upload both build archives as CI artifacts. Split fast checks and browser jobs while keeping the workflow dependency-frozen.

- [ ] **Step 4: Write accurate project, privacy, permission, security, testing, and store documentation**

Document actual commands, browser-specific limitations, manual Chrome/Firefox installation, all requested/optional permissions, local data and backup risk, Ollama behavior, architecture/trust boundaries, vulnerability reporting, store form answers, and remaining paid/manual publication steps. Generate screenshots only from fixtures and demo seed data.

- [ ] **Step 5: Run the full pre-release verification**

Run `pnpm check`, `pnpm e2e:chromium`, `pnpm e2e:firefox`, `pnpm package:validate`, `git grep -nE '(gho_|github_pat_|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH) PRIVATE KEY)' -- . ':!pnpm-lock.yaml'`, and inspect both manifests/ZIP contents. Expected: green checks, no secret matches, and only documented browser limitations.

- [ ] **Step 6: Promote version and verify again**

Set package/manifest version to `1.0.0`, rebuild both packages, rerun the full gate, and update documentation with exact evidence and screenshots.

- [ ] **Step 7: Commit**

Run `git add . && git commit -m "release: prepare TraceMark v1.0.0"`.

### Task 10: GitHub integration and release

**Files:**

- Modify only files required by review or CI findings.

**Interfaces:**

- Produces green PRs merged to `main`, tag `v1.0.0`, GitHub Release notes, and two unsigned store-ready archives.

- [ ] **Step 1: Push each scoped branch and open its linked PR**

Use `gh pr create` with acceptance evidence, issue closing references, permission/privacy impact, Chrome/Firefox status, and screenshots only when UI changes. Wait for CI and fix failures through a failing regression test.

- [ ] **Step 2: Merge only reviewed green PRs**

Use squash or merge commits consistently; never bypass required checks. Update subsequent branches from `main` before opening the next PR.

- [ ] **Step 3: Perform four-perspective final review**

Audit as a browser-extension security reviewer, Firefox user, Chrome user, and hiring manager. Turn every reasonable finding into a test-backed fix and rerun the full release gate.

- [ ] **Step 4: Tag and publish the GitHub release**

Create signed/annotated tag `v1.0.0` at verified `main`, publish release notes, and attach Chrome and Firefox archives plus checksums. Do not submit to either browser store.

- [ ] **Step 5: Record final evidence**

Capture GitHub URL, release URL, main SHA, CI URL/status, test counts, manifest permissions, package checksums, actual browser evidence, store readiness, and only genuinely manual remaining actions.
