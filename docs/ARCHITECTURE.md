# TraceMark Architecture

TraceMark is a Manifest V3 browser extension built with WXT, TypeScript, Svelte, Dexie, and Zod. It
ships browser-specific manifests for Chrome and Firefox while sharing domain, storage, service, and
UI code.

## Runtime components

| Component               | Responsibility                                                                                          | Trust level                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Toolbar popup           | Requests capture of the active selection and creates a saved quotation after user review                | Privileged extension UI                          |
| Research library        | Search, edit, collection management, anchor requests, backups, preferences, and optional AI actions     | Privileged extension UI                          |
| Background context      | Owns services, browser event handlers, validated message routing, storage access, and runtime injection | Privileged extension code                        |
| Capture content script  | Reads the current selection and limited source context after runtime injection                          | Runs in an untrusted webpage                     |
| Anchor content script   | Locates and marks one exact quotation after runtime injection                                           | Runs in an untrusted webpage                     |
| IndexedDB               | Stores collections, highlights, and validated AI results in the browser profile                         | Local extension storage                          |
| `browser.storage.local` | Stores theme and AI provider/model preferences                                                          | Local extension storage                          |
| Ollama                  | Optional loopback service receiving selected stored research for a requested action                     | Separate local component; not inherently trusted |
| JSON/Markdown downloads | User-controlled backup or export files outside extension storage                                        | Outside TraceMark after download                 |

Chrome hosts the library in a side panel and uses a background service worker. Firefox hosts it in
a native sidebar and uses its generated background-script form. The same message and service
contracts drive both builds.

## Core data flow

### Capture

1. A toolbar click, extension context-menu click, or extension command supplies a qualifying
   `activeTab` gesture.
2. The background capture service injects `/content-scripts/capture.js` into the active tab (or the
   selected frame for a context-menu event).
3. The content script extracts an exact quotation plus bounded source context and returns structured
   data. It does not persist on the page.
4. The popup validates the response and sends a typed request to the background router. Direct-save
   context-menu and keyboard paths save to Inbox through the background action.
5. Domain services normalize and validate the record before the repository writes IndexedDB.

### Library and search

The Svelte library sends schema-constrained messages through `browser.runtime.sendMessage`. The
background router rejects non-TraceMark senders and malformed requests, then delegates to focused
services. Search uses normalized fields and tokens stored with each highlight. UI rendering uses
Svelte text interpolation; saved webpage text is not inserted as executable markup.

### Anchoring

1. The user opens the saved source page, keeps it active, and chooses **Mark on page**.
2. The anchor service checks that the active URL matches the saved source or canonical URL.
3. It injects `/content-scripts/anchor.js` at runtime and sends an exact-text selector containing
   the quotation, prefix, and suffix.
4. The page script marks one unambiguous match. Missing, changed, or ambiguous text returns a
   refusal result instead of a guessed location.

Marks are page-runtime annotations. Reloading the page removes them.

### Backups

JSON export reads collections, highlights, AI results, and preferences and produces a versioned
`tracemark-backup` envelope. Import parses the whole file with strict schemas, validates references
and the canonical Inbox, normalizes records, and merges them in an IndexedDB transaction. Markdown
export escapes markup and punctuation before creating readable quote blocks and source links.

Downloaded files cross out of the extension's storage boundary. TraceMark does not upload, sync, or
protect them after download.

### Optional Ollama assistance

Local AI starts disabled. Enabling it asks the browser for the optional
`http://127.0.0.1:11434/*` origin and saves an Ollama model preference. For each user-requested
action, the assistance service verifies that AI is enabled, the permission still exists, and one to
twenty distinct stored highlight IDs are valid. It loads only those records and posts their
quotation, title, URL, tags, and note to `/api/chat` with credentials omitted, redirects rejected,
a 30-second timeout, and a one-megabyte response limit. Provider output must match a strict schema
before it can be stored.

Loopback HTTP is not encrypted. Ollama, the selected model, and other local software remain outside
TraceMark's trust boundary.

## Trust boundaries and controls

### Untrusted webpages

Page DOM, URLs, selections, and text are untrusted. Runtime scripts return schema-validated data;
the router accepts messages only from the current extension ID; saved text is rendered inertly; and
there are no static content scripts or standing website host permissions.

### Untrusted imports

JSON backups are size-limited, strictly parsed, referentially checked, normalized, and merged in a
transaction. A valid backup can intentionally add or update local research, so users should import
only files they chose and retain a known-good backup.

### Local services

The optional origin is exact and loopback-only, but loopback is not a guarantee of confidentiality
or trustworthy behavior. Another local process could interact with the service, and Ollama/model
behavior is not controlled by TraceMark.

### Browser and operating system

The browser enforces extension isolation, `activeTab`, optional permissions, storage, and protected
pages. TraceMark does not defend against a compromised browser profile, browser, operating system,
or another process with access to the user's files.

## Source map

| Path                           | Purpose                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `src/domain/`                  | Models, schemas, text/URL normalization, capture, search, and exact-anchor algorithms |
| `src/core/`                    | Capture, highlight, collection, search, anchor, backup, and AI services               |
| `src/storage/`                 | Dexie schema/migrations, repository, and local preferences                            |
| `src/messaging/`               | Typed schemas, extension client, trusted router, and safe errors                      |
| `src/entrypoints/`             | Background, popup, library, and runtime content-script entrypoints                    |
| `tests/`                       | Unit, component, integration, packaged-browser, and fixture coverage                  |
| `scripts/validate-packages.ts` | Release ZIP content and manifest contract validation                                  |

See [PERMISSIONS.md](PERMISSIONS.md) for the generated manifest contract and [TESTING.md](TESTING.md)
for the evidence boundaries.
