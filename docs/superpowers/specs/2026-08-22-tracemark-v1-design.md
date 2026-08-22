# TraceMark V1 Design

## Product contract

TraceMark answers one question: “How do I save something important from the web without losing where it came from?” It is a local-first research extension for Chrome and Firefox. A user deliberately selects text, saves the quotation verbatim with provenance, organizes and searches it locally, revisits the source, and exports or restores a backup. Accounts, telemetry, paid services, and AI are not required.

V1 is desktop-first and supports current Chrome and Firefox releases. Chrome and Firefox builds use Manifest V3. The shared implementation must degrade honestly on browser-owned pages, PDF viewers, and other pages where extensions cannot inject scripts.

## Selected approach

TraceMark uses WXT 0.21.x, TypeScript, Svelte 5, Dexie 4, Zod 4, Vitest 4, and Playwright/Selenium browser automation. WXT generates separate Chrome and Firefox artifacts from one source tree. Both browser commands explicitly request MV3; Firefox does not silently use WXT's default MV2 target.

The extension requests `activeTab`, `scripting`, `contextMenus`, and `storage`. It does not request `<all_urls>`, `tabs`, history, cookies, clipboard, or telemetry access. Runtime content scripts are injected only after a user gesture. This means capture and “Show on page” re-anchoring are deliberate actions rather than automatic inspection of every visited page.

Rejected alternatives:

- A Chrome MV3/Firefox MV2 split would widen legacy compatibility but duplicate lifecycle behavior and create an immediate migration obligation.
- A persistent all-sites content script would enable automatic re-anchoring but contradict the product's conservative permission model.
- Storing research in `browser.storage.local` would simplify access but is a poor fit for indexed, versioned, potentially large research datasets.

## Runtime architecture

```text
Web page
  │  runtime-only capture/re-anchor scripts (activeTab)
  ▼
Background extension core
  ├── Zod-validated message router
  ├── Highlight and collection services
  ├── Dexie / IndexedDB repository
  ├── Search index
  ├── Import / export
  └── Optional AI provider boundary
  ▲
  │  typed request/response messages
  ├── Popup (quick capture)
  └── Responsive side panel (research library)
       ├── Chrome side_panel
       └── Firefox sidebar_action
```

The background is the only owner of database and business operations. Popup and side-panel clients do not open IndexedDB directly. Research entities live in IndexedDB; lightweight theme and AI preferences live in `browser.storage.local`. Runtime scripts only read the current selection and limited page metadata or apply verified highlight marks. They do not contain persistence or business logic.

WXT entrypoints:

- `background.ts`: installs menus, handles commands, validates messages, and coordinates services.
- `capture.content.ts` with `registration: 'runtime'`: returns the current selection, safe metadata, and anchoring context.
- `anchor.content.ts` with `registration: 'runtime'`: conservatively locates a supplied quote and marks it only when the match is unique and sufficiently strong.
- `popup/`: captures or saves the current selection and links to the full library.
- `sidepanel/`: responsive research library shared by Chrome and Firefox.

Core modules are framework-independent and split by responsibility: schemas, URL safety, selection normalization, anchoring, persistence, collections, search, import/export, messaging, and AI providers.

## Capture and provenance flow

The popup, selection-only context-menu item, and `Alt+Shift+S` command are user gestures that grant temporary page access. The background injects the runtime capture script into the active frame. The script returns:

- the exact selected string (no semantic rewriting),
- normalized prefix and suffix text for anchoring,
- the nearest useful heading and paragraph context when available,
- `document.title`, the actual URL, and a same-document canonical URL when safe.

The privileged core validates the result, reconciles it with the tab URL/title, rejects unsupported or unsafe URLs, and saves through one service. Context-menu and keyboard saves go to the Inbox collection with no note or tags; the popup can choose a collection and add tags before saving. Duplicate saves are allowed because the same quotation may support different notes, but imports use deterministic duplicate detection.

Supported source schemes are `http:` and `https:`. Canonical URLs are accepted only when they resolve to HTTP(S); credentials and fragments are removed. `javascript:`, `data:`, browser-internal, and extension URLs are never stored as navigable source links.

## Anchoring and revisit behavior

Each highlight stores a TextQuoteSelector-style anchor: exact quote plus prefix and suffix. The re-anchor algorithm walks visible text nodes, finds exact-quote candidates, and scores their surrounding normalized context. It succeeds only for one exact match or for a single context match with a clear margin over alternatives. Repeated or changed text returns `ambiguous` or `not-found`; TraceMark never highlights a guess.

After opening a source, the user invokes “Show saved highlights” from the toolbar popup or an extension command. Those gestures grant `activeTab`; runtime injection then applies accessible `<mark data-tracemark-highlight>` wrappers without using `innerHTML`. A side-panel button may reuse an existing grant but otherwise explains the toolbar/command step instead of requesting persistent access. Marks are presentation-only and are not treated as proof that the source is unchanged.

Because V1 does not request persistent host access, it cannot automatically inspect a source merely because the user revisits it. The UI explains this privacy trade-off explicitly.

## Versioned data model

All timestamps are ISO 8601 UTC strings and all IDs are UUIDs. Application records include `schemaVersion: 1`.

```ts
type Highlight = {
  id: string;
  schemaVersion: 1;
  quote: string;
  prefix: string;
  suffix: string;
  heading?: string;
  context?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  hostname: string;
  collectionId: string;
  tags: string[];
  note: string;
  searchText: string;
  searchTokens: string[];
  createdAt: string;
  updatedAt: string;
};

type Collection = {
  id: string;
  schemaVersion: 1;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  id: 'settings';
  schemaVersion: 1;
  theme: 'system' | 'light' | 'dark';
  ai: { provider: 'none' | 'ollama'; model: string };
};

type AIResult = {
  id: string;
  schemaVersion: 1;
  kind: 'summary' | 'explanation' | 'tags' | 'overview';
  provider: 'ollama';
  sourceHighlightIds: string[];
  content: string;
  createdAt: string;
};
```

Dexie database version 1 models a minimal legacy highlight store; database version 2 is the V1 release schema and migrates legacy data transactionally. Migration code never deletes records. Initialization surfaces migration failures as a recoverable error and keeps the original database intact. Tests cover fresh creation, legacy upgrade, malformed legacy records, and failure handling. The `Settings` type is persisted separately in `browser.storage.local`, which is the sole reason for the `storage` permission.

An Inbox collection is created idempotently and cannot be deleted. Deleting another collection requires explicit confirmation and moves its highlights to Inbox in the same transaction. Collection names are case-insensitively unique. Tags are trimmed, lowercased, deduplicated, limited in length/count, and rendered as plain text.

## Local search

On every highlight write, TraceMark derives `searchText` and `searchTokens` from quote, title, hostname, note, tags, and collection name. Dexie stores a multi-entry index for tokens. Queries normalize input, use the first token to obtain candidates, then require all tokens or the normalized phrase before ranking title/quote matches above metadata matches. Renaming a collection transactionally refreshes affected derived search fields.

Search and filters compose across collection, archived state, and tags. Empty search returns recent items. No index or query leaves the device.

## Import, export, and backups

Markdown export produces readable quotations with title, safe source link, saved date, collection, tags, and a clearly separated “My note” section. JSON export is the lossless TraceMark backup format with envelope metadata, `schemaVersion: 1`, collections, highlights, settings-safe fields, and export time.

JSON import is parsed as unknown and validated with strict Zod schemas. It rejects unknown envelope versions, oversized files/records, prototype-pollution keys, invalid URLs, invalid timestamps, and malformed entities. Exact imported IDs update only when the normalized source/quote identity matches; otherwise IDs are regenerated. Semantic duplicates are skipped and reported. Import is transactional and returns counts plus validation errors without partially applying invalid data.

The library keeps Export/Backup visible and states that browser storage is not a durable cloud backup.

## Optional local AI

The provider interface exposes summarize, explain, suggestTags, and collectionOverview. `NoAIProvider` is the default and makes every core feature available. `OllamaProvider` is enabled only from settings after the user explicitly grants optional host access to `http://127.0.0.1:11434/*`.

TraceMark never starts Ollama, downloads a model, or contacts a cloud AI provider. Requests contain only highlights explicitly selected by the user, enforce size and timeout limits, and treat model output as untrusted text. Structured tag output is Zod-validated. Failure or permission denial leaves all non-AI behavior unchanged.

## Security and privacy boundaries

- Every runtime message is parsed from `unknown` through a discriminated Zod schema. Unknown message types and invalid payloads are rejected.
- No external messaging contract is declared. The background checks the sender extension ID and authorizes operations by a fixed message allowlist.
- Webpage strings, imported strings, AI output, and URLs are untrusted. Svelte text interpolation or DOM text nodes render them; no untrusted `innerHTML` is used.
- Navigable links accept only normalized HTTP(S) URLs and always use safe extension-controlled navigation.
- Runtime scripts execute in the isolated world, expose no page-callable API, and return only the requested selection/anchor result.
- Content length, tag count, import size, and AI input limits prevent accidental resource exhaustion.
- TraceMark has no analytics, telemetry, cookies, history collection, account, sync, clipboard monitoring, or backend.

## User experience and accessibility

The visual language is reading-focused: warm neutral paper surfaces, ink text, restrained teal provenance accents, compact metadata, and no AI gradients. System, light, and dark themes use CSS custom properties and persisted settings. UI surfaces meet WCAG AA contrast targets, use semantic controls, visible focus rings, labelled dialogs, live status regions, and complete keyboard navigation. Motion is short and disabled under `prefers-reduced-motion`.

The popup has one job: show the current selection, choose a collection, optionally add tags, and save. With no selection it shows recent saves and opens the library. The side panel contains search, collection/tag filters, a saved-item list, details/editing, import/export, backup guidance, theme controls, and opt-in Ollama settings. Its responsive layout also works as a standalone extension page for debugging and narrow browser panels.

## Testing and release evidence

Vitest covers schemas, normalization, URL safety, anchoring, tags, collection transactions, Dexie migrations with `fake-indexeddb`, search, import/export, messaging, and AI validation. Svelte component tests cover keyboard flows, hostile strings, focus, dialogs, popup saves, filters, and disabled AI states.

Integration tests exercise UI-to-background message handlers with a fake browser and real IndexedDB. Deterministic fixture pages cover normal, repeated, changed, dynamic, and hostile content.

Playwright drives the packaged Chromium extension through the critical capture-to-export flow. A Selenium/geckodriver suite installs the packaged Firefox add-on and exercises the same fixture-backed flow where browser automation permits. Both generated manifests are asserted in tests, `web-ext lint` validates Firefox packaging, and any automation gap is called out rather than converted into a compatibility claim.

CI installs with a frozen pnpm lockfile, checks formatting, lint, types, unit/integration/component tests, Chrome and Firefox MV3 builds, manifest assertions, package linting, and browser E2E jobs. Release archives are WXT-generated Chrome and Firefox ZIPs. Store copy, privacy disclosures, permission documentation, icons, and safe fixture-based screenshots are prepared, but store submission remains a human action.

## Completion criteria

V1 is complete only when both browser artifacts build and validate; deliberate selection capture saves an exact quotation and provenance; notes, tags, collections, search, edit/delete, re-anchoring, Markdown/JSON export, validated JSON import, themes, and optional Ollama behavior work; tests and CI are green; permissions/privacy/security documentation is accurate; no secrets are present; and `v1.0.0` points to the verified main commit with both release packages attached.
