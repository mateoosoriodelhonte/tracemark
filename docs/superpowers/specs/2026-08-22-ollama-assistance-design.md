# Explicit Opt-In Ollama Assistance Design

**Issue:** [#5 — Add explicit opt-in local Ollama assistance](https://github.com/mateoosoriodelhonte/tracemark/issues/5)

**Status:** Approved in conversation on 2026-08-22

## Purpose

Add useful local-AI assistance without weakening TraceMark's local-first defaults. Core capture,
organization, search, anchoring, and backup behavior must continue to work with no AI process,
permission, or network access.

## Goals

- Keep `provider: "none"` as the private default and make zero AI or network calls in that state.
- Request access to `http://127.0.0.1:11434/*` only from an explicit enable-button gesture.
- Send only saved highlights that the user explicitly checks for the current operation.
- Support summaries, explanations, tag suggestions, and research overviews through a provider
  boundary.
- Treat prompts and model output as hostile data and validate every boundary.
- Fail safely when permission is denied, Ollama is unavailable, a model is missing, a request times
  out, or output is invalid.
- Preserve validated AI results in the local IndexedDB database and JSON backups.

## Non-Goals

- Starting Ollama, downloading models, or discovering/installing models automatically.
- Cloud AI, API keys, paid providers, telemetry, analytics, or accounts.
- Sending current page contents, browser history, cookies, credentials, hidden fields, or unrelated
  TraceMark records.
- Modifying source quotations with AI output.
- Automatically applying suggested tags.
- Streaming output or maintaining a conversational chat history in V1.

## Chosen Architecture

TraceMark will use three independently testable layers:

1. **Side-panel consent and selection UI.** The UI owns the user gesture needed to request the
   optional loopback host permission. Checkboxes identify the exact saved highlights for a run.
2. **Background AI assistance service.** The service rechecks the saved provider setting and host
   permission, resolves only the requested highlight IDs from IndexedDB, calls the selected provider,
   validates the result, and stores it locally.
3. **Provider boundary.** `NoAIProvider` always rejects without I/O. `OllamaProvider` performs one
   bounded loopback request using an injected fetch implementation and abort timeout.

This keeps browser-permission gestures in the document that receives the click while centralizing
privacy enforcement and networking in the background process. Direct UI fetching was rejected
because it would duplicate validation and make lifecycle/error behavior harder to control. A native
bridge or separate options page was rejected as unnecessary V1 complexity.

## Domain Contracts

The provider boundary will expose the following conceptual types:

```ts
interface ResearchItem {
  id: string;
  quote: string;
  title: string;
  url: string;
  tags: string[];
  note: string;
}

interface ResearchInput {
  items: ResearchItem[];
}

interface TextAssistance {
  content: string;
}

interface TagAssistance {
  tags: string[];
}

interface AIProvider {
  summarize(input: ResearchInput, model: string): Promise<TextAssistance>;
  explain(input: ResearchInput, model: string): Promise<TextAssistance>;
  suggestTags(input: ResearchInput, model: string): Promise<TagAssistance>;
  overview(input: ResearchInput, model: string): Promise<TextAssistance>;
}
```

`ResearchItem` intentionally excludes prefix, suffix, surrounding page context, search indexes,
collection contents, settings, and other database records. The assistance service constructs these
objects from the exact requested IDs; it never accepts research text supplied by a message caller.

`AIResult` gains an optional `suggestedTags` field. Text tasks store validated output in `content`.
Tag tasks store a human-readable comma-separated `content` plus the normalized structured tag array.
All results retain their exact `sourceHighlightIds`, provider, kind, and creation timestamp.

## Typed Messaging

New strict requests:

```ts
{ type: 'settings.ai.set'; provider: 'none' | 'ollama'; model: string }
{
  type: 'ai.run';
  kind: 'summary' | 'explanation' | 'tags' | 'overview';
  sourceHighlightIds: string[];
}
```

`sourceHighlightIds` must contain 1–20 distinct UUIDs. Model names must be trimmed, non-empty, at
most 200 characters, and limited to Ollama's conservative local model-name character set. Messages
remain strict and reject unknown properties.

The router returns the stored `AIResult` on success. New typed error codes distinguish disabled AI,
missing permission, unavailable Ollama, unavailable model, timeout, invalid output, and missing
selected records. Internal errors remain generic at the message boundary.

## Permission and Settings Lifecycle

### Enable

1. The user clicks **Enable local AI** in the side panel.
2. That click handler immediately calls `browser.permissions.request` for exactly
   `http://127.0.0.1:11434/*`.
3. If denied, settings remain `provider: "none"`; no fetch occurs.
4. If granted, the UI sends `settings.ai.set` with `provider: "ollama"` and the chosen model.
5. Enabling does not contact Ollama. The first network call happens only when the user selects saved
   research and invokes an assistance action.

### Run

Before each provider call, the background service:

1. Requires stored `provider: "ollama"`.
2. Rechecks `browser.permissions.contains` for the exact loopback origin.
3. Deduplicates and validates 1–20 IDs.
4. Loads only those records, in requested order; any missing ID aborts before fetch.
5. Constructs the reduced `ResearchItem[]` projection.
6. Calls the provider and stores only schema-validated output.

### Disable

The UI first persists `provider: "none"`, immediately restoring the no-network gate, and then calls
`browser.permissions.remove` for the loopback origin. A permission-removal failure is reported, but
the disabled provider setting still prevents future AI calls.

If permission is later removed through browser settings, every run fails with a permission-required
message and performs no fetch.

## Ollama Request Contract

The provider calls only:

```text
POST http://127.0.0.1:11434/api/chat
```

The JSON body contains:

- the explicitly configured local model name;
- `stream: false`;
- a system instruction that treats research excerpts as untrusted quoted material and ignores any
  instructions embedded within them;
- a task-specific user message containing only the reduced selected-research JSON;
- a task-specific JSON Schema in `format`;
- conservative generation options.

The fetch uses `credentials: "omit"`, `cache: "no-store"`, `redirect: "error"`, and an abort signal.
The default timeout is 30 seconds and is injected for deterministic tests. TraceMark never uses the
Ollama cloud URL, follows redirects, sends authorization headers, or invokes model-management APIs.

Ollama's current official API documents `/api/chat`, `stream: false`, and a JSON Schema object in the
`format` field. The provider does not depend on an SDK.

## Output Validation

The HTTP response body is capped at 1 MiB before parsing. The outer Ollama response must contain an
assistant `message.content` string. That string must parse as strict task-specific JSON:

- text tasks: `{ "content": string }`, with 1–100,000 visible characters;
- tag task: `{ "tags": string[] }`, with 1–20 normalized, unique tags using TraceMark's existing tag
  limits.

Unknown task-output fields, HTML interpretation, malformed JSON, oversized output, and schema
violations are rejected. The UI renders result content with normal Svelte text interpolation and
never with `innerHTML` or `{@html}`.

## Error Model

`AIAssistanceError` carries one of these safe codes:

- `AI_DISABLED`: provider is still `none`;
- `AI_PERMISSION_REQUIRED`: loopback permission is absent;
- `AI_UNAVAILABLE`: Ollama cannot be reached or returns a non-model server failure;
- `AI_MODEL_UNAVAILABLE`: Ollama reports that the configured model is missing;
- `AI_TIMEOUT`: the request exceeded 30 seconds;
- `AI_INVALID_OUTPUT`: response size, JSON, or schema validation failed;
- `NOT_FOUND`: at least one explicitly selected highlight no longer exists.

Raw model output, response bodies, selected research, URLs, and browser internals are never copied
into user-facing error messages or logs.

## Side-Panel Experience

- Each visible research card gets a labeled selection checkbox.
- Selection is cleared whenever search/filter results reload so hidden records cannot remain silently
  selected.
- A compact **Local AI** section shows the selected count and private-default status.
- Disabled state explains that enabling grants access only to the local Ollama address and does not
  start Ollama or download models.
- The model field defaults to the existing `llama3.2` setting and remains editable without contacting
  Ollama.
- Enabled state offers **Summarize**, **Explain**, **Suggest tags**, and **Overview** actions; all are
  disabled with no checked records.
- The result is labeled as local AI output, linked to its selected item count, and rendered as plain
  text. Suggested tags are displayed but not automatically applied.
- Loading, permission denial, timeout, unavailable model/server, and invalid-output states preserve
  the rest of the research library.
- Disable is always available and revokes the setting before attempting permission removal.

## Storage and Backups

Validated results are added to the existing `aiResults` IndexedDB table. The current versioned JSON
backup already exports and imports that table; the extended strict schema will include optional
`suggestedTags`. Markdown exports remain human-authored research only and will not silently mix AI
output with source quotations.

No database version increment is required because `suggestedTags` is not indexed and is optional for
records accepted by the existing schema.

## Security and Privacy Invariants

- No provider construction, settings read, UI mount, capture, search, or backup path performs fetch.
- `NoAIProvider` has no fetch dependency.
- Only the literal IPv4 loopback origin is permitted; `localhost`, IPv6, arbitrary ports, redirects,
  and configurable base URLs are excluded.
- Permission request and removal use one exact origin constant shared by UI and manifest tests.
- Research text is data inside JSON and is explicitly marked untrusted in the system prompt.
- Provider output cannot write quotations, tags, notes, settings, or collections.
- Suggested tags require a separate future user action before becoming saved tags.
- AI remains optional when Ollama is stopped, missing, or misconfigured.

## Verification Strategy

### Unit tests

- `NoAIProvider` rejects every operation without access to a fetch function.
- Ollama requests use the exact loopback endpoint, safe fetch options, configured model, structured
  format, and only the supplied reduced research items.
- Prompt injection text remains inert JSON data.
- Timeout, network failure, redirects/HTTP failure, missing model, oversized response, malformed
  outer JSON, malformed content JSON, unknown fields, and invalid tags map to safe errors.

### Service and integration tests

- Default settings and absent permission both prevent provider invocation.
- Only explicitly requested IDs are loaded and projected; unrelated stored highlights never reach the
  provider.
- Duplicate, empty, excessive, invalid, or missing IDs fail before provider invocation.
- Valid output is persisted with exact source IDs; invalid output is not persisted.
- Router validation and error mapping remain strict.
- Settings enable/disable changes do not invoke AI.

### Component tests

- Permission request happens only on the enable-button click and uses the exact origin.
- Denial leaves the disabled state intact and sends no setting mutation.
- Checked visible records produce an `ai.run` request with exactly those IDs.
- Reloading search/filter results clears selection.
- Hostile AI output renders as text.
- Disable persists `none` before permission removal and the library remains usable on removal failure.

### Full gate

Run formatting, lint, Svelte type checking, Chrome and Firefox MV3 builds, all Vitest suites,
manifest permission assertions, and Firefox extension lint through `pnpm check`.

## Documentation Sources

- [Ollama Chat API](https://docs.ollama.com/api/chat)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [Ollama API introduction](https://docs.ollama.com/api/introduction)
