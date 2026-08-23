# Explicit Opt-In Ollama Assistance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-gated local Ollama assistance that sends only explicitly selected saved
research while preserving TraceMark's zero-network private default.

**Architecture:** The side panel owns the user-gesture permission request, a background
`AIAssistanceService` enforces settings/permission/selection gates, and injected `AIProvider`
implementations isolate no-AI and loopback Ollama behavior. Strict Zod schemas validate messages,
Ollama envelopes, task output, and persisted results.

**Tech Stack:** TypeScript 5.9, Svelte 5, WXT WebExtensions, Dexie 4, Zod 4 jitless mode, Vitest,
Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-22-ollama-assistance-design.md`

## Global Constraints

- `provider: "none"` remains the default and performs zero fetches.
- The only network origin is `http://127.0.0.1:11434/*`; the only endpoint is
  `http://127.0.0.1:11434/api/chat`.
- Permission is requested directly from the **Enable local AI** click handler and rechecked before
  every run.
- Each run contains 1–20 unique IDs and loads only those saved highlights.
- Research text and AI output are untrusted data; no `innerHTML` or `{@html}`.
- AI never modifies saved quotations or automatically applies suggested tags.
- No model start, download, discovery, cloud API, authentication, telemetry, or analytics.
- Every production behavior begins with a failing focused test.
- Both Chrome MV3 and Firefox MV3 builds must pass the full `pnpm check` gate.

---

### Task 1: Provider boundary and Ollama validation

**Files:**

- Create: `src/core/ai-provider.ts`
- Create: `src/core/ollama-provider.ts`
- Create: `tests/core/ai-provider.test.ts`
- Modify: `src/domain/schemas.ts`
- Modify: `src/domain/models.ts`

**Interfaces:**

- Produces: `ResearchItem`, `ResearchInput`, `TextAssistance`, `TagAssistance`, `AIProvider`,
  `AIProviderError`, `NoAIProvider`, and `OllamaProvider`.
- `OllamaProvider` constructor accepts `{ fetch, timeoutMs, setTimer, clearTimer }` so timeout and
  I/O behavior are deterministic in tests.
- Provider methods are `summarize`, `explain`, `suggestTags`, and `overview`.

- [ ] **Step 1: Write failing provider-boundary tests**

  Add tests proving `NoAIProvider` rejects all four methods with `AI_DISABLED`; `OllamaProvider`
  posts to the exact endpoint with `credentials: "omit"`, `cache: "no-store"`,
  `redirect: "error"`, `stream: false`, the selected research projection, and task-specific JSON
  Schema. Assert unrelated text does not appear in the request.

  ```ts
  const provider = new OllamaProvider({ fetch: fetchMock, timeoutMs: 30_000 });
  await provider.summarize({ items: [selectedItem] }, 'llama3.2');
  expect(fetchMock).toHaveBeenCalledWith(
    'http://127.0.0.1:11434/api/chat',
    expect.objectContaining({ method: 'POST', credentials: 'omit', redirect: 'error' }),
  );
  expect(JSON.stringify(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string))).not.toContain(
    'unrelated research',
  );
  ```

- [ ] **Step 2: Run the focused test and verify RED**

  Run: `pnpm exec vitest run tests/core/ai-provider.test.ts`

  Expected: FAIL because the provider modules and contracts do not exist.

- [ ] **Step 3: Implement the minimal provider boundary**

  Define the reduced research types and four-method interface. Implement `NoAIProvider` without a
  fetch dependency. Implement one private `OllamaProvider.generate()` path used by the four public
  methods. Serialize research as JSON beneath a system instruction that declares it untrusted quoted
  material.

- [ ] **Step 4: Add failing provider error/validation cases**

  Cover abort timeout, rejected fetch, HTTP 404 missing model, other non-2xx responses, oversized
  body, malformed outer JSON, absent assistant content, malformed content JSON, extra content fields,
  blank text, duplicate/invalid tags, and a hostile HTML string that remains ordinary text.

- [ ] **Step 5: Implement strict parsing and safe error mapping**

  Cap response text at 1 MiB, parse the outer envelope, parse `message.content`, validate strict
  task-specific schemas, normalize tags with existing domain utilities, and map failures to
  `AI_TIMEOUT`, `AI_UNAVAILABLE`, `AI_MODEL_UNAVAILABLE`, or `AI_INVALID_OUTPUT` without returning
  raw bodies.

- [ ] **Step 6: Run the provider suite and verify GREEN**

  Run: `pnpm exec vitest run tests/core/ai-provider.test.ts`

  Expected: all provider tests pass with no unexpected console output.

### Task 2: Assistance service and persisted results

**Files:**

- Create: `src/core/ai-assistance.ts`
- Create: `tests/core/ai-assistance.test.ts`
- Modify: `src/domain/models.ts`
- Modify: `src/domain/schemas.ts`
- Modify: `src/storage/repository.ts`

**Interfaces:**

- Consumes: `AIProvider`, `PreferencesStore.get()`, `ResearchRepository.getHighlight()`, and an
  injected permission checker.
- Produces: `AIAssistanceService.run(kind, sourceHighlightIds): Promise<AIResult>` and
  `AIAssistanceError`.
- Produces repository methods `putAIResult(input)` and `listAIResults()` for validated local storage.

- [ ] **Step 1: Write failing privacy-gate tests**

  Test that default settings reject with `AI_DISABLED`, missing permission rejects with
  `AI_PERMISSION_REQUIRED`, and neither path calls any provider method. Seed one selected and one
  unrelated highlight and assert only the selected reduced fields reach the provider.

- [ ] **Step 2: Run the assistance test and verify RED**

  Run: `pnpm exec vitest run tests/core/ai-assistance.test.ts`

  Expected: FAIL because `AIAssistanceService` does not exist.

- [ ] **Step 3: Implement settings, permission, and selected-ID gates**

  Require `provider === "ollama"`, then `permissions.contains()` for the exact origin. Require 1–20
  unique IDs, resolve each ID individually in input order, and construct only `{ id, quote, title,
url, tags, note }` objects. Missing records throw `NOT_FOUND` before provider invocation.

- [ ] **Step 4: Write failing persistence and task-dispatch tests**

  Cover all four task kinds. Assert text output and structured suggested tags are stored with a new
  UUID, exact source IDs, `provider: "ollama"`, and injected timestamp. Assert provider errors produce
  no IndexedDB write.

- [ ] **Step 5: Extend the strict AI result schema and persist valid results**

  Add optional `suggestedTags` to `AIResult` and `AIResultSchema`. Add repository validation methods.
  Dispatch the requested task, build the result, parse with `AIResultSchema`, and persist only after
  successful provider validation.

- [ ] **Step 6: Run assistance, repository, and backup suites GREEN**

  Run:
  `pnpm exec vitest run tests/core/ai-assistance.test.ts tests/storage/repository.test.ts tests/core/backups.test.ts`

  Expected: all tests pass and JSON backup round trips the extended result schema.

### Task 3: Strict messaging, settings mutation, and background wiring

**Files:**

- Modify: `src/messaging/protocol.ts`
- Modify: `src/messaging/router.ts`
- Modify: `src/entrypoints/background.ts`
- Modify: `tests/messaging/router.test.ts`
- Modify: `tests/manifest.test.ts`

**Interfaces:**

- Consumes: `AIAssistanceService.run()` and `PreferencesStore.get/set()`.
- Produces strict `settings.ai.set` and `ai.run` requests and typed safe error responses.
- Background injects `browser.permissions.contains` and the platform `fetch` into the AI subsystem.

- [ ] **Step 1: Write failing protocol/router tests**

  Assert valid settings/run requests dispatch correctly. Reject empty, duplicate, more than 20, or
  malformed IDs; blank/hostile model names; extra properties; and untrusted senders. Assert each
  `AIAssistanceError` maps to the corresponding response code.

- [ ] **Step 2: Run the router suite and verify RED**

  Run: `pnpm exec vitest run tests/messaging/router.test.ts`

  Expected: FAIL with `INVALID_MESSAGE` for the new currently unknown operations.

- [ ] **Step 3: Add schemas and route handlers**

  Add an exported model-name schema, unique ID-array validation, `AIResultSchema` response support,
  settings mutation that preserves theme, AI run dispatch, and explicit safe error mapping.

- [ ] **Step 4: Wire background dependencies without eager network I/O**

  Instantiate `NoAIProvider`, `OllamaProvider`, and `AIAssistanceService`. Provider construction must
  only capture dependencies; it must not fetch. Permission checks use:

  ```ts
  browser.permissions.contains({ origins: ['http://127.0.0.1:11434/*'] });
  ```

- [ ] **Step 5: Strengthen manifest assertions and run integration tests GREEN**

  Assert the Ollama origin appears only in `optional_host_permissions`, never in persistent host
  permissions, and no cloud/localhost/IPv6 alternatives appear.

  Run: `pnpm exec vitest run tests/messaging/router.test.ts tests/manifest.test.ts`

  Expected: all tests pass after both target manifests are built.

### Task 4: Side-panel consent, explicit selection, and safe results

**Files:**

- Modify: `src/entrypoints/sidepanel/App.svelte`
- Modify: `tests/ui/sidepanel.test.ts`
- Modify: `tests/visual/sidepanel-preview.ts`

**Interfaces:**

- Consumes: strict settings and AI requests from Task 3.
- New component props inject `requestOllamaPermission` and `removeOllamaPermission`; defaults call
  `browser.permissions.request/remove` with the exact optional origin.
- Produces no direct fetch path; generated content remains Svelte text interpolation.

- [ ] **Step 1: Write failing consent and denial component tests**

  Assert no permission call occurs on mount. Clicking **Enable local AI** calls the injected request
  once with the exact origin. Denial leaves settings untouched and shows a useful message. Grant sends
  `settings.ai.set` but no `ai.run` request.

- [ ] **Step 2: Run the side-panel suite and verify RED**

  Run: `pnpm exec vitest run tests/ui/sidepanel.test.ts`

  Expected: FAIL because the Local AI controls are absent.

- [ ] **Step 3: Implement consent and model controls**

  Add the disabled explanation, model input, enable action, enabled state, and disable action. Persist
  `provider: "none"` before attempting permission removal. Keep the research library usable on every
  permission error.

- [ ] **Step 4: Write failing explicit-selection and output tests**

  Check two cards, invoke one task, and assert exactly those IDs are sent. Assert actions are disabled
  with zero selection, result reload clears selection, and hostile `<img onerror>` output renders as
  text without creating an image element.

- [ ] **Step 5: Implement checkboxes, actions, and plain-text result display**

  Add labeled card checkboxes, selected-count status, four task buttons, loading/error states, result
  text, and suggested-tag chips. Clear selections at the start of every successful research reload.

- [ ] **Step 6: Update deterministic visual data and run UI tests GREEN**

  Extend the preview request switch for new messages and add a deterministic generated result. Run:
  `pnpm exec vitest run tests/ui/sidepanel.test.ts tests/ui/popup.test.ts`.

  Expected: all UI tests pass, including existing dialog/focus/backup behavior.

### Task 5: Issue-level verification and review

**Files:**

- Modify: `docs/superpowers/plans/2026-08-22-ollama-assistance.md` only to mark completed steps if
  useful during execution.

**Interfaces:**

- Consumes all tasks above.
- Produces a reviewed Issue #5 branch ready for PR and CI.

- [ ] **Step 1: Run focused privacy scans**

  Run:

  ```sh
  rg -n "fetch\(|permissions\.request|127\.0\.0\.1|localhost|ollama\.com|{@html}|innerHTML" src tests wxt.config.ts
  git diff --check
  ```

  Verify fetch exists only in the Ollama provider path, permission request exists only in the direct
  UI action, and no cloud endpoint or dynamic HTML rendering was introduced.

- [ ] **Step 2: Run the full fresh verification gate**

  Run: `pnpm check`

  Expected: Prettier, ESLint, Svelte diagnostics, Chrome build, Firefox build, all tests, and Firefox
  lint complete with zero errors. The known compiler-generated Svelte static `innerHTML` warning may
  remain documented.

- [ ] **Step 3: Request independent review and address findings test-first**

  Reviewer scope: permission gesture validity, no-default-network invariant, exact selected-record
  projection, provider output parsing, prompt injection, timeout cleanup, storage integrity, UI
  accessibility, and test quality. Any behavior fix begins with a reproducing failing test.

- [ ] **Step 4: Re-run the full gate after the final change**

  Run: `pnpm check`

  Expected: the final branch state passes, not a pre-review state.

- [ ] **Step 5: Commit, push, open PR, wait for CI, and merge**

  Use one cohesive implementation commit after the already committed design. The PR body closes #5,
  states the privacy invariants, lists exact verification evidence, and acknowledges the existing
  generated-Svelte Firefox lint warning. Merge only after the GitHub verification check passes.
